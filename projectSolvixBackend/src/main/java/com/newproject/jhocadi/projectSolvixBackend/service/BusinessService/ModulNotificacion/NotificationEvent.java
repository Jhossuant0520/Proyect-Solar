package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.util.Map;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;

/**
 * Payload tipado de un evento de negocio listo para materializar notificaciones.
 * Sin datos sensibles (JWT, costos, stock, firmas).
 */
public record NotificationEvent(
    TipoEventoNotificacion tipo,
    Long ordenServicioId,
    Long clienteId,
    Long cotizacionId,
    String ordenNumero,
    String clienteNombre,
    String equipoResumen,
    String estadoCodigo,
    String etapaPublica,
    String urlConsulta,
    String cotizacionNumero,
    Map<String, String> extras
) {
    public NotificationEvent {
        if (tipo == null) {
            throw new IllegalArgumentException("tipo de evento obligatorio");
        }
        if (ordenServicioId == null) {
            throw new IllegalArgumentException("ordenServicioId obligatorio");
        }
        extras = extras == null ? Map.of() : Map.copyOf(extras);
    }
}
