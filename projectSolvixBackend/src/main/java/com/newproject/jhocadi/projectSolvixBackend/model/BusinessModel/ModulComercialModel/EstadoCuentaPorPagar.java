package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Estado persistido de una cuenta por pagar (FASE 3.15.13).
 * {@code VENCIDA} no se persiste: se deriva en lectura ({@code vencida} boolean).
 */
public enum EstadoCuentaPorPagar {
    PENDIENTE,
    PARCIALMENTE_PAGADA,
    PAGADA,
    ANULADA
}
