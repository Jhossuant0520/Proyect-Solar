package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.EstadoMetrica;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos.VariacionDTO;

/**
 * Aritmética común de analytics.
 *
 * <p>Todo el dinero es {@code BigDecimal} con dos decimales y redondeo HALF_UP, el mismo
 * criterio que usan ventas, compras y devoluciones. Las divisiones devuelven {@code null}
 * cuando el denominador es cero: quien llama decide qué estado corresponde, en lugar de
 * recibir un cero que se confunde con un resultado real.
 */
public final class CalculoAnalytics {

    public static final int ESCALA_DINERO = 2;
    public static final int ESCALA_PORCENTAJE = 2;
    public static final int ESCALA_RATIO = 4;
    public static final RoundingMode REDONDEO = RoundingMode.HALF_UP;

    private CalculoAnalytics() {
    }

    public static BigDecimal cero() {
        return BigDecimal.ZERO.setScale(ESCALA_DINERO, REDONDEO);
    }

    public static BigDecimal dinero(BigDecimal valor) {
        return valor == null ? cero() : valor.setScale(ESCALA_DINERO, REDONDEO);
    }

    public static BigDecimal nvl(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    public static long nvl(Long valor) {
        return valor == null ? 0L : valor;
    }

    /** División segura: {@code null} si el denominador es cero. */
    public static BigDecimal dividir(BigDecimal numerador, BigDecimal denominador, int escala) {
        if (denominador == null || denominador.signum() == 0) {
            return null;
        }
        return nvl(numerador).divide(denominador, escala, REDONDEO);
    }

    /** Porcentaje que representa {@code parte} sobre {@code total}. */
    public static BigDecimal porcentaje(BigDecimal parte, BigDecimal total) {
        BigDecimal ratio = dividir(parte, total, ESCALA_PORCENTAJE + 4);
        return ratio == null
            ? null
            : ratio.multiply(BigDecimal.valueOf(100)).setScale(ESCALA_PORCENTAJE, REDONDEO);
    }

    /**
     * Variación porcentual contra el período anterior: ((actual - anterior) / anterior) × 100.
     * Sin base anterior no hay variación posible, y así queda declarado en el estado.
     */
    public static VariacionDTO variacion(BigDecimal actual, BigDecimal anterior) {
        BigDecimal valorActual = dinero(actual);
        BigDecimal valorAnterior = dinero(anterior);

        if (valorAnterior.signum() == 0) {
            return VariacionDTO.builder()
                .actual(valorActual)
                .anterior(valorAnterior)
                .variacionPorcentual(null)
                .estado(valorActual.signum() == 0
                    ? EstadoMetrica.SIN_DATOS
                    : EstadoMetrica.SIN_BASE_DE_COMPARACION)
                .build();
        }

        return VariacionDTO.builder()
            .actual(valorActual)
            .anterior(valorAnterior)
            .variacionPorcentual(porcentaje(valorActual.subtract(valorAnterior), valorAnterior))
            .estado(EstadoMetrica.OK)
            .build();
    }

    /**
     * Estado de una métrica monetaria: distingue "no hubo operaciones" de "el resultado
     * fue cero" y de "hay líneas sin costo conocido".
     */
    public static EstadoMetrica estado(boolean hayOperaciones, boolean costoCompleto, BigDecimal valor) {
        if (!hayOperaciones) {
            return EstadoMetrica.SIN_DATOS;
        }
        if (!costoCompleto) {
            return EstadoMetrica.COSTO_INCOMPLETO;
        }
        return nvl(valor).signum() == 0 ? EstadoMetrica.VALOR_CERO : EstadoMetrica.OK;
    }
}
