package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import lombok.extern.slf4j.Slf4j;

/**
 * C.3.1 — Cache JVM de bytes TTF para PDFs.
 * Clave = classpath de la fuente. Valor = {@code byte[]} inmutable (contenido).
 * Cada registro en OpenHTMLToPDF debe crear un {@link java.io.ByteArrayInputStream} nuevo
 * desde estos bytes (no reutilizar streams consumibles).
 *
 * <p>Sin TTL ni invalidación: cambios en disco requieren reinicio de la aplicación.
 */
@Component
@Slf4j
public class PdfFontBytesCache {

    private final ConcurrentHashMap<String, byte[]> byClasspath = new ConcurrentHashMap<>();
    private final AtomicLong physicalLoads = new AtomicLong();

    /**
     * Devuelve bytes de la fuente; carga desde classpath solo en cache miss.
     */
    public byte[] getOrLoad(String classpath) {
        byte[] hit = byClasspath.get(classpath);
        if (hit != null) {
            log.debug("PDF-RES fonts cache hit path={}", classpath);
            return hit;
        }
        return byClasspath.computeIfAbsent(classpath, this::loadPhysical);
    }

    private byte[] loadPhysical(String classpath) {
        log.debug("PDF-RES fonts cache miss / init path={}", classpath);
        ClassPathResource resource = new ClassPathResource(classpath);
        if (!resource.exists()) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Fuente PDF no encontrada en classpath: " + classpath);
        }
        final byte[] fontBytes;
        try (InputStream in = resource.getInputStream()) {
            fontBytes = in.readAllBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo leer la fuente: " + classpath);
        }
        if (fontBytes.length == 0) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Fuente PDF vacía: " + classpath);
        }
        physicalLoads.incrementAndGet();
        log.debug("PDF-RES fonts cached entries={} (loaded path={})",
            byClasspath.size() + 1, classpath);
        return fontBytes;
    }

    /** Entradas únicas en cache (classpath distintos). */
    public int size() {
        return byClasspath.size();
    }

    /** Lecturas físicas desde classpath (para tests / diagnóstico). */
    public long physicalLoadCount() {
        return physicalLoads.get();
    }

    /** Solo tests: vacía el cache. */
    void clearForTests() {
        byClasspath.clear();
        physicalLoads.set(0);
    }
}
