package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Materializa notificaciones solo después del commit de la operación de negocio.
 * Si el workflow hace rollback, este listener no se ejecuta.
 */
@Component
public class OrdenServicioNotificacionListener {

    private static final Logger log = LoggerFactory.getLogger(OrdenServicioNotificacionListener.class);

    private final NotificationService notificationService;

    public OrdenServicioNotificacionListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrdenServicioNotificacionSolicitada(OrdenServicioNotificacionSolicitadaEvent event) {
        try {
            notificationService.publishDesdeOrden(
                event.tipo(),
                event.ordenServicioId(),
                event.cotizacionId(),
                event.cotizacionNumero());
        } catch (Throwable t) {
            // Best-effort: no debe revertir ni romper la respuesta HTTP del negocio.
            log.warn(
                "No se pudo materializar notificación {} OT {}: {}",
                event.tipo(),
                event.ordenServicioId(),
                t.toString());
        }
    }
}
