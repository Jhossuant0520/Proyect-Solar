package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Tipos de movimiento de inventario. Cada tipo define su dirección de forma fija
 * para que el signo del movimiento nunca dependa de quien lo registra.
 */
public enum TipoMovimientoInventario {

    COMPRA(DireccionMovimiento.ENTRADA),
    VENTA(DireccionMovimiento.SALIDA),
    DEVOLUCION_VENTA(DireccionMovimiento.ENTRADA),
    DEVOLUCION_COMPRA(DireccionMovimiento.SALIDA),
    AJUSTE_ENTRADA(DireccionMovimiento.ENTRADA),
    AJUSTE_SALIDA(DireccionMovimiento.SALIDA),
    MERMA(DireccionMovimiento.SALIDA),
    CARGA_INICIAL(DireccionMovimiento.ENTRADA);

    private final DireccionMovimiento direccion;

    TipoMovimientoInventario(DireccionMovimiento direccion) {
        this.direccion = direccion;
    }

    public DireccionMovimiento getDireccion() {
        return direccion;
    }

    public boolean esEntrada() {
        return direccion == DireccionMovimiento.ENTRADA;
    }
}
