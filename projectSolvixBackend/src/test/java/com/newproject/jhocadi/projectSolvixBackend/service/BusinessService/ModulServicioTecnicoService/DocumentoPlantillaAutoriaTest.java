package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * C.4 — Identidad corporativa, autoría y encoding UTF-8 en plantillas PDF de OT.
 * Los literales con tilde usan escapes unicode para no depender del charset del fuente.
 */
@SpringBootTest
@ActiveProfiles("test")
class DocumentoPlantillaAutoriaTest {

    private static final String GESTION = "Gesti\u00f3n";
    private static final String TECNICO = "T\u00e9cnico";
    private static final String TECNICA = "T\u00e9cnica";
    private static final String INFORMACION = "Informaci\u00f3n";
    private static final String INGENIERIA = "Ingenier\u00eda";
    private static final String YONDO = "Yond\u00f3";
    private static final String CLAUSULAS = "Cl\u00e1usulas";
    private static final String RECEPCION = "recepci\u00f3n";
    private static final String TECNICO_LOWER = "t\u00e9cnico";
    private static final String MIDDLE_DOT = "\u2022";
    private static final String MARIA = "Mar\u00eda Jos\u00e9 N\u00fa\u00f1ez";
    private static final String PORTATIL = "PORT\u00c1TIL";
    private static final String MOJIBAKE_A = "\u00c3";
    private static final String MOJIBAKE_A_CIRC = "\u00c2";

    @Autowired
    private DocumentoPlantillaSupport plantilla;

    @Autowired
    private HtmlToPdfService htmlToPdfService;

    static Stream<Arguments> plantillasOt() {
        return Stream.of(
            Arguments.of("comprobante-recepcion.html", "COMPROBANTE_RECEPCION"),
            Arguments.of("cotizacion.html", "COTIZACION"),
            Arguments.of("acta-entrega.html", "ACTA_ENTREGA")
        );
    }

    @ParameterizedTest(name = "{1} contiene empresa y autor\u00eda correctas")
    @MethodSource("plantillasOt")
    @DisplayName("plantillas OT: empresa + autoría sin branding SOLVIX")
    void plantillaContieneEmpresaYAutoriaSinSolvix(String plantillaNombre, String tipo) {
        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        rellenarCamposMinimos(vars);

        String html = htmlToPdfService.construirHtmlDesdeClasspath(plantillaNombre, vars);

        assertThat(html)
            .as("%s debe mostrar empresa y autoría", tipo)
            .contains("Computer &amp; Electronic Test")
            .contains("SOFTWARE DESARROLLADO POR")
            .contains("Jhossuant Cabezas")
            .contains("Full Stack Developer");

        assertThat(html)
            .as("%s usa footer Stitch unificado (empresa • WhatsApp • web)", tipo)
            .contains("WhatsApp:")
            .contains("cr-footer-web")
            .contains("cr-footer-company")
            .doesNotContain("Documento generado digitalmente por Computer &amp; Electronic Center S.A.S.");

        assertThat(html)
            .as("%s no debe usar branding SOLVIX", tipo)
            .doesNotContain(">SOLVIX<")
            .doesNotContain("Documento generado por SOLVIX")
            .doesNotContain("Software desarrollado por SOLVIX")
            .doesNotContain("SOLVIX Platform")
            .doesNotContain("SOLVIX OS")
            .doesNotContain("cr-pill")
            .doesNotContain("cot-pill")
            .doesNotContain("ae-pill");

        byte[] pdf = htmlToPdfService.htmlAPdf(html);
        assertThat(pdf).hasSizeGreaterThan(100);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("formatMoney presenta COP sin decimales ($100.000)")
    void formatMoneySinDecimales() {
        assertThat(DocumentoPlantillaSupport.formatMoney(new java.math.BigDecimal("100000.00")))
            .isEqualTo("$100.000");
        assertThat(DocumentoPlantillaSupport.formatMoney(new java.math.BigDecimal("250000")))
            .isEqualTo("$250.000");
        assertThat(DocumentoPlantillaSupport.formatMoney(java.math.BigDecimal.ZERO))
            .isEqualTo("$0");
        assertThat(DocumentoPlantillaSupport.formatMoney(new java.math.BigDecimal("100000.49")))
            .isEqualTo("$100.000");
        assertThat(DocumentoPlantillaSupport.formatMoney(new java.math.BigDecimal("100000.00")))
            .doesNotContain(",00");
    }

    @Test
    @DisplayName("acta de entrega: sin QR, token ni Referencia/Alias")
    void actaEntregaSinQrNiReferencia() throws Exception {
        String htmlPlantilla = Files.readString(
            Path.of("src/main/resources/templates/documentos/servicios/acta-entrega.html"));
        assertThat(htmlPlantilla)
            .doesNotContain("QR_DATA_URI")
            .doesNotContain("TOKEN_CONSULTA")
            .doesNotContain("Escanea")
            .doesNotContain("Trazabilidad")
            .doesNotContain("Referencia / alias")
            .doesNotContain("EQUIPO_REFERENCIA")
            .contains("Detalle de Entrega")
            .contains("Número de serie");

        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        rellenarCamposMinimos(vars);
        vars.put("NUMERO_OT", "OS-1");
        vars.put("FECHA_ENTREGA", "01/01/2026");
        vars.put("FIRMA_HTML", "");

        String html = htmlToPdfService.construirHtmlDesdeClasspath("acta-entrega.html", vars);
        assertThat(html)
            .doesNotContain("Escanea")
            .doesNotContain("Trazabilidad")
            .doesNotContain("Token de validaci\u00f3n")
            .doesNotContain("Referencia / alias")
            .contains("cr-footer-web");
    }

    @Test
    @DisplayName("cotización comercial: plantilla sin QR ni token de consulta")
    void cotizacionComercialSinQr() throws Exception {
        String htmlPlantilla = Files.readString(
            Path.of("src/main/resources/templates/documentos/servicios/cotizacion-comercial.html"));
        assertThat(htmlPlantilla)
            .doesNotContain("QR_DATA_URI")
            .doesNotContain("cot-qr")
            .doesNotContain("Escanea")
            .doesNotContain("TOKEN_CONSULTA")
            .doesNotContain("Trazabilidad")
            .contains("cr-sheet")
            .contains("styles/comprobante-recepcion.css");

        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        rellenarCamposMinimos(vars);
        vars.put("NUMERO_COTIZACION", "CC-1");
        vars.put("FECHA_COTIZACION", "01/01/2026");
        vars.put("FECHA_PRESENTACION", "01/01/2026");
        vars.put("DETALLE_ROWS", "<tr><td>Producto</td><td>X</td><td>1</td><td>$100.000</td><td>$100.000</td></tr>");
        vars.put("SUBTOTAL", "$100.000");
        vars.put("TOTAL", "$100.000");
        vars.put("OBSERVACIONES", "Sin observaciones");

        String html = htmlToPdfService.construirHtmlDesdeClasspath("cotizacion-comercial.html", vars);
        assertThat(html)
            .doesNotContain("Escanea el código")
            .doesNotContain("Escanea el codigo")
            .doesNotContain("alt=\"QR cotización\"")
            .doesNotContain("${QR_DATA_URI}")
            .doesNotContain("Presentada:")
            .doesNotContain("Fecha presentada")
            .doesNotContain("${FECHA_PRESENTACION}")
            .contains("Fecha:")
            .contains("Observaciones")
            .contains("$100.000");

        assertThat(htmlPlantilla)
            .doesNotContain("Presentada:")
            .doesNotContain("FECHA_PRESENTACION");
    }

    @Test
    @DisplayName("cotización OT: metadata Cotización/Orden/Presentada/tipo en filas asociadas")
    void cotizacionOtMetadataBannerEnFilas() throws Exception {
        String htmlPlantilla = Files.readString(
            Path.of("src/main/resources/templates/documentos/servicios/cotizacion.html"));
        assertThat(htmlPlantilla)
            .contains("cr-ot-chip")
            .contains("${NUMERO_COTIZACION}")
            .contains("${NUMERO_OT}")
            .contains("${FECHA_PRESENTACION}")
            .contains("${TIPO_COTIZACION}")
            .contains("Presentada:")
            .contains("cr-cot-meta")
            .doesNotContain("cr-fecha-sep");

        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        rellenarCamposMinimos(vars);
        vars.put("NUMERO_COTIZACION", "COT-2026-000005");
        vars.put("NUMERO_OT", "OS-2026-000018");
        vars.put("FECHA_PRESENTACION", "29/09/2026 16:26");
        vars.put("TIPO_COTIZACION", "INICIAL");

        String html = htmlToPdfService.construirHtmlDesdeClasspath("cotizacion.html", vars);
        assertThat(html)
            .contains("COT-2026-000005")
            .contains("OS-2026-000018")
            .contains("29/09/2026 16:26")
            .contains("INICIAL")
            .contains("Presentada:")
            .contains("cr-cot-meta")
            .contains("cr-chip-soft");

        byte[] pdf = htmlToPdfService.htmlAPdf(html);
        assertThat(pdf).hasSizeGreaterThan(100);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("properties corporativas llegan en UTF-8 (sin mojibake)")
    void propertiesCorporativasUtf8SinMojibake() {
        Map<String, String> vars = plantilla.baseEmpresaVars();

        assertThat(vars.get("DOCUMENTO_META_IZQ"))
            .contains(GESTION)
            .contains(TECNICA)
            .doesNotContain(MOJIBAKE_A)
            .doesNotContain(MOJIBAKE_A_CIRC);
        assertThat(vars.get("EMPRESA_SUBTITULO"))
            .contains(TECNICO_LOWER)
            .doesNotContain(MOJIBAKE_A);
        assertThat(vars.get("EMPRESA_ETIQUETA_LABORATORIO"))
            .contains(TECNICO)
            .contains(INGENIERIA)
            .contains(MIDDLE_DOT)
            .doesNotContain(MOJIBAKE_A)
            .doesNotContain(MOJIBAKE_A_CIRC);
        assertThat(vars.get("EMPRESA_DIRECCION"))
            .contains(YONDO)
            .doesNotContain(MOJIBAKE_A);
        assertThat(vars.get("CLAUSULAS_COMPROBANTE_RECEPCION"))
            .contains("<strong>")
            .contains("Custodia")
            .contains("diagn\u00f3stico")
            .doesNotContain(MOJIBAKE_A);
        assertThat(vars.get("COMPROBANTE_RECEPCION_KICKER"))
            .contains(TECNICO)
            .contains(MIDDLE_DOT)
            .doesNotContain(MOJIBAKE_A);
    }

    @Test
    @DisplayName("comprobante HTML/PDF: acentos correctos, OT integro, QR UX sin token")
    void comprobanteEncodingOtYQrCliente() throws Exception {
        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        rellenarCamposMinimos(vars);
        vars.put("NUMERO_OT", "OS-2026-000014");
        vars.put("CLIENTE_NOMBRE", MARIA);
        vars.put("EQUIPO_TIPO", PORTATIL);
        vars.put("PROBLEMA_REPORTADO", "Falla de encendido y diagn\u00f3stico " + TECNICO_LOWER);
        vars.put("OBSERVACIONES", "Recepci\u00f3n con cargador");
        vars.put("QR_DATA_URI", "data:image/png;base64,iVBORw0KGgo=");
        vars.put("TOKEN_CONSULTA", "no-debe-aparecer-en-html");

        String html = htmlToPdfService.construirHtmlDesdeClasspath("comprobante-recepcion.html", vars);

        assertThat(html)
            .contains(GESTION)
            .contains(TECNICO)
            .contains(INFORMACION)
            .contains(YONDO)
            .contains(MIDDLE_DOT)
            .contains("OS-2026-000014")
            .contains("white-space: nowrap")
            .contains("cr-ot-row")
            .contains("Consulta el estado de tu equipo")
            .contains("Escanea para consultar el estado")
            .contains("src=\"data:image/png;base64,iVBORw0KGgo=\"")
            .contains("cr-qr-img")
            .contains("<strong>")
            .doesNotContain("Referencia / alias")
            .doesNotContain("EQUIPO_REFERENCIA")
            .doesNotContain("Trazabilidad")
            .doesNotContain("Token de validaci\u00f3n")
            .doesNotContain("Token de Validaci\u00f3n")
            .doesNotContain("no-debe-aparecer-en-html")
            .doesNotContain("SOLVIX OS")
            .doesNotContain("viewBox=\"0 0 100 100\"")
            .doesNotContain("TEXTO_CONFORMIDAD_RECEPCION")
            .doesNotContain("El cliente confirma la recepción del equipo por parte del taller")
            .doesNotContain("para diagnóstico, revisión o servicio")
            .doesNotContain(MOJIBAKE_A)
            .doesNotContain(MOJIBAKE_A_CIRC + MIDDLE_DOT)
            .doesNotContain(MOJIBAKE_A_CIRC + " ");

        String plantilla = Files.readString(
            Path.of("src/main/resources/templates/documentos/servicios/comprobante-recepcion.html"));
        assertThat(plantilla)
            .doesNotContain("TEXTO_CONFORMIDAD_RECEPCION")
            .doesNotContain("El cliente confirma");

        byte[] pdf = htmlToPdfService.htmlAPdf(html);
        Files.write(Path.of("target/comprobante-recepcion-utf8-check.pdf"), pdf);

        try (PDDocument doc = PDDocument.load(pdf)) {
            String text = new PDFTextStripper().getText(doc);
            String compact = text.replaceAll("\\s+", " ").trim();
            assertThat(compact)
                .containsIgnoringCase(GESTION)
                .containsIgnoringCase(TECNICO)
                .containsIgnoringCase(INFORMACION)
                .contains(YONDO)
                .contains(MIDDLE_DOT)
                .contains("OS-2026-000014")
                .containsIgnoringCase("consulta el estado de tu equipo")
                .contains(MARIA)
                .contains("Jhossuant Cabezas")
                .doesNotContain("Trazabilidad")
                .doesNotContain("Token de validaci\u00f3n")
                .doesNotContain("Token de Validaci\u00f3n")
                .doesNotContain("no-debe-aparecer-en-html")
                .doesNotContain("SOLVIX OS")
                .doesNotContain(MOJIBAKE_A)
                .doesNotContain(MOJIBAKE_A_CIRC);
        }
    }

    @Test
    @DisplayName("PDF conserva tildes con Inter y JetBrains Mono")
    void pdfConservaTildesYEne() throws Exception {
        String html = ""
            + "<html><head><meta charset=\"UTF-8\"/>"
            + "<style>"
            + "body{font-family:Inter,\"DejaVu Sans\";font-size:12pt}"
            + ".m{font-family:\"JetBrains Mono\",\"DejaVu Sans Mono\";font-size:11pt}"
            + "</style></head><body>"
            + "<p>Recepci\u00f3n " + MIDDLE_DOT + " Port\u00e1til " + MIDDLE_DOT
            + " diagn\u00f3stico " + MIDDLE_DOT + " \u00f1\u00e1\u00e9\u00ed\u00f3\u00fa "
            + MIDDLE_DOT + " " + CLAUSULAS + " t\u00e9cnicas</p>"
            + "<p class=\"m\">" + YONDO + " " + MIDDLE_DOT
            + " Protocolo de Ingreso " + MIDDLE_DOT + " N\u00famero de serie</p>"
            + "</body></html>";
        byte[] pdf = htmlToPdfService.htmlAPdf(html);
        try (PDDocument doc = PDDocument.load(pdf)) {
            String text = new PDFTextStripper().getText(doc);
            assertThat(text)
                .contains("Recepci\u00f3n")
                .contains("Port\u00e1til")
                .contains("diagn\u00f3stico")
                .contains("\u00f1\u00e1\u00e9\u00ed\u00f3\u00fa")
                .contains(CLAUSULAS)
                .contains(YONDO)
                .contains("N\u00famero")
                .doesNotContain(MOJIBAKE_A)
                .doesNotContain(MOJIBAKE_A_CIRC);
        }
    }

    @ParameterizedTest(name = "vars base incluyen {0}")
    @MethodSource("clavesAutoria")
    void baseEmpresaVarsIncluyeAutoria(String clave, String esperado) {
        Map<String, String> vars = plantilla.baseEmpresaVars();
        assertThat(vars).containsKey(clave);
        assertThat(vars.get(clave)).contains(esperado);
    }

    static Stream<Arguments> clavesAutoria() {
        return Stream.of(
            Arguments.of("SOFTWARE_DESARROLLADO_POR", "Jhossuant Cabezas"),
            Arguments.of("SOFTWARE_ROL", "Full Stack Developer"),
            Arguments.of("FOOTER_TEXTO", "Computer &amp; Electronic Center S.A.S."),
            Arguments.of("EMPRESA_NOMBRE", "Computer &amp; Electronic Test")
        );
    }

    private static void rellenarCamposMinimos(Map<String, String> vars) {
        String[] claves = {
            "NUMERO_OT", "FECHA_RECEPCION", "CLIENTE_NOMBRE", "CLIENTE_DOCUMENTO", "CLIENTE_TELEFONO",
            "EQUIPO_TIPO", "EQUIPO_MARCA_MODELO", "EQUIPO_REFERENCIA", "EQUIPO_SERIE",
            "PROBLEMA_REPORTADO", "OBSERVACIONES", "QR_DATA_URI", "TOKEN_CONSULTA",
            "NUMERO_COTIZACION", "TIPO_COTIZACION", "FECHA_PRESENTACION", "EQUIPO_RESUMEN",
            "SUBTOTAL", "TOTAL", "DETALLES_HTML", "DETALLE_ROWS",
            "FECHA_ENTREGA", "USUARIO_RESPONSABLE", "TOTAL_APROBADO", "COTIZACIONES_APROBADAS",
            "NOMBRE_FIRMANTE", "DOCUMENTO_FIRMANTE", "CLIENTE_CONFIRMO",
            "TRABAJO_REALIZADO", "OBSERVACIONES_ENTREGA", "FIRMA_HTML",
            "NOMBRE_FIRMANTE_RECEPCION", "DOCUMENTO_FIRMANTE_RECEPCION", "TEXTO_CONFORMIDAD_RECEPCION",
            "CLIENTE_CORREO", "FECHA_COTIZACION"
        };
        for (String clave : claves) {
            vars.putIfAbsent(clave, "\u2014");
        }
        vars.putIfAbsent("QR_DATA_URI", "");
        vars.putIfAbsent("FIRMA_HTML", "");
        vars.putIfAbsent("DETALLES_HTML", "");
        vars.putIfAbsent("DETALLE_ROWS", "<tr><td colspan=\"5\" class=\"muted\">Sin l\u00edneas</td></tr>");
        vars.putIfAbsent("LOGO_HTML", "");
    }
}
