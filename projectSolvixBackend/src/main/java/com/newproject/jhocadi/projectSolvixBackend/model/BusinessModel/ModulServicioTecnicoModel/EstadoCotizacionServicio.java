package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

/**
 * Estado de la entidad CotizacionServicio (independiente del estado de la OT).
 */
public enum EstadoCotizacionServicio {
    BORRADOR,
    PENDIENTE_APROBACION,
    APROBADA,
    RECHAZADA,
    ANULADA;

    public boolean esEditable() {
        return this == BORRADOR;
    }

    public boolean esTerminalComercial() {
        return this == APROBADA || this == RECHAZADA || this == ANULADA;
    }
}
