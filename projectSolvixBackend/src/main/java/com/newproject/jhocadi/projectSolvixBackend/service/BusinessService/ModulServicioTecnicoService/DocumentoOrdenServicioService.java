package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.awt.image.BufferedImage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.config.EmpresaDocumentoProperties;
import com.newproject.jhocadi.projectSolvixBackend.config.SoftwareDocumentoProperties;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.AsegurarComprobanteRecepcionResponseDTO;
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
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDocumentoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.CotizacionServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.DocumentoOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.EntregaOrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;

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

    private static final DateTimeFormatter FECHA_HORA =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Locale LOCALE_CO = Locale.forLanguageTag("es-CO");

    private final DocumentoOrdenServicioRepository documentoRepository;
    private final OrdenServicioRepository ordenServicioRepository;
    private final CotizacionServicioRepository cotizacionRepository;
    private final EntregaOrdenServicioRepository entregaRepository;
    private final DocumentoPdfStorageService storageService;
    private final HtmlToPdfService htmlToPdfService;
    private final QrCodeService qrCodeService;
    private final EmpresaDocumentoProperties empresa;
    private final SoftwareDocumentoProperties software;
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

    @Transactional
    public DocumentoOrdenServicioResponseDTO generarActaEntrega(Long ordenId, String usuario) {
        OrdenServicio orden = buscarOrden(ordenId);
        EntregaOrdenServicio entrega = entregaRepository.findByOrdenServicioId(ordenId)
            .orElseThrow(() -> new BusinessException(
                "Se requiere una entrega con firma para generar el acta."));
        if (entrega.getFirmaUrl() == null || entrega.getFirmaUrl().isBlank()) {
            throw new BusinessException("La entrega no tiene firma registrada.");
        }
        asegurarTokenConsulta(orden);

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
        vars.put("FIRMA_HTML", construirFirmaHtml(entrega.getFirmaUrl()));
        String qrUrl = urlConsultaOt(orden.getTokenConsulta());
        vars.put("QR_DATA_URI", qrCodeService.generarPngDataUri(qrUrl));

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
        OrdenServicio orden = buscarOrden(ordenId);
        asegurarTokenConsulta(orden);
        Map<String, String> vars = baseEmpresaVars();
        putClienteEquipo(vars, orden);
        vars.put("NUMERO_OT", esc(orden.getNumero()));
        vars.put("FECHA_RECEPCION", formatFecha(orden.getFechaRecepcion()));
        vars.put("PROBLEMA_REPORTADO", esc(nvl(orden.getProblemaReportado(), "—")));
        vars.put("OBSERVACIONES", esc(nvl(orden.getObservaciones(), "—")));
        String qrUrl = urlConsultaOt(orden.getTokenConsulta());
        vars.put("QR_DATA_URI", qrCodeService.generarPngDataUri(qrUrl));

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

    @Transactional(readOnly = true)
    public ConsultaOtPublicaDTO consultaOtPublica(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada.");
        }
        OrdenServicio orden = ordenServicioRepository.findByTokenConsulta(token.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada."));
        Equipo equipo = orden.getEquipo();
        return ConsultaOtPublicaDTO.builder()
            .numero(orden.getNumero())
            .estadoPublico(etiquetaEstadoPublico(orden.getEstado()))
            .equipoTipo(equipo != null && equipo.getTipoEquipo() != null
                ? equipo.getTipoEquipo().name() : null)
            .equipoMarca(equipo != null ? equipo.getMarca() : null)
            .equipoModelo(equipo != null ? equipo.getModelo() : null)
            .referenciaInterna(equipo != null ? equipo.getReferenciaInterna() : null)
            .fechaRecepcion(orden.getFechaRecepcion())
            .fechaActualizacion(orden.getFechaActualizacion())
            .mensaje("Consulta informativa. Para más detalle comunícate con el taller.")
            .build();
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

        return DocumentoOrdenServicioResponseDTO.fromEntity(documentoRepository.save(doc));
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
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("EMPRESA_NOMBRE", esc(nvl(empresa.getNombre(), "")));
        vars.put("EMPRESA_SUBTITULO", esc(nvl(empresa.getSubtitulo(), "")));
        vars.put("EMPRESA_TELEFONO", esc(textoContacto("Tel.", empresa.getTelefono())));
        vars.put("EMPRESA_CORREO", esc(nvl(empresa.getCorreo(), "")));
        vars.put("EMPRESA_DIRECCION", esc(nvl(empresa.getDireccion(), "")));
        vars.put("EMPRESA_IDENTIFICACION", esc(nvl(empresa.getIdentificacionFiscal(), "")));
        vars.put("EMPRESA_CONTACTO", esc(contactoFooter()));
        vars.put("FOOTER_TEXTO", esc(nvl(empresa.getFooterTexto(), "Documento generado por SOLVIX")));
        vars.put("SOFTWARE_AUTORIA", esc(nvl(software.lineaAutoria(), "")));
        vars.put("LOGO_HTML", logoHtml());
        return vars;
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

    private String logoHtml() {
        String path = empresa.getLogoClasspath();
        if (path == null || path.isBlank()) {
            return "";
        }
        String normalized = path.startsWith("/") ? path.substring(1) : path;
        ClassPathResource resource = new ClassPathResource(normalized);
        if (!resource.exists()) {
            return "";
        }
        try (InputStream in = resource.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            if (bytes.length == 0) {
                return "";
            }
            String mime = mimeFromPath(normalized);
            String b64 = Base64.getEncoder().encodeToString(bytes);
            return "<img class=\"doc-logo\" src=\"data:" + mime + ";base64," + b64 + "\" alt=\"Logo\"/>";
        } catch (IOException e) {
            log.warn("No se pudo cargar logo classpath {}: {}", normalized, e.getMessage());
            return "";
        }
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
        try {
            String nombre = extraerNombreFirma(firmaUrl);
            Resource resource = entregaFirmaService.cargar(nombre);
            try (InputStream in = resource.getInputStream()) {
                byte[] bytes = recortarFirmaParaActa(in.readAllBytes());
                String b64 = Base64.getEncoder().encodeToString(bytes);
                // Tabla centrada: OpenHTMLToPDF no respeta bien margin:auto en <img>.
                return "<table class=\"ae-firma-img-wrap\" style=\"width:100%;\">"
                    + "<tr><td style=\"text-align:center;vertical-align:middle;\">"
                    + "<img class=\"ae-firma-img\" src=\"data:image/png;base64," + b64
                    + "\" alt=\"Firma\" style=\"max-height:80px;max-width:240px;\"/>"
                    + "</td></tr></table>";
            }
        } catch (Exception e) {
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
                    int a = (argb >>> 24) & 0xFF;
                    int r = (argb >> 16) & 0xFF;
                    int g = (argb >> 8) & 0xFF;
                    int b = argb & 0xFF;
                    // Fondo del canvas de entrega ≈ #020617; el trazo es claro.
                    boolean trazo = a > 20 && (r + g + b) > 90;
                    if (trazo) {
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

    private String extraerNombreFirma(String firmaUrl) {
        if (firmaUrl == null) {
            return "";
        }
        String prefijo = EntregaFirmaService.RUTA_PUBLICA_PREFIJO;
        if (firmaUrl.startsWith(prefijo)) {
            return firmaUrl.substring(prefijo.length());
        }
        int slash = firmaUrl.lastIndexOf('/');
        return slash >= 0 ? firmaUrl.substring(slash + 1) : firmaUrl;
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
        if (cliente == null) {
            return "—";
        }
        String tipo = cliente.getTipoDocumento() != null ? cliente.getTipoDocumento().name() + " " : "";
        String num = nvl(cliente.getNumeroDocumento(), "");
        String full = (tipo + num).trim();
        return full.isEmpty() ? "—" : full;
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

    private String contactoFooter() {
        StringBuilder sb = new StringBuilder();
        appendContacto(sb, empresa.getTelefono());
        appendContacto(sb, empresa.getWhatsapp() != null && !empresa.getWhatsapp().isBlank()
            ? "WhatsApp " + empresa.getWhatsapp() : null);
        appendContacto(sb, empresa.getCorreo());
        appendContacto(sb, empresa.getSitioWeb());
        return sb.toString();
    }

    private static void appendContacto(StringBuilder sb, String valor) {
        if (valor == null || valor.isBlank()) {
            return;
        }
        if (sb.length() > 0) {
            sb.append(" · ");
        }
        sb.append(valor.trim());
    }

    private static String textoContacto(String prefijo, String valor) {
        if (valor == null || valor.isBlank()) {
            return "";
        }
        return prefijo + " " + valor.trim();
    }

    private static String formatFecha(LocalDateTime fecha) {
        return fecha == null ? "—" : FECHA_HORA.format(fecha);
    }

    private static String formatMoney(BigDecimal valor) {
        BigDecimal v = valor == null ? BigDecimal.ZERO : valor.setScale(2, RoundingMode.HALF_UP);
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(LOCALE_CO);
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        DecimalFormat df = new DecimalFormat("#,##0.00", symbols);
        return "$ " + df.format(v);
    }

    private static String formatCantidad(BigDecimal cantidad) {
        if (cantidad == null) {
            return "0";
        }
        BigDecimal stripped = cantidad.stripTrailingZeros();
        if (stripped.scale() <= 0) {
            return stripped.toPlainString();
        }
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(LOCALE_CO);
        symbols.setDecimalSeparator(',');
        DecimalFormat df = new DecimalFormat("0.##", symbols);
        return df.format(cantidad);
    }

    private static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private static String sanitizarNombreArchivo(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "documento.pdf";
        }
        return nombre.replaceAll("[\\\\/:*?\"<>|]", "-");
    }

    private static String mimeFromPath(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return "image/png";
    }

    private static String esc(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    private static String nvl(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
