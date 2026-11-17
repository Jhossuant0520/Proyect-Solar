package com.newproject.jhocadi.projectComputerElectronicBackend.security;

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
 * Rate limit en memoria para endpoints de autenticación públicos.
 * Separado de {@code PublicActionRateLimiter} (cotizaciones) porque cada operación
 * requiere límites y ventanas distintos; un único max/window compartido no sirve.
 * No compartido entre instancias; se reinicia al reiniciar la JVM.
 */
@Component
public class AuthRateLimiter {

    private final int loginMaxAttempts;
    private final int loginWindowSeconds;
    private final int registroMaxAttempts;
    private final int registroWindowSeconds;
    private final int reenviarMaxAttempts;
    private final int reenviarWindowSeconds;
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private volatile long lastPurgeAtMillis;

    @Autowired
    public AuthRateLimiter(
            @Value("${app.security.rate-limit.auth.login.max-attempts:10}") int loginMaxAttempts,
            @Value("${app.security.rate-limit.auth.login.window-seconds:900}") int loginWindowSeconds,
            @Value("${app.security.rate-limit.auth.registro.max-attempts:5}") int registroMaxAttempts,
            @Value("${app.security.rate-limit.auth.registro.window-seconds:3600}") int registroWindowSeconds,
            @Value("${app.security.rate-limit.auth.reenviar-verificacion.max-attempts:3}") int reenviarMaxAttempts,
            @Value("${app.security.rate-limit.auth.reenviar-verificacion.window-seconds:3600}") int reenviarWindowSeconds) {
        this(loginMaxAttempts, loginWindowSeconds, registroMaxAttempts, registroWindowSeconds,
            reenviarMaxAttempts, reenviarWindowSeconds, Clock.systemUTC());
    }

    /** Visible para tests. */
    AuthRateLimiter(
            int loginMaxAttempts,
            int loginWindowSeconds,
            int registroMaxAttempts,
            int registroWindowSeconds,
            int reenviarMaxAttempts,
            int reenviarWindowSeconds,
            Clock clock) {
        this.loginMaxAttempts = Math.max(1, loginMaxAttempts);
        this.loginWindowSeconds = Math.max(1, loginWindowSeconds);
        this.registroMaxAttempts = Math.max(1, registroMaxAttempts);
        this.registroWindowSeconds = Math.max(1, registroWindowSeconds);
        this.reenviarMaxAttempts = Math.max(1, reenviarMaxAttempts);
        this.reenviarWindowSeconds = Math.max(1, reenviarWindowSeconds);
        this.clock = clock != null ? clock : Clock.systemUTC();
        this.lastPurgeAtMillis = 0L;
    }

    public void checkLogin(String clientIp) {
        checkAndConsume(key("login", clientIp), loginMaxAttempts, loginWindowSeconds);
    }

    public void checkRegistro(String clientIp) {
        checkAndConsume(key("registro", clientIp), registroMaxAttempts, registroWindowSeconds);
    }

    public void checkReenviarVerificacion(String clientIp) {
        checkAndConsume(key("reenviar", clientIp), reenviarMaxAttempts, reenviarWindowSeconds);
    }

    private static String key(String operation, String clientIp) {
        String ip = clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.trim();
        return "auth:" + operation + ":" + ip;
    }

    private void checkAndConsume(String key, int maxAttempts, int windowSeconds) {
        purgeExpiredOccasionally();
        long windowMillis = windowSeconds * 1000L;
        long now = Instant.now(clock).toEpochMilli();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= existing.windowMillis) {
                return new Window(now, windowMillis, new AtomicInteger(1));
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
            if (now - e.getValue().windowStart >= e.getValue().windowMillis) {
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
        long now = Instant.now(clock).toEpochMilli();
        purgeExpired(now);
        lastPurgeAtMillis = now;
    }

    private static final class Window {
        final long windowStart;
        final long windowMillis;
        final AtomicInteger count;

        Window(long windowStart, long windowMillis, AtomicInteger count) {
            this.windowStart = windowStart;
            this.windowMillis = windowMillis;
            this.count = count;
        }
    }
}
