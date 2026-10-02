package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion;

/**
 * Eventos de negocio notificables (FASE 3.15.9.1).
 * Catálogo cerrado: no cada transición menor genera evento.
 */
public enum TipoEventoNotificacion {
    ORDEN_RECIBIDA,
    DIAGNOSTICO_COMPLETADO,
    COTIZACION_DISPONIBLE,
    COTIZACION_ADICIONAL_DISPONIBLE,
    EQUIPO_LISTO,
    EQUIPO_ENTREGADO
}
