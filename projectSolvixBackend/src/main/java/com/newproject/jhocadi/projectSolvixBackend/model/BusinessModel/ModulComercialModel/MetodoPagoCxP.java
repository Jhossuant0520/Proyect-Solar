package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Medio de abono a una CxP. Sin {@code CREDITO} (no tiene sentido pagar una deuda a crédito).
 */
public enum MetodoPagoCxP {
    EFECTIVO,
    TRANSFERENCIA,
    TARJETA,
    OTRO
}
