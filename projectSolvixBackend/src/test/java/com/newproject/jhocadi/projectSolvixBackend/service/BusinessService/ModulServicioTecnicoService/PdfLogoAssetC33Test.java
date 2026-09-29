package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;

import com.newproject.jhocadi.projectSolvixBackend.config.EmpresaDocumentoProperties;

/**
 * C.3.3 — Asset de logo optimizado para PDFs (sin cambiar plantillas/renderer).
 */
@SpringBootTest
@ActiveProfiles("test")
class PdfLogoAssetC33Test {

    private static final String PDF_LOGO = "static/branding/LogoEmpresa1-pdf.png";
    private static final String ORIGINAL_LOGO = "static/branding/LogoEmpresa1.png";

    @Autowired
    private EmpresaDocumentoProperties empresa;

    @Autowired
    private DocumentoPlantillaSupport plantilla;

    @Autowired
    private HtmlToPdfService htmlToPdfService;

    @BeforeEach
    void clearLogoCache() {
        plantilla.clearLogoCacheForTests();
    }

    @Test
    @DisplayName("A/B: asset PDF existe, es PNG y es mucho más liviano que el original")
    void pdfAssetExistsAndIsLighterThanOriginal() throws Exception {
        ClassPathResource pdf = new ClassPathResource(PDF_LOGO);
        ClassPathResource original = new ClassPathResource(ORIGINAL_LOGO);
        assertThat(pdf.exists()).as("LogoEmpresa1-pdf.png debe existir en classpath").isTrue();
        assertThat(original.exists()).as("original LogoEmpresa1.png se conserva").isTrue();

        byte[] pdfBytes;
        try (InputStream in = pdf.getInputStream()) {
            pdfBytes = in.readAllBytes();
        }
        byte[] originalBytes;
        try (InputStream in = original.getInputStream()) {
            originalBytes = in.readAllBytes();
        }

        assertThat(pdfBytes[0]).isEqualTo((byte) 0x89);
        assertThat(pdfBytes[1]).isEqualTo((byte) 0x50); // P
        assertThat(pdfBytes[2]).isEqualTo((byte) 0x4E); // N
        assertThat(pdfBytes[3]).isEqualTo((byte) 0x47); // G
        assertThat(pdfBytes.length).isLessThan(100_000);
        assertThat(pdfBytes.length).isLessThan(originalBytes.length / 10);
    }

    @Test
    @DisplayName("C/F: DocumentoPlantillaSupport usa el asset PDF (no el original grande)")
    void plantillaUsesOptimizedPdfAsset() {
        assertThat(empresa.getLogoClasspath()).isEqualTo(PDF_LOGO);

        String logoHtml = plantilla.baseEmpresaVars().get("LOGO_HTML");
        assertThat(logoHtml)
            .startsWith("<img class=\"doc-logo\" src=\"data:image/png;base64,")
            .contains("alt=\"Logo\"");
        // Original ~1.72M chars; optimizado debe quedar muy por debajo.
        assertThat(logoHtml.length()).isLessThan(80_000);
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("D/E/G: PDF se genera; cache C.3.1 sigue en hit en 2ª carga")
    void pdfGeneratesAndCacheStillWorks() throws Exception {
        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
        long logoChars = vars.get("LOGO_HTML").length();

        vars.put("NUMERO_COTIZACION", "CC-C33");
        vars.put("FECHA_COTIZACION", "28/09/2026");
        vars.put("FECHA_PRESENTACION", "28/09/2026");
        vars.put("CLIENTE_NOMBRE", "Cliente C33");
        vars.put("CLIENTE_DOCUMENTO", "CC 1");
        vars.put("CLIENTE_TELEFONO", "300");
        vars.put("CLIENTE_CORREO", "c33@test.local");
        vars.put("OBSERVACIONES", "—");
        vars.put("DETALLE_ROWS",
            "<tr><td>PRODUCTO</td><td>Item</td><td class=\"num\">1</td>"
                + "<td class=\"num\">$1</td><td class=\"num\">$1</td></tr>");
        vars.put("SUBTOTAL", "$1");
        vars.put("TOTAL", "$1");

        byte[] pdf = htmlToPdfService.renderDesdeClasspath("cotizacion-comercial.html", vars);
        assertThat(pdf.length).isGreaterThan(1000);
        try (PDDocument doc = PDDocument.load(pdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
        }

        // 2ª obtención de company vars = cache hit (sin nueva lectura física)
        String logo2 = plantilla.baseEmpresaVars().get("LOGO_HTML");
        assertThat(logo2.length()).isEqualTo(logoChars);
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
    }
}
