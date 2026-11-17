package com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulServicioTecnicoService;

import java.time.Clock;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
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
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private volatile long lastPurgeAtMillis;

    @Autowired
    public PublicActionRateLimiter(
            @Value("${app.security.rate-limit.max-attempts:8}") int maxAttempts,
            @Value("${app.security.rate-limit.window-seconds:300}") int windowSeconds) {
        this(maxAttempts, windowSeconds, Clock.systemUTC());
    }

    /** Visible para tests (reloj controlable). */
    PublicActionRateLimiter(int maxAttempts, int windowSeconds, Clock clock) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.windowMillis = Math.max(1, windowSeconds) * 1000L;
        this.clock = clock != null ? clock : Clock.systemUTC();
        this.lastPurgeAtMillis = 0L;
    }

    /**
     * Registra un intento. Si se excede el límite → 429.
     */
    public void checkAndConsume(String key) {
        if (key == null || key.isBlank()) {
            key = "unknown";
        }
        purgeExpiredOccasionally();
        long now = Instant.now(clock).toEpochMilli();
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

    /**
     * Elimina ventanas expiradas. Se ejecuta al menos cada segundo si hay entradas,
     * o de inmediato cuando el mapa supera 64 claves (evita crecimiento indefinido
     * de claves abandonadas bajo el umbral anterior de 200).
     */
    private void purgeExpiredOccasionally() {
        if (windows.isEmpty()) {
            return;
        }
        long now = Instant.now(clock).toEpochMilli();
        if (windows.size() < 64 && now - lastPurgeAtMillis < 1_000L) {
            return;
        }
        purgeExpired(now);
        lastPurgeAtMillis = now;
    }

    private void purgeExpired(long now) {
        Iterator<Map.Entry<String, Window>> it = windows.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Window> e = it.next();
            if (now - e.getValue().windowStart >= windowMillis) {
                it.remove();
            }
        }
    }

    /** Visible para tests. */
    public void reset() {
        windows.clear();
        lastPurgeAtMillis = 0L;
    }

    /** Visible para tests. */
    public int size() {
        return windows.size();
    }

    /** Visible para tests. */
    public void purgeNow() {
        purgeExpired(Instant.now(clock).toEpochMilli());
        lastPurgeAtMillis = Instant.now(clock).toEpochMilli();
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
