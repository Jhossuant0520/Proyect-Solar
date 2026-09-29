package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.newproject.jhocadi.projectSolvixBackend.config.EmpresaDocumentoProperties;
import com.newproject.jhocadi.projectSolvixBackend.config.SoftwareDocumentoProperties;

/**
 * C.3.1 — Cache del HTML data-URI del logo (sin Spring context).
 */
class PdfLogoCacheTest {

    private DocumentoPlantillaSupport plantilla;

    @BeforeEach
    void setUp() {
        EmpresaDocumentoProperties empresa = new EmpresaDocumentoProperties();
        empresa.setLogoClasspath("static/branding/logo-empresa.png");
        SoftwareDocumentoProperties software = new SoftwareDocumentoProperties();
        plantilla = new DocumentoPlantillaSupport(empresa, software);
        plantilla.clearLogoCacheForTests();
    }

    @Test
    @DisplayName("primera carga logo = miss; segunda = hit sin releer")
    void missThenHit() {
        String first = plantilla.baseEmpresaVars().get("LOGO_HTML");
        assertThat(first).startsWith("<img class=\"doc-logo\" src=\"data:image/png;base64,");
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
        assertThat(plantilla.logoCacheSize()).isEqualTo(1);

        String second = plantilla.baseEmpresaVars().get("LOGO_HTML");
        assertThat(second).isEqualTo(first);
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("concurrencia: una sola carga física del logo")
    void concurrentLogoLoads() throws Exception {
        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        List<Callable<String>> tasks = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            tasks.add(() -> plantilla.baseEmpresaVars().get("LOGO_HTML"));
        }
        List<Future<String>> futures = pool.invokeAll(tasks);
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        String expected = futures.get(0).get();
        assertThat(expected).isNotBlank();
        for (Future<String> f : futures) {
            assertThat(f.get()).isEqualTo(expected);
        }
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("logo vacío si classpath no existe (sin cachear fallo)")
    void missingLogoReturnsEmpty() {
        EmpresaDocumentoProperties empresa = new EmpresaDocumentoProperties();
        empresa.setLogoClasspath("static/branding/no-existe.png");
        DocumentoPlantillaSupport other =
            new DocumentoPlantillaSupport(empresa, new SoftwareDocumentoProperties());

        Map<String, String> vars = other.baseEmpresaVars();
        assertThat(vars.get("LOGO_HTML")).isEmpty();
        assertThat(other.logoPhysicalLoadCount()).isZero();
        assertThat(other.logoCacheSize()).isZero();
    }
}
