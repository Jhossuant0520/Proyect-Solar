package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AsegurarComprobanteRecepcionResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaCotizacionOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaDocumentoPublicoDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsultaOtPublicaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DocumentoPdfDescargaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OutcomeAsegurarComprobante;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.CotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.DetalleCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.DocumentoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EntregaOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EtapaPublicaOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.RecepcionOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDocumentoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.CotizacionServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.DocumentoOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.EntregaOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.RecepcionOrdenServicioRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Generación y consulta de PDFs de OT (FASE 3.15.8).
 * Snapshot histórico = bytes PDF; metadatos en DB. Sin costos internos en PDFs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentoOrdenServicioService {

    private final DocumentoOrdenServicioRepository documentoRepository;
    private final OrdenServicioRepository ordenServicioRepository;
    private final CotizacionServicioRepository cotizacionRepository;
    private final EntregaOrdenServicioRepository entregaRepository;
    private final RecepcionOrdenServicioRepository recepcionRepository;
    private final DocumentoPdfStorageService storageService;
    private final HtmlToPdfService htmlToPdfService;
    private final QrCodeService qrCodeService;
    private final DocumentoPlantillaSupport plantilla;
    private final EntregaFirmaService entregaFirmaService;

    @Value("${solvix.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @Transactional(readOnly = true)
    public List<DocumentoOrdenServicioResponseDTO> listar(Long ordenId) {
        buscarOrden(ordenId);
        return documentoRepository.findByOrdenServicioIdOrderByFechaGeneracionDesc(ordenId).stream()
            .map(DocumentoOrdenServicioResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public DocumentoOrdenServicioResponseDTO obtener(Long ordenId, Long docId) {
        return DocumentoOrdenServicioResponseDTO.fromEntity(buscarDocumento(ordenId, docId));
    }

    @Transactional(readOnly = true)
    public DocumentoPdfDescargaDTO descargarPdf(Long ordenId, Long docId) {
        DocumentoOrdenServicio doc = buscarDocumento(ordenId, docId);
        Resource resource = storageService.cargar(doc.getStorageKey());
        return DocumentoPdfDescargaDTO.builder()
            .resource(resource)
            .nombreArchivo(doc.getNombreArchivo())
            .hashSha256(doc.getHashSha256())
            .build();
    }

    /**
     * Asegura el comprobante de recepción (idempotente).
     * Si ya existe → {@link OutcomeAsegurarComprobante#EXISTING}; si no → genera y
     * {@link OutcomeAsegurarComprobante#GENERATED}.
     * Debe invocarse vía proxy Spring (API / afterCommit) para que {@code @Transactional} aplique.
     */
    @Transactional
    public AsegurarComprobanteRecepcionResponseDTO asegurarComprobanteRecepcion(
            Long ordenId, String usuario) {
        buscarOrden(ordenId);

        Optional<DocumentoOrdenServicio> existente = buscarComprobanteRecepcionMasReciente(ordenId);
        if (existente.isPresent()) {
            return AsegurarComprobanteRecepcionResponseDTO.builder()
                .status(OutcomeAsegurarComprobante.EXISTING)
                .ready(true)
                .documento(DocumentoOrdenServicioResponseDTO.fromEntity(existente.get()))
                .build();
        }

        DocumentoOrdenServicioResponseDTO creado = crearComprobanteRecepcionNuevo(ordenId, usuario);

        // Carrera residual: si otro hilo insertó primero, devolver la primera versión (menor version)
        List<DocumentoOrdenServicio> todos =
            documentoRepository.findByOrdenServicioIdAndTipoDocumentoAndCotizacionIdOrderByVersionDesc(
                ordenId, TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION, null);
        if (todos.size() > 1) {
            DocumentoOrdenServicio primero = todos.get(todos.size() - 1);
            return AsegurarComprobanteRecepcionResponseDTO.builder()
                .status(OutcomeAsegurarComprobante.EXISTING)
                .ready(true)
                .documento(DocumentoOrdenServicioResponseDTO.fromEntity(primero))
                .build();
        }

        return AsegurarComprobanteRecepcionResponseDTO.builder()
            .status(OutcomeAsegurarComprobante.GENERATED)
            .ready(true)
            .documento(creado)
            .build();
    }

    /**
     * Genera el comprobante de recepción de forma idempotente (compatibilidad afterCommit / tests).
     * Preferir {@link #asegurarComprobanteRecepcion} en el API HTTP.
     */
    @Transactional
    public DocumentoOrdenServicioResponseDTO generarComprobanteRecepcion(Long ordenId, String usuario) {
        return asegurarComprobanteRecepcion(ordenId, usuario).getDocumento();
    }

    @Transactional
    public DocumentoOrdenServicioResponseDTO generarCotizacionPdf(
            Long ordenId, Long cotizacionId, String usuario) {
        try (PdfGenTiming timing = PdfGenTiming.start("COTIZACION", cotizacionId)) {
            long tData = System.nanoTime();
            OrdenServicio orden = buscarOrden(ordenId);
            CotizacionServicio cotizacion = cotizacionRepository.findById(cotizacionId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Cotización no encontrada."));
            if (!cotizacion.getOrdenServicio().getId().equals(ordenId)) {
                throw new BusinessException("La cotización no pertenece a esta orden.");
            }
            if (cotizacion.getEstado() == EstadoCotizacionServicio.BORRADOR) {
                throw new BusinessException(
                    "Solo se genera PDF de cotizaciones presentadas (no BORRADOR).");
            }
            timing.addDataMs(PdfGenTiming.elapsedMs(tData));

            String tokenDocumento = UUID.randomUUID().toString().replace("-", "");
            Map<String, String> vars = baseEmpresaVars();
            putClienteEquipo(vars, orden);
            vars.put("NUMERO_OT", esc(orden.getNumero()));
            vars.put("NUMERO_COTIZACION", esc(cotizacion.getNumero()));
            vars.put("TIPO_COTIZACION", esc(cotizacion.getTipo() != null ? cotizacion.getTipo().name() : ""));
            vars.put("FECHA_PRESENTACION", formatFecha(
                cotizacion.getFechaPresentacion() != null
                    ? cotizacion.getFechaPresentacion()
                    : cotizacion.getFechaCreacion()));
            vars.put("EQUIPO_RESUMEN", esc(resumenEquipo(orden.getEquipo())));
            vars.put("OBSERVACIONES", esc(nvl(cotizacion.getObservaciones(), "—")));
            vars.put("DETALLE_ROWS", construirFilasDetalle(cotizacion.getDetalles()));
            vars.put("SUBTOTAL", formatMoney(cotizacion.getSubtotal()));
            vars.put("TOTAL", formatMoney(cotizacion.getTotal()));
            String qrUrl = urlConsultaDocumento(tokenDocumento);
            vars.put("QR_DATA_URI", qrCodeService.generarPngDataUri(qrUrl));

            byte[] pdf = htmlToPdfService.renderDesdeClasspath("cotizacion.html", vars);
            String nombre = sanitizarNombreArchivo(cotizacion.getNumero() + ".pdf");
            return persistirNuevo(
                orden,
                TipoDocumentoOrdenServicio.COTIZACION,
                cotizacion,
                nombre,
                pdf,
                usuario,
                tokenDocumento);
        }
    }

    @Transactional
    public DocumentoOrdenServicioResponseDTO generarActaEntrega(Long ordenId, String usuario) {
        try (PdfGenTiming timing = PdfGenTiming.start("ACTA_ENTREGA", ordenId)) {
            long tData = System.nanoTime();
            OrdenServicio orden = buscarOrden(ordenId);
            EntregaOrdenServicio entrega = entregaRepository.findByOrdenServicioId(ordenId)
                .orElseThrow(() -> new BusinessException(
                    "Se requiere una entrega con firma para generar el acta."));
            if (entrega.getFirmaUrl() == null || entrega.getFirmaUrl().isBlank()) {
                throw new BusinessException("La entrega no tiene firma registrada.");
            }
            asegurarTokenConsulta(orden);
            timing.addDataMs(PdfGenTiming.elapsedMs(tData));

            Map<String, String> vars = baseEmpresaVars();
            putClienteEquipo(vars, orden);
            vars.put("NUMERO_OT", esc(orden.getNumero()));
            vars.put("EQUIPO_RESUMEN", esc(resumenEquipo(orden.getEquipo())));
            vars.put("FECHA_ENTREGA", formatFecha(entrega.getFechaEntrega()));
            vars.put("USUARIO_RESPONSABLE", esc(nvl(entrega.getUsuarioResponsable(), "—")));
            vars.put("TRABAJO_REALIZADO", esc(nvl(orden.getTrabajoRealizado(), "—")));
            vars.put("NOMBRE_FIRMANTE", esc(nvl(entrega.getNombreCliente(), "—")));
            vars.put("DOCUMENTO_FIRMANTE", esc(nvl(entrega.getDocumentoCliente(), "—")));
            vars.put("CLIENTE_CONFIRMO", entrega.isClienteConfirmo() ? "Sí" : "No");
            vars.put("OBSERVACIONES_ENTREGA", esc(nvl(entrega.getObservaciones(), "—")));
            putTotalAprobado(vars, ordenId);
            vars.put("FIRMA_HTML", construirFirmaHtml(entrega.getFirmaUrl()));

            byte[] pdf = htmlToPdfService.renderDesdeClasspath("acta-entrega.html", vars);
            String nombre = sanitizarNombreArchivo(orden.getNumero() + "-Entrega.pdf");
            return persistirNuevo(
                orden,
                TipoDocumentoOrdenServicio.ACTA_ENTREGA,
                null,
                nombre,
                pdf,
                usuario,
                null);
        }
    }

    @Transactional
    public DocumentoOrdenServicioResponseDTO regenerar(Long ordenId, Long docId, String usuario) {
        DocumentoOrdenServicio anterior = buscarDocumento(ordenId, docId);
        return switch (anterior.getTipoDocumento()) {
            case COMPROBANTE_RECEPCION -> crearComprobanteRecepcionNuevo(ordenId, usuario);
            case COTIZACION -> {
                if (anterior.getCotizacion() == null) {
                    throw new BusinessException("El documento de cotización no tiene cotización asociada.");
                }
                yield generarCotizacionPdf(ordenId, anterior.getCotizacion().getId(), usuario);
            }
            case ACTA_ENTREGA -> generarActaEntrega(ordenId, usuario);
        };
    }

    private Optional<DocumentoOrdenServicio> buscarComprobanteRecepcionMasReciente(Long ordenId) {
        List<DocumentoOrdenServicio> existentes =
            documentoRepository.findByOrdenServicioIdAndTipoDocumentoAndCotizacionIdOrderByVersionDesc(
                ordenId, TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION, null);
        if (existentes.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(existentes.get(0));
    }

    private DocumentoOrdenServicioResponseDTO crearComprobanteRecepcionNuevo(Long ordenId, String usuario) {
        try (PdfGenTiming timing = PdfGenTiming.start("COMPROBANTE_RECEPCION", ordenId)) {
            long tData = System.nanoTime();
            OrdenServicio orden = buscarOrden(ordenId);
            asegurarTokenConsulta(orden);
            Optional<RecepcionOrdenServicio> recepcionOpt =
                recepcionRepository.findByOrdenServicioId(ordenId);
            timing.addDataMs(PdfGenTiming.elapsedMs(tData));

            Map<String, String> vars = baseEmpresaVars();
            putClienteEquipo(vars, orden);
            vars.put("NUMERO_OT", esc(orden.getNumero()));
            vars.put("FECHA_RECEPCION", DocumentoPlantillaSupport.formatFechaStitch(
                recepcionOpt.map(RecepcionOrdenServicio::getFechaRecepcion).orElse(orden.getFechaRecepcion())));
            vars.put("PROBLEMA_REPORTADO", esc(nvl(orden.getProblemaReportado(), "—")));
            vars.put("OBSERVACIONES", esc(nvl(orden.getObservaciones(), "—")));
            String qrUrl = urlConsultaOt(orden.getTokenConsulta());
            vars.put("QR_DATA_URI", qrCodeService.generarPngDataUri(qrUrl));
            vars.put("TOKEN_CONSULTA", esc(nvl(orden.getTokenConsulta(), "—")));

            if (recepcionOpt.isPresent()
                    && recepcionOpt.get().getFirmaUrl() != null
                    && !recepcionOpt.get().getFirmaUrl().isBlank()) {
                RecepcionOrdenServicio recepcion = recepcionOpt.get();
                vars.put("FIRMA_HTML", construirFirmaHtml(recepcion.getFirmaUrl()));
                vars.put(
                    "NOMBRE_FIRMANTE_RECEPCION",
                    esc(nvl(recepcion.getNombreCliente(), nvl(orden.getCliente() != null
                        ? orden.getCliente().getNombre() : null, "—"))));
                vars.put(
                    "DOCUMENTO_FIRMANTE_RECEPCION",
                    esc(nvl(recepcion.getDocumentoCliente(), "—")));
            } else {
                vars.put(
                    "FIRMA_HTML",
                    "<span class=\"cr-sign-placeholder\">Espacio para firma del titular</span>");
                vars.put("NOMBRE_FIRMANTE_RECEPCION", esc(nvl(
                    orden.getCliente() != null ? orden.getCliente().getNombre() : null, "—")));
                vars.put("DOCUMENTO_FIRMANTE_RECEPCION", "—");
            }

            byte[] pdf = htmlToPdfService.renderDesdeClasspath("comprobante-recepcion.html", vars);
            String nombre = sanitizarNombreArchivo(orden.getNumero() + "-Recepcion.pdf");
            return persistirNuevo(
                orden,
                TipoDocumentoOrdenServicio.COMPROBANTE_RECEPCION,
                null,
                nombre,
                pdf,
                usuario,
                null);
        }
    }

    @Transactional(readOnly = true)
    public ConsultaOtPublicaDTO consultaOtPublica(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada.");
        }
        OrdenServicio orden = buscarPorTokenConsulta(token);
        Equipo equipo = orden.getEquipo();
        EtapaPublicaOrdenServicio etapa = EtapaPublicaOrdenServicio.desde(orden.getEstado());
        return ConsultaOtPublicaDTO.builder()
            .numero(orden.getNumero())
            .estadoCodigo(orden.getEstado() != null ? orden.getEstado().name() : null)
            .estadoPublico(etiquetaEstadoPublico(orden.getEstado()))
            .etapaPublica(etapa != null ? etapa.name() : null)
            .etapaPublicaNumero(etapa != null ? etapa.getNumero() : null)
            .totalEtapasPublicas(EtapaPublicaOrdenServicio.TOTAL)
            .equipoTipo(equipo != null && equipo.getTipoEquipo() != null
                ? equipo.getTipoEquipo().name() : null)
            .equipoMarca(equipo != null ? equipo.getMarca() : null)
            .equipoModelo(equipo != null ? equipo.getModelo() : null)
            .referenciaInterna(equipo != null ? equipo.getReferenciaInterna() : null)
            .fechaRecepcion(orden.getFechaRecepcion())
            .fechaActualizacion(orden.getFechaActualizacion())
            .cotizacionDisponible(buscarCotizacionPublicable(orden).isPresent())
            .contacto(plantilla.contactoPublico())
            .mensaje("Consulta informativa. Para más detalle comunícate con el taller.")
            .build();
    }

    /**
     * Cotización que el cliente puede leer desde el QR. Solo lectura: aprobar o rechazar
     * sigue siendo presencial o por el taller.
     */
    @Transactional(readOnly = true)
    public ConsultaCotizacionOtPublicaDTO consultaCotizacionOtPublica(String token) {
        OrdenServicio orden = buscarPorTokenConsulta(token);
        CotizacionServicio cotizacion = buscarCotizacionPublicable(orden)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "No hay una cotización pendiente de tu respuesta."));

        List<ConsultaCotizacionOtPublicaDTO.Linea> lineas = cotizacion.getDetalles().stream()
            .map(d -> ConsultaCotizacionOtPublicaDTO.Linea.builder()
                .descripcion(descripcionPublica(d))
                .cantidad(d.getCantidad())
                .precioUnitario(d.getPrecioUnitario())
                .subtotal(d.getSubtotal())
                .build())
            .toList();

        return ConsultaCotizacionOtPublicaDTO.builder()
            .numero(cotizacion.getNumero())
            .fecha(cotizacion.getFechaPresentacion() != null
                ? cotizacion.getFechaPresentacion() : cotizacion.getFechaCreacion())
            .lineas(lineas)
            .subtotal(cotizacion.getSubtotal())
            .total(cotizacion.getTotal())
            .observaciones(cotizacion.getObservaciones())
            .build();
    }

    /**
     * Última cotización presentada mientras la OT espera la decisión del cliente.
     * Fuera de PENDIENTE_APROBACION no hay nada que el cliente deba leer.
     */
    private Optional<CotizacionServicio> buscarCotizacionPublicable(OrdenServicio orden) {
        if (orden.getEstado() != EstadoOrdenServicio.PENDIENTE_APROBACION) {
            return Optional.empty();
        }
        return cotizacionRepository
            .findByOrdenServicioIdOrderByFechaCreacionAsc(orden.getId()).stream()
            .filter(c -> c.getEstado() == EstadoCotizacionServicio.PENDIENTE_APROBACION)
            .reduce((primera, ultima) -> ultima);
    }

    private static String descripcionPublica(DetalleCotizacionServicio detalle) {
        String descripcion = detalle.getDescripcion();
        if (descripcion != null && !descripcion.isBlank()) {
            return descripcion.trim();
        }
        return DocumentoPlantillaSupport.nvl(detalle.getProductoNombreSnapshot(), "Concepto");
    }

    private OrdenServicio buscarPorTokenConsulta(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada.");
        }
        return ordenServicioRepository.findByTokenConsulta(token.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada."));
    }

    @Transactional(readOnly = true)
    public ConsultaDocumentoPublicoDTO consultaDocumentoPublico(String tokenDocumento) {
        if (tokenDocumento == null || tokenDocumento.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento no encontrado.");
        }
        DocumentoOrdenServicio doc = documentoRepository.findByTokenDocumento(tokenDocumento.trim())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Documento no encontrado."));
        return ConsultaDocumentoPublicoDTO.builder()
            .tipoDocumento(doc.getTipoDocumento())
            .tipoDocumentoEtiqueta(doc.getTipoDocumento() != null
                ? doc.getTipoDocumento().etiqueta() : null)
            .numeroOt(doc.getOrdenServicio() != null ? doc.getOrdenServicio().getNumero() : null)
            .fechaGeneracion(doc.getFechaGeneracion())
            .mensaje("Documento disponible en el taller")
            .build();
    }

    private DocumentoOrdenServicioResponseDTO persistirNuevo(
            OrdenServicio orden,
            TipoDocumentoOrdenServicio tipo,
            CotizacionServicio cotizacion,
            String nombreArchivo,
            byte[] pdf,
            String usuario,
            String tokenDocumento) {
        Long cotizacionId = cotizacion != null ? cotizacion.getId() : null;
        int version = documentoRepository.findMaxVersion(orden.getId(), tipo, cotizacionId) + 1;
        String storageKey = storageService.guardar(pdf);
        String hash = sha256Hex(pdf);

        DocumentoOrdenServicio doc = DocumentoOrdenServicio.builder()
            .ordenServicio(orden)
            .tipoDocumento(tipo)
            .cotizacion(cotizacion)
            .version(version)
            .nombreArchivo(nombreArchivo)
            .storageKey(storageKey)
            .hashSha256(hash)
            .fechaGeneracion(LocalDateTime.now())
            .usuarioGeneracion(nvl(usuario, "sistema"))
            .tokenDocumento(tokenDocumento)
            .build();

        long tDb = System.nanoTime();
        DocumentoOrdenServicioResponseDTO response =
            DocumentoOrdenServicioResponseDTO.fromEntity(documentoRepository.save(doc));
        PdfGenTiming timing = PdfGenTiming.current();
        if (timing != null) {
            timing.addDbMs(PdfGenTiming.elapsedMs(tDb));
        }
        return response;
    }

    private OrdenServicio buscarOrden(Long ordenId) {
        return ordenServicioRepository.findById(ordenId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Orden de servicio no encontrada."));
    }

    private DocumentoOrdenServicio buscarDocumento(Long ordenId, Long docId) {
        return documentoRepository.findByIdAndOrdenServicioId(docId, ordenId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Documento no encontrado."));
    }

    private void asegurarTokenConsulta(OrdenServicio orden) {
        if (orden.getTokenConsulta() == null || orden.getTokenConsulta().isBlank()) {
            orden.setTokenConsulta(UUID.randomUUID().toString().replace("-", ""));
            ordenServicioRepository.save(orden);
        }
    }

    private Map<String, String> baseEmpresaVars() {
        return plantilla.baseEmpresaVars();
    }

    private void putClienteEquipo(Map<String, String> vars, OrdenServicio orden) {
        Cliente cliente = orden.getCliente();
        Equipo equipo = orden.getEquipo();
        vars.put("CLIENTE_NOMBRE", esc(cliente != null ? cliente.getNombre() : "—"));
        vars.put("CLIENTE_DOCUMENTO", esc(documentoCliente(cliente)));
        vars.put("CLIENTE_TELEFONO", esc(cliente != null ? nvl(cliente.getTelefono(), "—") : "—"));
        vars.put("EQUIPO_TIPO", esc(equipo != null && equipo.getTipoEquipo() != null
            ? equipo.getTipoEquipo().name() : "—"));
        vars.put("EQUIPO_MARCA_MODELO", esc(marcaModelo(equipo)));
        vars.put("EQUIPO_REFERENCIA", esc(equipo != null ? nvl(equipo.getReferenciaInterna(), "—") : "—"));
        vars.put("EQUIPO_SERIE", esc(equipo != null ? nvl(equipo.getNumeroSerie(), "—") : "—"));
    }

    private String construirFilasDetalle(List<DetalleCotizacionServicio> detalles) {
        if (detalles == null || detalles.isEmpty()) {
            return "<tr><td colspan=\"5\" class=\"muted\">Sin líneas</td></tr>";
        }
        StringBuilder sb = new StringBuilder();
        for (DetalleCotizacionServicio d : detalles) {
            sb.append("<tr>")
                .append("<td>").append(esc(d.getTipo() != null ? d.getTipo().name() : "")).append("</td>")
                .append("<td>").append(esc(nvl(d.getDescripcion(), ""))).append("</td>")
                .append("<td class=\"num\">").append(esc(formatCantidad(d.getCantidad()))).append("</td>")
                .append("<td class=\"num\">").append(esc(formatMoney(d.getPrecioUnitario()))).append("</td>")
                .append("<td class=\"num\">").append(esc(formatMoney(d.getSubtotal()))).append("</td>")
                .append("</tr>");
        }
        return sb.toString();
    }

    private String construirFirmaHtml(String firmaUrl) {
        long tTotal = System.nanoTime();
        long readMs = 0L;
        long cropMs = 0L;
        try {
            String nombre = extraerNombreFirma(firmaUrl);
            long tRead = System.nanoTime();
            Resource resource = entregaFirmaService.cargar(nombre);
            try (InputStream in = resource.getInputStream()) {
                byte[] raw = in.readAllBytes();
                readMs = PdfGenTiming.elapsedMs(tRead);
                long tCrop = System.nanoTime();
                byte[] bytes = recortarFirmaParaActa(raw);
                cropMs = PdfGenTiming.elapsedMs(tCrop);
                String b64 = Base64.getEncoder().encodeToString(bytes);
                PdfGenTiming timing = PdfGenTiming.current();
                if (timing != null) {
                    timing.addSignature(PdfGenTiming.elapsedMs(tTotal), readMs, cropMs);
                }
                // Tabla centrada: OpenHTMLToPDF no respeta bien margin:auto en <img>.
                return "<table class=\"cr-firma-img-wrap\" style=\"width:100%;\">"
                    + "<tr><td style=\"text-align:center;vertical-align:bottom;\">"
                    + "<img class=\"cr-firma-img\" src=\"data:image/png;base64," + b64
                    + "\" alt=\"Firma\" style=\"max-height:48px;max-width:200px;\"/>"
                    + "</td></tr></table>";
            }
        } catch (Exception e) {
            PdfGenTiming timing = PdfGenTiming.current();
            if (timing != null) {
                timing.addSignature(PdfGenTiming.elapsedMs(tTotal), readMs, cropMs);
            }
            log.warn("No se pudo incrustar firma en acta: {}", e.getMessage());
            return "<p class=\"muted\" style=\"text-align:center;\">Firma registrada en el sistema</p>";
        }
    }

    /**
     * Recorta el PNG de firma al trazo real (sin el lienzo vacío a la izquierda/derecha)
     * para que, al centrarse en el acta, no se vea desplazada.
     */
    private byte[] recortarFirmaParaActa(byte[] pngBytes) {
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(pngBytes));
            if (src == null) {
                return pngBytes;
            }
            int w = src.getWidth();
            int h = src.getHeight();
            int minX = w;
            int minY = h;
            int maxX = -1;
            int maxY = -1;
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int argb = src.getRGB(x, y);
                    // D.7 negro/blanco + histórico claro/oscuro
                    if (esPixelTrazoFirma(argb)) {
                        if (x < minX) {
                            minX = x;
                        }
                        if (y < minY) {
                            minY = y;
                        }
                        if (x > maxX) {
                            maxX = x;
                        }
                        if (y > maxY) {
                            maxY = y;
                        }
                    }
                }
            }
            if (maxX < minX || maxY < minY) {
                return pngBytes;
            }
            int pad = 8;
            minX = Math.max(0, minX - pad);
            minY = Math.max(0, minY - pad);
            maxX = Math.min(w - 1, maxX + pad);
            maxY = Math.min(h - 1, maxY + pad);
            BufferedImage crop = src.getSubimage(minX, minY, maxX - minX + 1, maxY - minY + 1);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(crop, "png", out);
            return out.toByteArray();
        } catch (Exception e) {
            return pngBytes;
        }
    }

    /**
     * Detecta tinta de firma en formato D.7 (negro sobre blanco) y
     * en firmas históricas (claro sobre fondo oscuro ~#020617).
     */
    private static boolean esPixelTrazoFirma(int argb) {
        int a = (argb >>> 24) & 0xFF;
        if (a <= 20) {
            return false;
        }
        int r = (argb >> 16) & 0xFF;
        int g = (argb >> 8) & 0xFF;
        int b = argb & 0xFF;
        // D.7: fondo blanco sólido — no es trazo
        if (r >= 248 && g >= 248 && b >= 248) {
            return false;
        }
        // Histórico: fondo oscuro del canvas (#020617) — no es trazo
        if (r <= 40 && g <= 50 && b <= 60 && (r + g + b) <= 120) {
            return false;
        }
        return true;
    }

    private String extraerNombreFirma(String firmaUrl) {
        String nombre = EntregaFirmaService.extraerNombreDesdeUrl(firmaUrl);
        return nombre != null ? nombre : "";
    }

    private String urlConsultaOt(String tokenConsulta) {
        return trimSlash(frontendBaseUrl) + "/consulta/ot/" + tokenConsulta;
    }

    private String urlConsultaDocumento(String tokenDocumento) {
        return trimSlash(frontendBaseUrl) + "/consulta/documento/" + tokenDocumento;
    }

    private static String trimSlash(String base) {
        if (base == null || base.isBlank()) {
            return "http://localhost:4200";
        }
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private static String etiquetaEstadoPublico(EstadoOrdenServicio estado) {
        if (estado == null) {
            return "En proceso";
        }
        return switch (estado) {
            case RECEPCIONADO -> "Recibido en taller";
            case EN_DIAGNOSTICO -> "En diagnóstico";
            case DIAGNOSTICADO -> "Diagnóstico listo";
            case COTIZADO -> "Cotización preparada";
            case PENDIENTE_APROBACION -> "Pendiente de tu aprobación";
            case APROBADO -> "Aprobado — en proceso";
            case EN_REPARACION -> "En reparación";
            case ESPERA_REPUESTO -> "En espera de repuesto";
            case REQUIERE_APROBACION_ADICIONAL -> "Requiere aprobación adicional";
            case LISTO -> "Listo para entrega";
            case ENTREGADO -> "Entregado";
            case CERRADO -> "Cerrado";
            case CANCELADO -> "Cancelado";
        };
    }

    private static String documentoCliente(Cliente cliente) {
        return DocumentoPlantillaSupport.documentoCliente(cliente);
    }

    private static String resumenEquipo(Equipo equipo) {
        if (equipo == null) {
            return "—";
        }
        StringBuilder sb = new StringBuilder();
        if (equipo.getTipoEquipo() != null) {
            sb.append(equipo.getTipoEquipo().name());
        }
        String mm = marcaModelo(equipo);
        if (!"—".equals(mm) && !mm.isBlank()) {
            if (sb.length() > 0) {
                sb.append(" · ");
            }
            sb.append(mm);
        }
        if (equipo.getReferenciaInterna() != null && !equipo.getReferenciaInterna().isBlank()) {
            if (sb.length() > 0) {
                sb.append(" · ");
            }
            sb.append(equipo.getReferenciaInterna());
        }
        return sb.length() == 0 ? "—" : sb.toString();
    }

    private static String marcaModelo(Equipo equipo) {
        if (equipo == null) {
            return "—";
        }
        String marca = nvl(equipo.getMarca(), "");
        String modelo = nvl(equipo.getModelo(), "");
        String joined = (marca + " " + modelo).trim();
        return joined.isEmpty() ? "—" : joined;
    }

    private static String formatFecha(LocalDateTime fecha) {
        return DocumentoPlantillaSupport.formatFecha(fecha);
    }

    /**
     * Valor autorizado por el cliente: suma de cotizaciones APROBADAS (inicial + adicionales).
     * Sale del snapshot de la cotización, nunca del precio actual del producto.
     */
    private void putTotalAprobado(Map<String, String> vars, Long ordenId) {
        List<String> numeros = cotizacionRepository.findByOrdenServicioIdOrderByFechaCreacionAsc(ordenId)
            .stream()
            .filter(c -> c.getEstado() == EstadoCotizacionServicio.APROBADA)
            .map(CotizacionServicio::getNumero)
            .toList();
        if (numeros.isEmpty()) {
            vars.put("TOTAL_APROBADO", "Sin cotización aprobada");
            vars.put("COTIZACIONES_APROBADAS", "—");
            return;
        }
        vars.put("TOTAL_APROBADO", formatMoney(cotizacionRepository.totalAutorizadoAprobado(ordenId)));
        vars.put("COTIZACIONES_APROBADAS", esc(String.join(" + ", numeros)));
    }

    private static String formatMoney(BigDecimal valor) {
        return DocumentoPlantillaSupport.formatMoney(valor);
    }

    private static String formatCantidad(BigDecimal cantidad) {
        return DocumentoPlantillaSupport.formatCantidad(cantidad);
    }

    private static String sha256Hex(byte[] data) {
        return DocumentoPlantillaSupport.sha256Hex(data);
    }

    private static String sanitizarNombreArchivo(String nombre) {
        return DocumentoPlantillaSupport.sanitizarNombreArchivo(nombre);
    }

    private static String esc(String value) {
        return DocumentoPlantillaSupport.esc(value);
    }

    private static String nvl(String value, String fallback) {
        return DocumentoPlantillaSupport.nvl(value, fallback);
    }
}
