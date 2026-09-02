package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Motivo de una devolución. Es un enum y no texto libre para que analytics
 * pueda agrupar devoluciones por causa sin depender de cómo se escribió la nota.
 */
public enum MotivoDevolucion {
    PRODUCTO_DEFECTUOSO,
    PRODUCTO_INCORRECTO,
    INSATISFACCION_CLIENTE,
    ERROR_EN_VENTA,
    GARANTIA,
    OTRO
}
