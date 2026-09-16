package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Documento de negocio que originó un movimiento de inventario.
 * Junto con referenciaId permite auditar el origen exacto de cada cambio de stock.
 */
public enum ReferenciaMovimiento {
    VENTA,
    COMPRA,
    DEVOLUCION_VENTA,
    DEVOLUCION_COMPRA,
    AJUSTE_MANUAL,
    CARGA_INICIAL,
    /** Orden de servicio técnico (consumo/devolución de repuestos). */
    ORDEN_SERVICIO
}
