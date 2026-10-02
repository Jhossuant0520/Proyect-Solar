package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;

/**
 * Plantilla inmutable (código / config). Sin CMS.
 */
public record NotificationTemplate(
    String codigo,
    TipoEventoNotificacion evento,
    CanalNotificacion canal,
    String asunto,
    String cuerpo
) {
    public NotificationTemplate {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("codigo de plantilla obligatorio");
        }
        if (evento == null || canal == null) {
            throw new IllegalArgumentException("evento y canal obligatorios");
        }
        if (cuerpo == null || cuerpo.isBlank()) {
            throw new IllegalArgumentException("cuerpo de plantilla obligatorio");
        }
        asunto = asunto == null ? "" : asunto;
    }
}
