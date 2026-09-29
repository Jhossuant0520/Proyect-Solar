package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * C.3.2 — Auditoría de costo de render (solo medición/inspección).
 * No modifica plantillas ni comportamiento; emite métricas estructurales a log INFO.
 */
@SpringBootTest
@ActiveProfiles("test")
class PdfRenderAuditC32Test {

    private static final Logger log = LoggerFactory.getLogger(PdfRenderAuditC32Test.class);

    @Autowired
    private HtmlToPdfService htmlToPdfService;

    @Autowired
    private DocumentoPlantillaSupport plantilla;

    @Autowired
    private QrCodeService qrCodeService;

    @Test
    @DisplayName("C.3.2 auditoría estructural + 2 renders por tipo de documento")
    void auditAllDocumentTypesTwice() throws Exception {
        Map<String, String> base = new HashMap<>(plantilla.baseEmpresaVars());

        auditType("COTIZACION_COMERCIAL", "cotizacion-comercial.html", fillComercial(base), 2);
        auditType("COTIZACION", "cotizacion.html", fillCotizacionOt(base), 2);
        auditType("COMPROBANTE_RECEPCION", "comprobante-recepcion.html", fillComprobante(base), 2);
        auditType("ACTA_ENTREGA", "acta-entrega.html", fillActa(base), 2);
    }

    private void auditType(String type, String template, Map<String, String> vars, int runs)
            throws Exception {
        String html = htmlToPdfService.construirHtmlDesdeClasspath(template, vars);
        HtmlStats stats = analyzeHtml(html);
        String logo = vars.getOrDefault("LOGO_HTML", "");
        int logoLen = logo == null ? 0 : logo.length();
        int maxDataUri = maxDataUriLength(html);
        // C.3.3: tras optimizar logo, html debe bajar de ~1.7 MB a decenas de KB (+ CSS).
        assertThat(stats.htmlChars)
            .as("%s htmlChars tras logo PDF optimizado", type)
            .isLessThan(120_000);
        assertThat(logoLen)
            .as("%s logoHtmlChars tras logo PDF optimizado", type)
            .isLessThan(80_000);
        log.info(
            "PDF-AUDIT type={} template={} htmlChars={} htmlApproxKb={} tables={} nestedTableDepthMax={} "
                + "tr={} td={} th={} div={} span={} p={} img={} styleAttr={} dataUriImg={} "
                + "cssInlinedChars={} logoHtmlChars={} maxDataUriChars={}",
            type, template, stats.htmlChars, stats.htmlChars / 1024, stats.tables, stats.maxNestedTableDepth,
            stats.tr, stats.td, stats.th, stats.div, stats.span, stats.p, stats.img, stats.styleAttr,
            stats.dataUriImg, stats.cssInStyleTags, logoLen, maxDataUri);

        for (int i = 1; i <= runs; i++) {
            try (PdfGenTiming timing = PdfGenTiming.start(type + "_AUDIT", i)) {
                byte[] pdf = htmlToPdfService.htmlAPdf(html);
                assertThat(pdf.length).isGreaterThan(500);
                try (PDDocument doc = PDDocument.load(pdf)) {
                    log.info(
                        "PDF-AUDIT type={} run={} pdfBytes={} pages={}",
                        type, i, pdf.length, doc.getNumberOfPages());
                }
            }
        }
    }

    private static int maxDataUriLength(String html) {
        Matcher m = Pattern.compile("src=\"(data:image[^\"]*)\"", Pattern.CASE_INSENSITIVE).matcher(html);
        int max = 0;
        while (m.find()) {
            max = Math.max(max, m.group(1).length());
        }
        return max;
    }

    private static Map<String, String> fillComercial(Map<String, String> base) {
        Map<String, String> v = new LinkedHashMap<>(base);
        v.put("NUMERO_COTIZACION", "CC-AUDIT-1");
        v.put("FECHA_COTIZACION", "28/09/2026 12:00");
        v.put("FECHA_PRESENTACION", "28/09/2026 12:05");
        v.put("CLIENTE_NOMBRE", "Cliente Auditoría");
        v.put("CLIENTE_DOCUMENTO", "CC 123");
        v.put("CLIENTE_TELEFONO", "3001112233");
        v.put("CLIENTE_CORREO", "audit@test.local");
        v.put("OBSERVACIONES", "Observaciones de auditoría C.3.2.");
        v.put("DETALLE_ROWS",
            "<tr><td>PRODUCTO</td><td>SSD 1TB</td><td class=\"num\">1</td>"
                + "<td class=\"num\">$250.000</td><td class=\"num\">$250.000</td></tr>"
                + "<tr><td>SERVICIO</td><td>Instalación</td><td class=\"num\">1</td>"
                + "<td class=\"num\">$50.000</td><td class=\"num\">$50.000</td></tr>");
        v.put("SUBTOTAL", "$300.000");
        v.put("TOTAL", "$300.000");
        return v;
    }

    private Map<String, String> fillCotizacionOt(Map<String, String> base) {
        Map<String, String> v = fillComercial(base);
        v.put("NUMERO_OT", "OT-AUDIT-1");
        v.put("TIPO_COTIZACION", "INICIAL");
        v.put("EQUIPO_RESUMEN", "PORTÁTIL HP");
        v.put("EQUIPO_SERIAL", "SN-1");
        v.put("DIAGNOSTICO", "Diagnóstico de prueba");
        String qr = qrCodeService.generarPngDataUri("http://localhost:4200/consulta/ot/tok-audit");
        v.put("QR_DATA_URI", qr);
        v.put("DETALLE_ROWS",
            "<tr><td>REPUESTO</td><td>SSD 1TB</td><td class=\"num\">1</td>"
                + "<td class=\"num\">$250.000</td><td class=\"num\">$250.000</td></tr>");
        return v;
    }

    private Map<String, String> fillComprobante(Map<String, String> base) {
        Map<String, String> v = new LinkedHashMap<>(base);
        v.put("NUMERO_OT", "OT-AUDIT-1");
        v.put("FECHA_RECEPCION", "28/09/2026 • 10:00 HRS");
        v.put("PROBLEMA_REPORTADO", "No enciende");
        v.put("OBSERVACIONES", "Sin golpes visibles");
        v.put("CLIENTE_NOMBRE", "Cliente Auditoría");
        v.put("CLIENTE_DOCUMENTO", "CC 123");
        v.put("CLIENTE_TELEFONO", "3001112233");
        v.put("EQUIPO_TIPO", "PORTÁTIL");
        v.put("EQUIPO_MARCA_MODELO", "HP 15");
        v.put("EQUIPO_REFERENCIA", "REF-1");
        v.put("EQUIPO_SERIE", "SN-1");
        v.put("TOKEN_CONSULTA", "tok-audit");
        String qr = qrCodeService.generarPngDataUri("http://localhost:4200/consulta/ot/tok-audit");
        v.put("QR_DATA_URI", qr);
        v.put("FIRMA_HTML", "<span class=\"muted\">(sin firma en auditoría)</span>");
        v.put("NOMBRE_FIRMANTE_RECEPCION", "Cliente Auditoría");
        v.put("DOCUMENTO_FIRMANTE_RECEPCION", "CC 123");
        v.put("TEXTO_CONFORMIDAD_RECEPCION",
            "El cliente confirma la recepción del equipo por parte del taller.");
        return v;
    }

    private Map<String, String> fillActa(Map<String, String> base) {
        Map<String, String> v = new LinkedHashMap<>(base);
        v.put("NUMERO_OT", "OT-AUDIT-1");
        v.put("FECHA_ENTREGA", "28/09/2026 16:00");
        v.put("CLIENTE_NOMBRE", "Cliente Auditoría");
        v.put("CLIENTE_DOCUMENTO", "CC 123");
        v.put("CLIENTE_TELEFONO", "3001112233");
        v.put("EQUIPO_TIPO", "PORTÁTIL");
        v.put("EQUIPO_MARCA_MODELO", "HP 15");
        v.put("EQUIPO_SERIE", "SN-1");
        v.put("EQUIPO_RESUMEN", "PORTÁTIL HP");
        v.put("USUARIO_RESPONSABLE", "tecnico");
        v.put("TOTAL_APROBADO", "$300.000");
        v.put("COTIZACIONES_APROBADAS", "CC-1");
        v.put("TRABAJO_REALIZADO", "Cambio de SSD e instalación de SO.");
        v.put("OBSERVACIONES_ENTREGA", "Entrega conforme.");
        v.put("NOMBRE_FIRMANTE", "Cliente Auditoría");
        v.put("DOCUMENTO_FIRMANTE", "CC 123");
        v.put("CLIENTE_CONFIRMO", "Sí");
        v.put("FIRMA_HTML", "<span class=\"muted\">(sin firma en auditoría)</span>");
        return v;
    }

    private static HtmlStats analyzeHtml(String html) {
        HtmlStats s = new HtmlStats();
        s.htmlChars = html.length();
        s.tables = count(html, "<table\\b");
        s.tr = count(html, "<tr\\b");
        s.td = count(html, "<td\\b");
        s.th = count(html, "<th\\b");
        s.div = count(html, "<div\\b");
        s.span = count(html, "<span\\b");
        s.p = count(html, "<p\\b");
        s.img = count(html, "<img\\b");
        s.styleAttr = count(html, "\\sstyle=");
        s.dataUriImg = count(html, "src=\"data:image");
        s.cssInStyleTags = sumStyleTagLength(html);
        s.maxNestedTableDepth = maxNestedTableDepth(html);
        return s;
    }

    private static int count(String html, String regex) {
        Matcher m = Pattern.compile(regex, Pattern.CASE_INSENSITIVE).matcher(html);
        int n = 0;
        while (m.find()) {
            n++;
        }
        return n;
    }

    private static int sumStyleTagLength(String html) {
        Matcher m = Pattern.compile(
            "<style[^>]*>([\\s\\S]*?)</style>", Pattern.CASE_INSENSITIVE).matcher(html);
        int sum = 0;
        while (m.find()) {
            sum += m.group(1).length();
        }
        return sum;
    }

    private static int maxNestedTableDepth(String html) {
        String lower = html.toLowerCase(Locale.ROOT);
        int depth = 0;
        int max = 0;
        int i = 0;
        while (i < lower.length()) {
            int open = lower.indexOf("<table", i);
            int close = lower.indexOf("</table", i);
            if (open < 0 && close < 0) {
                break;
            }
            if (open >= 0 && (close < 0 || open < close)) {
                depth++;
                max = Math.max(max, depth);
                i = open + 6;
            } else {
                depth = Math.max(0, depth - 1);
                i = close + 7;
            }
        }
        return max;
    }

    private static final class HtmlStats {
        int htmlChars;
        int tables;
        int tr;
        int td;
        int th;
        int div;
        int span;
        int p;
        int img;
        int styleAttr;
        int dataUriImg;
        int cssInStyleTags;
        int maxNestedTableDepth;
    }
}
