package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

public enum EstadoCotizacionComercial {
    BORRADOR,
    PENDIENTE_APROBACION,
    APROBADA,
    RECHAZADA,
    ANULADA;

    public boolean esEditable() {
        return this == BORRADOR || this == PENDIENTE_APROBACION;
    }
}
