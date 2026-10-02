package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;

/**
 * Señal de dominio publicada dentro de la TX de negocio.
 * El listener AFTER_COMMIT materializa {@link Notificacion} sin acoplar WhatsApp.
 */
public record OrdenServicioNotificacionSolicitadaEvent(
    TipoEventoNotificacion tipo,
    Long ordenServicioId,
    Long cotizacionId,
    String cotizacionNumero
) {
    public OrdenServicioNotificacionSolicitadaEvent {
        if (tipo == null || ordenServicioId == null) {
            throw new IllegalArgumentException("tipo y ordenServicioId son obligatorios");
        }
    }

    public static OrdenServicioNotificacionSolicitadaEvent deOrden(
            TipoEventoNotificacion tipo,
            Long ordenServicioId) {
        return new OrdenServicioNotificacionSolicitadaEvent(tipo, ordenServicioId, null, null);
    }

    public static OrdenServicioNotificacionSolicitadaEvent deCotizacion(
            TipoEventoNotificacion tipo,
            Long ordenServicioId,
            Long cotizacionId,
            String cotizacionNumero) {
        return new OrdenServicioNotificacionSolicitadaEvent(
            tipo, ordenServicioId, cotizacionId, cotizacionNumero);
    }
}
