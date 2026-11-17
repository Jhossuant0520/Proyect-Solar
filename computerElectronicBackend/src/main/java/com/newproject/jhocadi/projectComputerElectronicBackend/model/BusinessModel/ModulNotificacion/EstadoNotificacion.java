package com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulNotificacion;

/**
 * Estado del ciclo de vida de una {@link Notificacion} (no confundir con EstadoOrdenServicio).
 */
public enum EstadoNotificacion {
    PENDIENTE,
    PROCESANDO,
    ENVIADA,
    FALLIDA,
    CANCELADA
}
