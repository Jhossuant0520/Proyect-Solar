package com.newproject.jhocadi.projectComputerElectronicBackend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class AuthRateLimiterTest {

    private static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    private AuthRateLimiter limiter(Clock clock) {
        // login 2/10s, registro 2/20s, reenviar 1/30s
        return new AuthRateLimiter(2, 10, 2, 20, 1, 30, clock);
    }

    @Test
    @DisplayName("login dentro del límite OK; exceso → 429")
    void loginLimite() {
        AuthRateLimiter lim = limiter(Clock.systemUTC());
        lim.checkLogin("10.0.0.1");
        lim.checkLogin("10.0.0.1");
        assertThatThrownBy(() -> lim.checkLogin("10.0.0.1"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    @DisplayName("login y registro no comparten contador")
    void operacionesIndependientes() {
        AuthRateLimiter lim = limiter(Clock.systemUTC());
        lim.checkLogin("10.0.0.1");
        lim.checkLogin("10.0.0.1");
        assertThatThrownBy(() -> lim.checkLogin("10.0.0.1"))
            .isInstanceOf(ResponseStatusException.class);

        assertThatCode(() -> lim.checkRegistro("10.0.0.1")).doesNotThrowAnyException();
        assertThatCode(() -> lim.checkReenviarVerificacion("10.0.0.1")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("IPs distintas tienen contadores independientes")
    void ipsIndependientes() {
        AuthRateLimiter lim = limiter(Clock.systemUTC());
        lim.checkLogin("1.1.1.1");
        lim.checkLogin("1.1.1.1");
        assertThatCode(() -> lim.checkLogin("2.2.2.2")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("purge elimina ventanas expiradas")
    void purgeExpirados() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        AuthRateLimiter lim = limiter(clock);
        for (int i = 0; i < 70; i++) {
            lim.checkLogin("ip-" + i);
        }
        assertThat(lim.size()).isEqualTo(70);
        clock.advanceSeconds(11);
        lim.purgeNow();
        assertThat(lim.size()).isZero();
    }

    @Test
    @DisplayName("tras expirar la ventana el contador se reinicia")
    void ventanaExpira() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        AuthRateLimiter lim = limiter(clock);
        lim.checkReenviarVerificacion("9.9.9.9");
        assertThatThrownBy(() -> lim.checkReenviarVerificacion("9.9.9.9"))
            .isInstanceOf(ResponseStatusException.class);
        clock.advanceSeconds(31);
        assertThatCode(() -> lim.checkReenviarVerificacion("9.9.9.9")).doesNotThrowAnyException();
    }
}
