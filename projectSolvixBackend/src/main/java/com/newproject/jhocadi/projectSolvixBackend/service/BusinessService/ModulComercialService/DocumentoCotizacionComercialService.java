package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.ConsultaCotizacionPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DocumentoCotizacionComercialResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoPdfDescargaDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DocumentoCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoLineaCotizacionComercial;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CotizacionComercialRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DocumentoCotizacionComercialRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPdfStorageService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPlantillaSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.HtmlToPdfService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.PdfGenTiming;

import lombok.RequiredArgsConstructor;

import static com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPlantillaSupport.esc;
import static com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPlantillaSupport.formatCantidad;
import static com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPlantillaSupport.formatFecha;
import static com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPlantillaSupport.formatMoney;
import static com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.DocumentoPlantillaSupport.nvl;

/**
 * PDF de la cotización comercial. Reutiliza el motor, el almacenamiento y la identidad
 * corporativa de los documentos de OT; solo cambian la plantilla y el dueño del documento.
 * Sin QR: la cotización comercial es independiente de una OT.
 */
@Service
@RequiredArgsConstructor
public class DocumentoCotizacionComercialService {

    private static final String PLANTILLA = "cotizacion-comercial.html";

    private final CotizacionComercialRepository cotizacionRepository;
    private final DocumentoCotizacionComercialRepository documentoRepository;
    private final DocumentoPdfStorageService storageService;
    private final HtmlToPdfService htmlToPdfService;
    private final DocumentoPlantillaSupport plantilla;

    @Transactional
    public DocumentoCotizacionComercialResponseDTO generar(Long cotizacionId, String usuario) {
        long tData = System.nanoTime();
        CotizacionComercial cotizacion = buscarCotizacion(cotizacionId);
        if (cotizacion.getEstado() == EstadoCotizacionComercial.BORRADOR) {
            throw new BusinessException("Presenta la cotización antes de generar su documento.");
        }

        try (PdfGenTiming timing = PdfGenTiming.start("COTIZACION_COMERCIAL", cotizacionId)) {
            Cliente cliente = cotizacion.getCliente();
            timing.addDataMs(PdfGenTiming.elapsedMs(tData));

            Map<String, String> vars = plantilla.baseEmpresaVars();
            vars.put("NUMERO_COTIZACION", esc(cotizacion.getNumero()));
            vars.put("FECHA_COTIZACION", formatFecha(cotizacion.getFecha()));
            vars.put("FECHA_PRESENTACION", formatFecha(cotizacion.getFechaPresentacion()));
            vars.put("CLIENTE_NOMBRE", esc(cotizacion.getClienteNombreSnapshot()));
            vars.put("CLIENTE_DOCUMENTO", esc(DocumentoPlantillaSupport.documentoCliente(cliente)));
            vars.put("CLIENTE_TELEFONO", esc(cliente != null ? nvl(cliente.getTelefono(), "—") : "—"));
            vars.put("CLIENTE_CORREO", esc(cliente != null ? nvl(cliente.getEmail(), "—") : "—"));
            vars.put("OBSERVACIONES", esc(nvl(cotizacion.getObservaciones(), "—")));
            vars.put("DETALLE_ROWS", construirFilas(cotizacion.getDetalles()));
            vars.put("SUBTOTAL", formatMoney(cotizacion.getSubtotal()));
            vars.put("TOTAL", formatMoney(cotizacion.getTotal()));

            byte[] pdf = htmlToPdfService.renderDesdeClasspath(PLANTILLA, vars);
            int version = documentoRepository.findMaxVersion(cotizacionId) + 1;

            DocumentoCotizacionComercial doc = DocumentoCotizacionComercial.builder()
                .cotizacion(cotizacion)
                .version(version)
                .nombreArchivo(DocumentoPlantillaSupport.sanitizarNombreArchivo(cotizacion.getNumero() + ".pdf"))
                .storageKey(storageService.guardar(pdf))
                .hashSha256(DocumentoPlantillaSupport.sha256Hex(pdf))
                .fechaGeneracion(LocalDateTime.now())
                .usuarioGeneracion(nvl(usuario, "sistema"))
                .build();

            long tDb = System.nanoTime();
            DocumentoCotizacionComercialResponseDTO response =
                DocumentoCotizacionComercialResponseDTO.fromEntity(documentoRepository.save(doc));
            timing.addDbMs(PdfGenTiming.elapsedMs(tDb));
            return response;
        }
    }

    @Transactional(readOnly = true)
    public List<DocumentoCotizacionComercialResponseDTO> listar(Long cotizacionId) {
        buscarCotizacion(cotizacionId);
        return documentoRepository.findByCotizacionIdOrderByVersionDesc(cotizacionId).stream()
            .map(DocumentoCotizacionComercialResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<DocumentoCotizacionComercialResponseDTO> vigente(Long cotizacionId) {
        return documentoRepository.findByCotizacionIdOrderByVersionDesc(cotizacionId).stream()
            .findFirst()
            .map(DocumentoCotizacionComercialResponseDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public DocumentoPdfDescargaDTO descargar(Long cotizacionId, Long documentoId) {
        DocumentoCotizacionComercial doc = documentoRepository.findByIdAndCotizacionId(documentoId, cotizacionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento no encontrado."));
        Resource resource = storageService.cargar(doc.getStorageKey());
        return DocumentoPdfDescargaDTO.builder()
            .resource(resource)
            .nombreArchivo(doc.getNombreArchivo())
            .hashSha256(doc.getHashSha256())
            .build();
    }

    /** Consulta pública opcional por token (sin QR en el PDF comercial). */
    @Transactional(readOnly = true)
    public ConsultaCotizacionPublicaDTO consultaPublica(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cotización no encontrada.");
        }
        CotizacionComercial cotizacion = cotizacionRepository.findByTokenConsulta(token.trim())
            .filter(c -> c.getEstado() != EstadoCotizacionComercial.BORRADOR)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cotización no encontrada."));

        return ConsultaCotizacionPublicaDTO.builder()
            .numero(cotizacion.getNumero())
            .estadoPublico(estadoPublico(cotizacion.getEstado()))
            .fecha(cotizacion.getFechaPresentacion() != null
                ? cotizacion.getFechaPresentacion()
                : cotizacion.getFecha())
            .total(cotizacion.getTotal())
            .lineas(cotizacion.getDetalles().stream()
                .map(d -> ConsultaCotizacionPublicaDTO.Linea.builder()
                    .descripcion(d.getDescripcion())
                    .cantidad(d.getCantidad())
                    .subtotal(d.getSubtotal())
                    .build())
                .toList())
            .mensaje("Consulta informativa. Para aprobarla o resolver dudas comunícate con nosotros.")
            .build();
    }

    private CotizacionComercial buscarCotizacion(Long id) {
        return cotizacionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cotización no encontrada."));
    }

    private static String construirFilas(List<DetalleCotizacionComercial> detalles) {
        if (detalles == null || detalles.isEmpty()) {
            return "<tr><td colspan=\"5\" class=\"muted\">Sin líneas</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        for (DetalleCotizacionComercial d : detalles) {
            sb.append("<tr>")
                .append("<td>").append(esc(etiquetaTipo(d.getTipo()))).append("</td>")
                .append("<td>").append(esc(nvl(d.getDescripcion(), ""))).append("</td>")
                .append("<td class=\"num\">").append(esc(formatCantidad(d.getCantidad()))).append("</td>")
                .append("<td class=\"num\">").append(esc(formatMoney(d.getPrecioUnitario()))).append("</td>")
                .append("<td class=\"num\">").append(esc(formatMoney(d.getSubtotal()))).append("</td>")
                .append("</tr>");
        }
        return sb.toString();
    }

    private static String etiquetaTipo(TipoLineaCotizacionComercial tipo) {
        if (tipo == null) {
            return "";
        }
        return switch (tipo) {
            case PRODUCTO -> "Producto";
            case MANO_OBRA -> "Mano de obra";
            case OTRO -> "Otro";
        };
    }

    private static String estadoPublico(EstadoCotizacionComercial estado) {
        return switch (estado) {
            case BORRADOR -> "En preparación";
            case PENDIENTE_APROBACION -> "Pendiente de tu aprobación";
            case APROBADA -> "Aprobada";
            case RECHAZADA -> "Rechazada";
            case ANULADA -> "Anulada";
        };
    }
}
