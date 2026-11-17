package com.newproject.jhocadi.projectComputerElectronicBackend.service.BusinessService.ModulNotificacion;

import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;

/**
 * Puente delgado desde Servicios → eventos de notificación.
 * Los servicios de OT solo publican señales; no conocen WhatsApp ni plantillas.
 */
@Component
public class NotificationEventBridge {

    private final ApplicationEventPublisher publisher;

    public NotificationEventBridge(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void solicitar(TipoEventoNotificacion tipo, Long ordenServicioId) {
        if (tipo == null || ordenServicioId == null) {
            return;
        }
        publisher.publishEvent(Objects.requireNonNull(
            OrdenServicioNotificacionSolicitadaEvent.deOrden(tipo, ordenServicioId)));
    }

    public void solicitarCotizacion(
            TipoEventoNotificacion tipo,
            Long ordenServicioId,
            Long cotizacionId,
            String cotizacionNumero) {
        if (tipo == null || ordenServicioId == null) {
            return;
        }
        publisher.publishEvent(Objects.requireNonNull(
            OrdenServicioNotificacionSolicitadaEvent.deCotizacion(
                tipo, ordenServicioId, cotizacionId, cotizacionNumero)));
    }
}
