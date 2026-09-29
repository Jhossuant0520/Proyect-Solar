package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * C.3.1 — Regresión: cache de fuentes/logo + PDF válido en generaciones concurrentes.
 */
@SpringBootTest
@ActiveProfiles("test")
class PdfResourceCacheIntegrationTest {

    @Autowired
    private HtmlToPdfService htmlToPdfService;

    @Autowired
    private DocumentoPlantillaSupport plantilla;

    @Autowired
    private PdfFontBytesCache fontBytesCache;

    @BeforeEach
    void warmClearOptional() {
        // No limpiar siempre: permite observar hits entre tests del mismo contexto.
        // Para asserts de carga física aislados se usa clear explícito en el test de miss.
    }

    @Test
    @DisplayName("segunda generación PDF reutiliza fonts cache (sin más lecturas físicas)")
    void secondPdfGenerationReusesFontCache() {
        fontBytesCache.clearForTests();
        plantilla.clearLogoCacheForTests();

        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        fillMinimal(vars);

        byte[] pdf1 = htmlToPdfService.renderDesdeClasspath("cotizacion-comercial.html", vars);
        long loadsAfterFirst = fontBytesCache.physicalLoadCount();
        int uniqueFonts = fontBytesCache.size();
        assertThat(pdf1.length).isGreaterThan(1000);
        assertThat(loadsAfterFirst).isGreaterThanOrEqualTo(10);
        assertThat(uniqueFonts).isBetween(10, 27);

        byte[] pdf2 = htmlToPdfService.renderDesdeClasspath("cotizacion-comercial.html", vars);
        assertThat(pdf2.length).isGreaterThan(1000);
        assertThat(fontBytesCache.physicalLoadCount())
            .as("no debe haber lecturas físicas adicionales en 2ª generación")
            .isEqualTo(loadsAfterFirst);
        assertThat(plantilla.logoPhysicalLoadCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("generaciones concurrentes no corrompen streams de fuentes")
    void concurrentPdfRenders() throws Exception {
        Map<String, String> vars = new HashMap<>(plantilla.baseEmpresaVars());
        fillMinimal(vars);

        int threads = 4;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicReference<Throwable> error = new AtomicReference<>();
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await(10, TimeUnit.SECONDS);
                    byte[] pdf = htmlToPdfService.renderDesdeClasspath("comprobante-recepcion.html", vars);
                    assertThat(pdf.length).isGreaterThan(1000);
                } catch (Throwable t) {
                    error.compareAndSet(null, t);
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(120, TimeUnit.SECONDS)).isTrue();
        assertThat(error.get()).isNull();
    }

    private static void fillMinimal(Map<String, String> vars) {
        vars.putIfAbsent("NUMERO_COTIZACION", "CC-TEST");
        vars.putIfAbsent("FECHA_COTIZACION", "01/01/2026");
        vars.putIfAbsent("FECHA_PRESENTACION", "01/01/2026");
        vars.putIfAbsent("CLIENTE_NOMBRE", "Cliente Test");
        vars.putIfAbsent("CLIENTE_DOCUMENTO", "CC 1");
        vars.putIfAbsent("CLIENTE_TELEFONO", "300");
        vars.putIfAbsent("CLIENTE_CORREO", "a@b.c");
        vars.putIfAbsent("OBSERVACIONES", "—");
        vars.putIfAbsent("DETALLE_ROWS", "<tr><td>1</td><td>Item</td><td>1</td><td>$1</td><td>$1</td></tr>");
        vars.putIfAbsent("SUBTOTAL", "$1");
        vars.putIfAbsent("TOTAL", "$1");
        vars.putIfAbsent("NUMERO_ORDEN", "OT-1");
        vars.putIfAbsent("CODIGO_INGRESO", "ABC");
        vars.putIfAbsent("FECHA_INGRESO", "01/01/2026");
        vars.putIfAbsent("CLIENTE_CELULAR", "300");
        vars.putIfAbsent("EQUIPO_RESUMEN", "PC");
        vars.putIfAbsent("EQUIPO_SERIAL", "S1");
        vars.putIfAbsent("EQUIPO_ACCESORIOS", "—");
        vars.putIfAbsent("FALLA_REPORTADA", "—");
        vars.putIfAbsent("OBSERVACIONES_INGRESO", "—");
        vars.putIfAbsent("USUARIO_RECEPCION", "test");
        vars.putIfAbsent("QR_IMG", "");
        vars.putIfAbsent("TOKEN_DOCUMENTO", "tok");
        vars.putIfAbsent("URL_CONSULTA", "http://localhost/consulta");
    }
}
