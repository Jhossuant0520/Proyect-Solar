package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.Agrupacion;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.PeriodoDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;

/**
 * Ventana de tiempo sobre la que se calcula cualquier KPI.
 *
 * <p><b>Zona horaria:</b> todas las fechas de negocio del sistema son {@code LocalDateTime}
 * sin zona, escritas con el reloj del servidor. Agrupar por año/mes/día usa ese mismo
 * calendario local, así que la agrupación es consistente con lo que se guardó. La zona
 * configurable solo se usa para resolver "hoy" cuando el cliente no envía fechas; si el
 * servidor y el negocio quedaran en husos distintos, ese es el único punto a ajustar.
 */
public record PeriodoAnalitico(LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion) {

    public PeriodoAnalitico {
        if (desde.isAfter(hasta)) {
            throw new BusinessException("La fecha inicial no puede ser posterior a la fecha final.");
        }
    }

    /**
     * Resuelve el período pedido. Sin fechas, el valor por defecto es el mes en curso:
     * es la ventana que un dashboard comercial mira por defecto.
     */
    public static PeriodoAnalitico resolver(
            LocalDateTime desde, LocalDateTime hasta, Agrupacion agrupacion, ZoneId zona) {

        LocalDateTime fin = hasta != null ? hasta : LocalDateTime.now(zona);
        LocalDateTime inicio = desde != null
            ? desde
            : LocalDate.now(zona).withDayOfMonth(1).atStartOfDay();

        return new PeriodoAnalitico(inicio, fin, agrupacion != null ? agrupacion : Agrupacion.DIA);
    }

    /** Días naturales cubiertos, ambos extremos incluidos. Nunca menor que 1. */
    public long dias() {
        return ChronoUnit.DAYS.between(desde.toLocalDate(), hasta.toLocalDate()) + 1;
    }

    /**
     * Período anterior equivalente: la misma cantidad de días, inmediatamente antes.
     * Se desplaza por días naturales para que comparar "este mes" contra "el mes pasado"
     * no dependa de la hora exacta en que se consultó.
     */
    public PeriodoAnalitico anterior() {
        long dias = dias();
        return new PeriodoAnalitico(desde.minusDays(dias), hasta.minusDays(dias), agrupacion);
    }

    public PeriodoAnalitico con(Agrupacion otraAgrupacion) {
        return new PeriodoAnalitico(desde, hasta, otraAgrupacion);
    }

    /**
     * Fecha representativa del bucket al que pertenece un día. La semana se identifica
     * por su lunes, criterio ISO, para que la serie sea estable entre años.
     */
    public LocalDate bucketDe(LocalDate fecha) {
        return switch (agrupacion) {
            case DIA -> fecha;
            case SEMANA -> fecha.minusDays(fecha.getDayOfWeek().getValue() - 1L);
            case MES -> fecha.withDayOfMonth(1);
            case ANIO -> fecha.withDayOfYear(1);
        };
    }

    public PeriodoDTO aDTO() {
        return PeriodoDTO.builder()
            .desde(desde)
            .hasta(hasta)
            .dias(dias())
            .agrupacion(agrupacion)
            .build();
    }
}
