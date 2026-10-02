package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Rate limit en memoria para acciones públicas sensibles (monolito).
 * Limitación: no compartido entre instancias; se reinicia al reiniciar la JVM.
 */
@Component
public class PublicActionRateLimiter {

    private final int maxAttempts;
    private final long windowMillis;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public PublicActionRateLimiter(
            @Value("${solvix.consulta.rate-limit.max-attempts:8}") int maxAttempts,
            @Value("${solvix.consulta.rate-limit.window-seconds:300}") int windowSeconds) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.windowMillis = Math.max(1, windowSeconds) * 1000L;
    }

    /**
     * Registra un intento. Si se excede el límite → 429.
     */
    public void checkAndConsume(String key) {
        if (key == null || key.isBlank()) {
            key = "unknown";
        }
        purgeExpiredOccasionally();
        long now = Instant.now().toEpochMilli();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= windowMillis) {
                return new Window(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });
        if (window.count.get() > maxAttempts) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Demasiados intentos. Espera un momento e inténtalo de nuevo.");
        }
    }

    private void purgeExpiredOccasionally() {
        if (windows.size() < 200) {
            return;
        }
        long now = Instant.now().toEpochMilli();
        Iterator<Map.Entry<String, Window>> it = windows.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Window> e = it.next();
            if (now - e.getValue().windowStart >= windowMillis) {
                it.remove();
            }
        }
    }

    /** Solo tests. */
    void reset() {
        windows.clear();
    }

    private static final class Window {
        final long windowStart;
        final AtomicInteger count;

        Window(long windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
