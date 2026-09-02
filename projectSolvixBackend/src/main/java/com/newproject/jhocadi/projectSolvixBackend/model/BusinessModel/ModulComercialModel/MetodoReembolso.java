package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Forma en que se compensó al cliente. Solo aplica cuando hubo reembolso efectivo.
 */
public enum MetodoReembolso {
    EFECTIVO,
    TRANSFERENCIA,
    TARJETA,
    NOTA_CREDITO,
    CAMBIO_PRODUCTO
}
