package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * C.3.1 — Cache de bytes TTF (sin Spring).
 */
class PdfFontBytesCacheTest {

    private static final String FONT = "fonts/Inter-Regular.ttf";

    private PdfFontBytesCache cache;

    @BeforeEach
    void setUp() {
        cache = new PdfFontBytesCache();
    }

    @Test
    @DisplayName("primera carga = miss físico; segunda = hit sin releer")
    void missThenHit() {
        byte[] first = cache.getOrLoad(FONT);
        assertThat(first).isNotEmpty();
        assertThat(cache.physicalLoadCount()).isEqualTo(1);
        assertThat(cache.size()).isEqualTo(1);

        byte[] second = cache.getOrLoad(FONT);
        assertThat(second).isSameAs(first);
        assertThat(cache.physicalLoadCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("aliases del mismo classpath no disparan lecturas adicionales")
    void sharedClasspathSingleLoad() {
        cache.getOrLoad("fonts/DejaVuSans.ttf");
        cache.getOrLoad("fonts/DejaVuSans.ttf");
        cache.getOrLoad("fonts/DejaVuSans.ttf");
        assertThat(cache.physicalLoadCount()).isEqualTo(1);
        assertThat(cache.size()).isEqualTo(1);
    }

    @Test
    @DisplayName("bytes cacheados permiten InputStream nuevo válido")
    void freshStreamFromCachedBytes() throws Exception {
        byte[] bytes = cache.getOrLoad(FONT);
        try (ByteArrayInputStream in1 = new ByteArrayInputStream(bytes);
             ByteArrayInputStream in2 = new ByteArrayInputStream(bytes)) {
            assertThat(in1.readAllBytes()).isEqualTo(bytes);
            assertThat(in2.readAllBytes()).isEqualTo(bytes);
        }
        assertThat(cache.physicalLoadCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("concurrencia: una sola carga física, sin corrupción")
    void concurrentLoadsSinglePhysicalRead() throws Exception {
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        List<Callable<byte[]>> tasks = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            tasks.add(() -> cache.getOrLoad(FONT));
        }
        List<Future<byte[]>> futures = pool.invokeAll(tasks);
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        byte[] first = futures.get(0).get();
        for (Future<byte[]> f : futures) {
            assertThat(f.get()).isSameAs(first);
        }
        assertThat(cache.physicalLoadCount()).isEqualTo(1);
        assertThat(cache.size()).isEqualTo(1);
    }
}
