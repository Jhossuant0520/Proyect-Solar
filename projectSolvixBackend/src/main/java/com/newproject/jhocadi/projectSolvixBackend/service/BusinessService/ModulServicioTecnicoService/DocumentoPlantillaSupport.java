package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.IOException;
import java.io.InputStream;
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
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.newproject.jhocadi.projectSolvixBackend.config.EmpresaDocumentoProperties;
import com.newproject.jhocadi.projectSolvixBackend.config.SoftwareDocumentoProperties;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ContactoTallerPublicoDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Piezas comunes de las plantillas PDF (identidad corporativa, formatos y utilidades).
 * Lo comparten los documentos de OT y los de cotización comercial.
 *
 * <p>C.3.1: {@link #logoHtml()} cachea el fragmento HTML (data URI) durante la vida de la JVM.
 * Sin TTL: cambios del logo en disco requieren reinicio.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DocumentoPlantillaSupport {

    private static final DateTimeFormatter FECHA_HORA =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Locale LOCALE_CO = Locale.forLanguageTag("es-CO");

    private final EmpresaDocumentoProperties empresa;
    private final SoftwareDocumentoProperties software;

    /** path classpath normalizado → HTML + bytes originales. */
    private final ConcurrentHashMap<String, CachedLogo> logoCache = new ConcurrentHashMap<>();
    private final AtomicLong logoPhysicalLoads = new AtomicLong();

    @Value("${solvix.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    public Map<String, String> baseEmpresaVars() {
        long t0 = System.nanoTime();
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("EMPRESA_NOMBRE", esc(nvl(empresa.getNombre(), "")));
        vars.put("EMPRESA_SUBTITULO", esc(nvl(empresa.getSubtitulo(), "")));
        vars.put("EMPRESA_ETIQUETA_LABORATORIO", esc(nvl(
            empresa.getEtiquetaLaboratorio(),
            "Servicio Técnico Especializado · Laboratorio de Ingeniería")));
        vars.put("EMPRESA_TELEFONO", esc(textoContacto("Tel.", empresa.getTelefono())));
        vars.put("EMPRESA_TELEFONO_VALOR", esc(nvl(empresa.getTelefono(), "")));
        vars.put("EMPRESA_WHATSAPP", esc(nvl(empresa.getWhatsapp(), "")));
        vars.put("EMPRESA_CORREO", esc(nvl(empresa.getCorreo(), "")));
        vars.put("EMPRESA_DIRECCION", esc(nvl(empresa.getDireccion(), "")));
        vars.put("EMPRESA_SITIO_WEB", esc(nvl(empresa.getSitioWeb(), "")));
        vars.put("EMPRESA_IDENTIFICACION", esc(nvl(empresa.getIdentificacionFiscal(), "")));
        vars.put("EMPRESA_CONTACTO", esc(contactoFooter()));
        vars.put("DOCUMENTO_META_IZQ", esc(nvl(
            empresa.getDocumentoMetaIzq(),
            "Sistema de Gestión de Custodia Técnica")));
        vars.put("DOCUMENTO_META_DER", esc(nvl(
            empresa.getDocumentoMetaDer(),
            "Documento de Control y Seguimiento")));
        vars.put("COMPROBANTE_RECEPCION_KICKER", esc(nvl(
            empresa.getComprobanteRecepcionKicker(),
            "Servicio Técnico • Protocolo de Ingreso")));
        // HTML con <strong> en títulos de ítem (no escapar las etiquetas).
        vars.put("CLAUSULAS_COMPROBANTE_RECEPCION", clausulasConTitulosEnNegrita(
            empresa.getClausulasComprobanteRecepcion()));
        vars.put("ACTA_ENTREGA_KICKER", esc(nvl(
            empresa.getActaEntregaKicker(),
            "Servicio Técnico • Protocolo de Entrega")));
        vars.put("CLAUSULAS_ACTA_ENTREGA", clausulasConTitulosEnNegrita(
            empresa.getClausulasActaEntrega()));
        vars.put("FOOTER_TEXTO", esc(nvl(
            empresa.getFooterTexto(),
            "Documento generado digitalmente por Computer & Electronic Center S.A.S.")));
        // Autoría: nombre y rol por separado (el PDF no menciona SOLVIX).
        vars.put("SOFTWARE_DESARROLLADO_POR", esc(nvl(software.getDesarrolladoPor(), "")));
        vars.put("SOFTWARE_ROL", esc(nvl(software.getRolDesarrollador(), "")));
        vars.put("SOFTWARE_AUTORIA", esc(nvl(software.lineaAutoria(), "")));
        PdfGenTiming timing = PdfGenTiming.current();
        if (timing != null) {
            timing.addCompanyVarsMs(PdfGenTiming.elapsedMs(t0));
        }
        vars.put("LOGO_HTML", logoHtml());
        return vars;
    }

    /**
     * Contacto público del taller (misma fuente que los PDFs). Campos en blanco → null.
     */
    public ContactoTallerPublicoDTO contactoPublico() {
        return ContactoTallerPublicoDTO.builder()
            .empresa(blankToNull(empresa.getNombre()))
            .telefono(blankToNull(empresa.getTelefono()))
            .whatsapp(blankToNull(empresa.getWhatsapp()))
            .direccion(blankToNull(empresa.getDireccion()))
            .sitioWeb(blankToNull(empresa.getSitioWeb()))
            .build();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /** URL absoluta del frontend público (base configurada + ruta). */
    public String urlFrontend(String ruta) {
        String base = frontendBaseUrl;
        if (base == null || base.isBlank()) {
            base = "http://localhost:4200";
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + (ruta.startsWith("/") ? ruta : "/" + ruta);
    }

    private String logoHtml() {
        String path = empresa.getLogoClasspath();
        if (path == null || path.isBlank()) {
            return "";
        }
        String normalized = path.startsWith("/") ? path.substring(1) : path;
        long t0 = System.nanoTime();
        CachedLogo hit = logoCache.get(normalized);
        if (hit != null) {
            log.debug("PDF-RES logo cache hit path={}", normalized);
            recordLogoTiming(t0, hit.bytes);
            return hit.html;
        }
        // computeIfAbsent no admite null: sincronizar carga y no cachear fallos.
        synchronized (logoCache) {
            hit = logoCache.get(normalized);
            if (hit != null) {
                log.debug("PDF-RES logo cache hit path={}", normalized);
                recordLogoTiming(t0, hit.bytes);
                return hit.html;
            }
            CachedLogo loaded = loadLogoPhysical(normalized);
            if (loaded == null) {
                return "";
            }
            logoCache.put(normalized, loaded);
            recordLogoTiming(t0, loaded.bytes);
            return loaded.html;
        }
    }

    private static void recordLogoTiming(long startNanos, long bytes) {
        PdfGenTiming timing = PdfGenTiming.current();
        if (timing != null) {
            timing.addLogo(PdfGenTiming.elapsedMs(startNanos), bytes);
        }
    }

    /**
     * Carga física + Base64. Devuelve {@code null} si no hay recurso usable
     * (no se cachea el fallo para permitir reintento tras despliegue parcial).
     */
    private CachedLogo loadLogoPhysical(String normalized) {
        ClassPathResource resource = new ClassPathResource(normalized);
        if (!resource.exists()) {
            log.debug("PDF-RES logo cache miss path={} (missing)", normalized);
            return null;
        }
        log.debug("PDF-RES logo cache miss / init path={}", normalized);
        try (InputStream in = resource.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            if (bytes.length == 0) {
                return null;
            }
            String mime = mimeFromPath(normalized);
            String b64 = Base64.getEncoder().encodeToString(bytes);
            String html = "<img class=\"doc-logo\" src=\"data:" + mime + ";base64," + b64 + "\" alt=\"Logo\"/>";
            logoPhysicalLoads.incrementAndGet();
            log.debug("PDF-RES logo cached path={} bytes={}", normalized, bytes.length);
            return new CachedLogo(html, bytes.length);
        } catch (IOException e) {
            log.warn("No se pudo cargar logo classpath {}: {}", normalized, e.getMessage());
            return null;
        }
    }

    /** Lecturas físicas del logo (tests / diagnóstico). */
    long logoPhysicalLoadCount() {
        return logoPhysicalLoads.get();
    }

    int logoCacheSize() {
        return logoCache.size();
    }

    void clearLogoCacheForTests() {
        logoCache.clear();
        logoPhysicalLoads.set(0);
    }

    private record CachedLogo(String html, long bytes) {
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

    public static String documentoCliente(Cliente cliente) {
        if (cliente == null) {
            return "—";
        }
        String tipo = cliente.getTipoDocumento() != null ? cliente.getTipoDocumento().name() + " " : "";
        String num = nvl(cliente.getNumeroDocumento(), "");
        String full = (tipo + num).trim();
        return full.isEmpty() ? "—" : full;
    }

    public static String formatFecha(LocalDateTime fecha) {
        return fecha == null ? "—" : FECHA_HORA.format(fecha);
    }

    /**
     * Fecha estilo Stitch: {@code 24/09/2026 • 17:15 HRS} (viñeta U+2022, no punto medio).
     */
    public static String formatFechaStitch(LocalDateTime fecha) {
        if (fecha == null) {
            return "—";
        }
        return fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
            + " \u2022 "
            + fecha.format(DateTimeFormatter.ofPattern("HH:mm"))
            + " HRS";
    }

    /**
     * Escapa el texto y pone en {@code <strong>} el título de cada ítem numerado
     * ({@code 1. Título: ...}).
     */
    public static String clausulasConTitulosEnNegrita(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String escaped = esc(raw.trim());
        return escaped.replaceAll("(\\d+\\.\\s*)([^:]{2,90}:)", "$1<strong>$2</strong>");
    }

    public static String formatMoney(BigDecimal valor) {
        BigDecimal v = valor == null ? BigDecimal.ZERO : valor;
        // Presentación COP sin decimales. El BigDecimal de negocio no se altera aquí.
        BigDecimal enteros = v.setScale(0, RoundingMode.HALF_UP);
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(LOCALE_CO);
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,##0", symbols);
        return "$" + df.format(enteros);
    }

    public static String formatCantidad(BigDecimal cantidad) {
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

    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    public static String sanitizarNombreArchivo(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "documento.pdf";
        }
        return nombre.replaceAll("[\\\\/:*?\"<>|]", "-");
    }

    public static String esc(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    public static String nvl(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
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
}
