package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Ciclo de vida de una venta. Solo COMPLETADA consume inventario;
 * las devoluciones lo reintegran parcial o totalmente.
 */
public enum EstadoVenta {
    PENDIENTE,
    COMPLETADA,
    CANCELADA,
    DEVUELTA,
    PARCIALMENTE_DEVUELTA;

    public boolean permiteDevolucion() {
        return this == COMPLETADA || this == PARCIALMENTE_DEVUELTA;
    }

    /**
     * Estados en los que la venta ocurrió de verdad y cuenta como venta bruta.
     * Una venta devuelta sigue siendo una venta: su importe original no cambia y
     * la devolución se resta aparte para obtener la venta neta.
     */
    public boolean esVentaRealizada() {
        return this == COMPLETADA || this == PARCIALMENTE_DEVUELTA || this == DEVUELTA;
    }
}
