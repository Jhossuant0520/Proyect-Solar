package com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulServicioTecnicoService;

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

class PublicActionRateLimiterTest {

    private static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void set(Instant instant) {
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

    @Test
    @DisplayName("dentro del límite no lanza")
    void dentroDelLimite() {
        PublicActionRateLimiter lim = new PublicActionRateLimiter(3, 60, Clock.systemUTC());
        assertThatCode(() -> {
            lim.checkAndConsume("k");
            lim.checkAndConsume("k");
            lim.checkAndConsume("k");
        }).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("exceder el límite → 429")
    void excedeLimite429() {
        PublicActionRateLimiter lim = new PublicActionRateLimiter(2, 60, Clock.systemUTC());
        lim.checkAndConsume("tok|10.0.0.1");
        lim.checkAndConsume("tok|10.0.0.1");
        assertThatThrownBy(() -> lim.checkAndConsume("tok|10.0.0.1"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    @DisplayName("claves distintas tienen contadores independientes")
    void clavesIndependientes() {
        PublicActionRateLimiter lim = new PublicActionRateLimiter(1, 60, Clock.systemUTC());
        lim.checkAndConsume("cot-accion:a|1.1.1.1");
        assertThatCode(() -> lim.checkAndConsume("cot-accion:b|1.1.1.1"))
            .doesNotThrowAnyException();
        assertThatThrownBy(() -> lim.checkAndConsume("cot-accion:a|1.1.1.1"))
            .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("tras expirar la ventana el contador se reinicia")
    void ventanaExpiraYReinicia() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        PublicActionRateLimiter lim = new PublicActionRateLimiter(1, 10, clock);
        lim.checkAndConsume("k");
        assertThatThrownBy(() -> lim.checkAndConsume("k"))
            .isInstanceOf(ResponseStatusException.class);

        clock.advanceSeconds(11);
        assertThatCode(() -> lim.checkAndConsume("k")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("purge elimina ventanas expiradas y evita crecimiento indefinido")
    void purgeLimpiaExpirados() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        PublicActionRateLimiter lim = new PublicActionRateLimiter(5, 5, clock);

        for (int i = 0; i < 80; i++) {
            lim.checkAndConsume("key-" + i);
        }
        assertThat(lim.size()).isEqualTo(80);

        clock.advanceSeconds(6);
        lim.purgeNow();
        assertThat(lim.size()).isZero();

        lim.checkAndConsume("fresh");
        assertThat(lim.size()).isEqualTo(1);
    }

    @Test
    @DisplayName("reset limpia el mapa (uso en tests de integración)")
    void resetLimpia() {
        PublicActionRateLimiter lim = new PublicActionRateLimiter(5, 60, Clock.systemUTC());
        lim.checkAndConsume("a");
        lim.checkAndConsume("b");
        assertThat(lim.size()).isEqualTo(2);
        lim.reset();
        assertThat(lim.size()).isZero();
    }
}
