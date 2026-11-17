package com.newproject.jhocadi.projectComputerElectronicBackend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import jakarta.servlet.http.HttpServletRequest;

class ClientIpResolverTest {

    @Test
    @DisplayName("por defecto ignora X-Forwarded-For spoofeable")
    void noConfiaEnXffPorDefecto() {
        ClientIpResolver resolver = new ClientIpResolver(false);
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("9.9.9.9, 8.8.8.8");
        when(req.getRemoteAddr()).thenReturn("10.0.0.5");

        assertThat(resolver.resolve(req)).isEqualTo("10.0.0.5");
        assertThat(resolver.isTrustForwardedHeaders()).isFalse();
    }

    @Test
    @DisplayName("con trust-forwarded-headers=true usa el primer X-Forwarded-For")
    void confiaEnXffSiEstaHabilitado() {
        ClientIpResolver resolver = new ClientIpResolver(true);
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("9.9.9.9, 8.8.8.8");
        when(req.getRemoteAddr()).thenReturn("10.0.0.5");

        assertThat(resolver.resolve(req)).isEqualTo("9.9.9.9");
    }

    @Test
    @DisplayName("sin XFF usa remoteAddr; request nulo → unknown")
    void fallbackRemoteYNull() {
        ClientIpResolver resolver = new ClientIpResolver(true);
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("127.0.0.1");

        assertThat(resolver.resolve(req)).isEqualTo("127.0.0.1");
        assertThat(resolver.resolve(null)).isEqualTo("unknown");
    }
}
