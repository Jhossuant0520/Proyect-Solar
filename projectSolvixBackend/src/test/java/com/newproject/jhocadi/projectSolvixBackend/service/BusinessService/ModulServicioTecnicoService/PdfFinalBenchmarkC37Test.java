package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * C.3.7 — Benchmark final de rendimiento PDF (solo medición).
 * 5 generaciones consecutivas por tipo; no modifica plantillas ni comportamiento.
 */
@SpringBootTest
@ActiveProfiles("test")
class PdfFinalBenchmarkC37Test {

    private static final Logger log = LoggerFactory.getLogger(PdfFinalBenchmarkC37Test.class);
    private static final int RUNS = 5;

    @Autowired
    private HtmlToPdfService htmlToPdfService;

    @Autowired
    private DocumentoPlantillaSupport plantilla;

    @Autowired
    private QrCodeService qrCodeService;

    @Test
    @DisplayName("C.3.7 benchmark final: 5 generaciones por tipo de documento")
    void benchmarkFiveRunsPerDocumentType() throws Exception {
        bench("COTIZACION_COMERCIAL", "cotizacion-comercial.html", this::fillComercial);
        bench("COTIZACION", "cotizacion.html", this::fillCotizacionOt);
        bench("COMPROBANTE_RECEPCION", "comprobante-recepcion.html", this::fillComprobante);
        bench("ACTA_ENTREGA", "acta-entrega.html", this::fillActa);
    }

    private void bench(String type, String template, Function<Map<String, String>, Map<String, String>> filler)
            throws Exception {
        for (int i = 1; i <= RUNS; i++) {
            try (PdfGenTiming timing = PdfGenTiming.start(type + "_C37", i)) {
                Map<String, String> base = new LinkedHashMap<>(plantilla.baseEmpresaVars());
                Map<String, String> vars = filler.apply(base);
                String logo = vars.getOrDefault("LOGO_HTML", "");
                int logoHtmlChars = logo == null ? 0 : logo.length();

                String html = htmlToPdfService.construirHtmlDesdeClasspath(template, vars);
                int htmlChars = html.length();
                byte[] pdf = htmlToPdfService.htmlAPdf(html);
                assertThat(pdf.length).isGreaterThan(500);

                try (PDDocument doc = PDDocument.load(pdf)) {
                    log.info(
                        "PDF-C37 type={} run={} phase={} htmlChars={} logoHtmlChars={} pdfBytes={} pages={}",
                        type,
                        i,
                        i == 1 ? "cold" : "warm",
                        htmlChars,
                        logoHtmlChars,
                        pdf.length,
                        doc.getNumberOfPages());
                }
            }
        }
    }

    private Map<String, String> fillComercial(Map<String, String> base) {
        Map<String, String> v = new LinkedHashMap<>(base);
        v.put("NUMERO_COTIZACION", "CC-C37-1");
        v.put("FECHA_COTIZACION", "28/09/2026 12:00");
        v.put("FECHA_PRESENTACION", "28/09/2026 12:05");
        v.put("CLIENTE_NOMBRE", "Cliente Benchmark C37");
        v.put("CLIENTE_DOCUMENTO", "CC 123");
        v.put("CLIENTE_TELEFONO", "3001112233");
        v.put("CLIENTE_CORREO", "c37@test.local");
        v.put("OBSERVACIONES", "Benchmark final C.3.7.");
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
        v.put("NUMERO_OT", "OT-C37-1");
        v.put("TIPO_COTIZACION", "INICIAL");
        v.put("EQUIPO_RESUMEN", "PORTÁTIL HP");
        v.put("EQUIPO_SERIAL", "SN-C37");
        v.put("DIAGNOSTICO", "Diagnóstico benchmark C.3.7");
        v.put("QR_DATA_URI",
            qrCodeService.generarPngDataUri("http://localhost:4200/consulta/ot/tok-c37"));
        v.put("DETALLE_ROWS",
            "<tr><td>REPUESTO</td><td>SSD 1TB</td><td class=\"num\">1</td>"
                + "<td class=\"num\">$250.000</td><td class=\"num\">$250.000</td></tr>");
        return v;
    }

    private Map<String, String> fillComprobante(Map<String, String> base) {
        Map<String, String> v = new LinkedHashMap<>(base);
        v.put("NUMERO_OT", "OT-C37-1");
        v.put("FECHA_RECEPCION", "28/09/2026 • 10:00 HRS");
        v.put("PROBLEMA_REPORTADO", "No enciende");
        v.put("OBSERVACIONES", "Sin golpes visibles");
        v.put("CLIENTE_NOMBRE", "Cliente Benchmark C37");
        v.put("CLIENTE_DOCUMENTO", "CC 123");
        v.put("CLIENTE_TELEFONO", "3001112233");
        v.put("EQUIPO_TIPO", "PORTÁTIL");
        v.put("EQUIPO_MARCA_MODELO", "HP 15");
        v.put("EQUIPO_REFERENCIA", "REF-C37");
        v.put("EQUIPO_SERIE", "SN-C37");
        v.put("TOKEN_CONSULTA", "tok-c37");
        v.put("QR_DATA_URI",
            qrCodeService.generarPngDataUri("http://localhost:4200/consulta/ot/tok-c37"));
        v.put("FIRMA_HTML", "<span class=\"muted\">(sin firma en benchmark C.3.7)</span>");
        v.put("NOMBRE_FIRMANTE_RECEPCION", "Cliente Benchmark C37");
        v.put("DOCUMENTO_FIRMANTE_RECEPCION", "CC 123");
        v.put("TEXTO_CONFORMIDAD_RECEPCION",
            "El cliente confirma la recepción del equipo por parte del taller.");
        return v;
    }

    private Map<String, String> fillActa(Map<String, String> base) {
        Map<String, String> v = new LinkedHashMap<>(base);
        v.put("NUMERO_OT", "OT-C37-1");
        v.put("FECHA_ENTREGA", "28/09/2026 16:00");
        v.put("CLIENTE_NOMBRE", "Cliente Benchmark C37");
        v.put("CLIENTE_DOCUMENTO", "CC 123");
        v.put("CLIENTE_TELEFONO", "3001112233");
        v.put("EQUIPO_TIPO", "PORTÁTIL");
        v.put("EQUIPO_MARCA_MODELO", "HP 15");
        v.put("EQUIPO_SERIE", "SN-C37");
        v.put("EQUIPO_RESUMEN", "PORTÁTIL HP");
        v.put("USUARIO_RESPONSABLE", "tecnico");
        v.put("TOTAL_APROBADO", "$300.000");
        v.put("COTIZACIONES_APROBADAS", "CC-1");
        v.put("TRABAJO_REALIZADO", "Cambio de SSD e instalación de SO.");
        v.put("OBSERVACIONES_ENTREGA", "Entrega conforme.");
        v.put("NOMBRE_FIRMANTE", "Cliente Benchmark C37");
        v.put("DOCUMENTO_FIRMANTE", "CC 123");
        v.put("CLIENTE_CONFIRMO", "Sí");
        v.put("FIRMA_HTML", "<span class=\"muted\">(sin firma en benchmark C.3.7)</span>");
        return v;
    }
}
