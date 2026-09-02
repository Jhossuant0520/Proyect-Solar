package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

public enum EstadoCompra {
    PENDIENTE,
    COMPLETADA,
    CANCELADA,
    DEVUELTA,
    PARCIALMENTE_DEVUELTA;

    public boolean permiteDevolucion() {
        return this == COMPLETADA || this == PARCIALMENTE_DEVUELTA;
    }

    /**
     * Estados en los que la compra ocurrió de verdad y cuenta como compra bruta.
     * Una compra devuelta sigue siendo una compra: su importe original no cambia y
     * la devolución se resta aparte para obtener la compra neta. Una compra CANCELADA
     * nunca se completó, así que no genera compra bruta ni puede devolverse.
     */
    public boolean esCompraRealizada() {
        return this == COMPLETADA || this == PARCIALMENTE_DEVUELTA || this == DEVUELTA;
    }
}
