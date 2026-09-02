package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Motivo de una devolución a proveedor.
 *
 * <p>Es un enum propio y no se reutiliza {@link MotivoDevolucion}: las causas de devolver
 * mercancía a un proveedor no son las mismas que las de un cliente que devuelve una compra
 * (no existe aquí la insatisfacción del cliente, y sí el exceso de pedido o el vencimiento).
 */
public enum MotivoDevolucionCompra {
    PRODUCTO_DEFECTUOSO,
    PRODUCTO_INCORRECTO,
    EXCESO_DE_PEDIDO,
    PRODUCTO_VENCIDO,
    ERROR_EN_COMPRA,
    GARANTIA,
    OTRO
}
