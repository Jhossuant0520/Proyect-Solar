package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

/**
 * Calidad del dato que acompaña a cada métrica.
 *
 * <p>Existe para no confundir "el negocio vendió cero" con "no sé cuánto vendió".
 * Un 0% sin contexto es la forma más rápida de tomar una decisión equivocada.
 */
public enum EstadoMetrica {

    /** Hay operaciones y el valor es real y completo. */
    OK,

    /** Hay operaciones en el período, pero el resultado es efectivamente cero. */
    VALOR_CERO,

    /** No hay operaciones en el período: la métrica no se puede calcular. */
    SIN_DATOS,

    /**
     * Falta costo conocido. En margen: el valor se entrega pero queda subestimado. En rotación:
     * el valor viaja en {@code null} porque no se puede valorar el inventario histórico.
     */
    COSTO_INCOMPLETO,

    /** El período anterior no tiene base para comparar: la variación porcentual no existe. */
    SIN_BASE_DE_COMPARACION,

    /** La velocidad de venta es cero: no se pueden proyectar días de inventario. */
    SIN_VENTAS_RECIENTES,

    /** El producto es demasiado nuevo para juzgar su desempeño. */
    SIN_HISTORIAL_SUFICIENTE
}
