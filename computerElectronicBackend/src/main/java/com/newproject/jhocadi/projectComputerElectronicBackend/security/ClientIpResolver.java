package com.newproject.jhocadi.projectComputerElectronicBackend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resuelve la IP del cliente para anti-abuso.
 * Por defecto <strong>no</strong> confía en {@code X-Forwarded-For} (spoofeable por el cliente).
 * Solo úsalo detrás de un proxy que sobrescriba/elimine ese header, activando
 * {@code app.security.rate-limit.trust-forwarded-headers=true}. Preferible: configurar
 * el contenedor ({@code server.forward-headers-strategy}) para que {@code getRemoteAddr()}
 * ya sea la IP real.
 */
@Component
public class ClientIpResolver {

    private final boolean trustForwardedHeaders;

    public ClientIpResolver(
            @Value("${app.security.rate-limit.trust-forwarded-headers:false}")
            boolean trustForwardedHeaders) {
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        if (trustForwardedHeaders) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        String remote = request.getRemoteAddr();
        return remote != null && !remote.isBlank() ? remote : "unknown";
    }

    public boolean isTrustForwardedHeaders() {
        return trustForwardedHeaders;
    }
}
