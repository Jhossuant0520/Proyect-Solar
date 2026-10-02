package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.EstadoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;

/**
 * Resultado del procesamiento por {@link NotificationDispatcherService}.
 */
public record NotificationDispatchResult(
    Long notificacionId,
    EstadoNotificacion estado,
    boolean processed,
    boolean skipped,
    String skipReason,
    String adapterCodigo,
    NotificationSendResult sendResult
) {
    public static NotificationDispatchResult processed(
            Notificacion n,
            String adapterCodigo,
            NotificationSendResult sendResult) {
        return new NotificationDispatchResult(
            n.getId(),
            n.getEstado(),
            true,
            false,
            null,
            adapterCodigo,
            sendResult);
    }

    public static NotificationDispatchResult skipped(
            Long id,
            EstadoNotificacion estado,
            String reason) {
        return new NotificationDispatchResult(
            id,
            estado,
            false,
            true,
            reason,
            null,
            null);
    }

    public static NotificationDispatchResult notFound(Long id) {
        return skipped(id, null, "NOTIFICACION_NO_ENCONTRADA");
    }
}
