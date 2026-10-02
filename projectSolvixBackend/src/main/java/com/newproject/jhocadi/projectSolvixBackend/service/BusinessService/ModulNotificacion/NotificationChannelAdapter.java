package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;

/**
 * Contrato de canal de notificación. Implementaciones reales (WhatsApp, Email)
 * se añaden en fases posteriores sin tocar el dispatcher ni el workflow de OT.
 */
public interface NotificationChannelAdapter {

    /** Identificador estable del adapter (auditoría). */
    String codigo();

    CanalNotificacion canal();

    default boolean supports(CanalNotificacion canal) {
        return canal() == canal;
    }

    /**
     * Intenta el envío. No debe lanzar para fallos de negocio esperados:
     * preferir {@link NotificationSendResult#failure}.
     * Excepciones inesperadas las captura el dispatcher → FALLIDA.
     */
    NotificationSendResult send(Notificacion notificacion);
}
