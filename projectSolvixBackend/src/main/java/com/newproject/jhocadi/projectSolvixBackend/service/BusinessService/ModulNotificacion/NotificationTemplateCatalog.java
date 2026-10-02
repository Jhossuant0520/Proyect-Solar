package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;

/**
 * Catálogo en código de plantillas WHATSAPP (EMAIL preparado, sin envío).
 */
@Component
public class NotificationTemplateCatalog {

    private final Map<String, NotificationTemplate> porCodigo = new LinkedHashMap<>();
    private final Map<String, NotificationTemplate> porEventoCanal = new LinkedHashMap<>();

    public NotificationTemplateCatalog() {
        registrar(whatsapp(
            "ORDEN_RECIBIDA_WA_V1",
            TipoEventoNotificacion.ORDEN_RECIBIDA,
            "Hola {{clienteNombre}}, recibimos tu equipo ({{equipo}}) bajo la orden {{ordenNumero}}. "
                + "Puedes consultar el avance aquí: {{urlConsulta}}"));
        registrar(whatsapp(
            "DIAGNOSTICO_COMPLETADO_WA_V1",
            TipoEventoNotificacion.DIAGNOSTICO_COMPLETADO,
            "Hola {{clienteNombre}}, el diagnóstico de tu orden {{ordenNumero}} ({{equipo}}) ya está listo. "
                + "Consulta el estado: {{urlConsulta}}"));
        registrar(whatsapp(
            "COTIZACION_DISPONIBLE_WA_V1",
            TipoEventoNotificacion.COTIZACION_DISPONIBLE,
            "Hola {{clienteNombre}}, tienes una cotización ({{cotizacionNumero}}) para la orden {{ordenNumero}}. "
                + "Revísala aquí: {{urlConsulta}}"));
        registrar(whatsapp(
            "COTIZACION_ADICIONAL_DISPONIBLE_WA_V1",
            TipoEventoNotificacion.COTIZACION_ADICIONAL_DISPONIBLE,
            "Hola {{clienteNombre}}, hay una cotización adicional ({{cotizacionNumero}}) para tu orden {{ordenNumero}}. "
                + "Consulta los detalles: {{urlConsulta}}"));
        registrar(whatsapp(
            "EQUIPO_LISTO_WA_V1",
            TipoEventoNotificacion.EQUIPO_LISTO,
            "Hola {{clienteNombre}}, tu equipo ({{equipo}}) de la orden {{ordenNumero}} está listo para retiro. "
                + "Más información: {{urlConsulta}}"));
        registrar(whatsapp(
            "EQUIPO_ENTREGADO_WA_V1",
            TipoEventoNotificacion.EQUIPO_ENTREGADO,
            "Hola {{clienteNombre}}, registramos la entrega de tu equipo (orden {{ordenNumero}}). "
                + "Gracias por confiar en nosotros. Consulta: {{urlConsulta}}"));
    }

    public Optional<NotificationTemplate> porEventoYCanal(
            TipoEventoNotificacion evento,
            CanalNotificacion canal) {
        return Optional.ofNullable(porEventoCanal.get(clave(evento, canal)));
    }

    public Optional<NotificationTemplate> porCodigo(String codigo) {
        return Optional.ofNullable(porCodigo.get(codigo));
    }

    public Collection<NotificationTemplate> todas() {
        return List.copyOf(porCodigo.values());
    }

    /** Canales activos en 3.15.9.1 (solo materializa WHATSAPP; EMAIL queda listo para siguiente bloque). */
    public List<CanalNotificacion> canalesActivos() {
        return List.of(CanalNotificacion.WHATSAPP);
    }

    private void registrar(NotificationTemplate plantilla) {
        porCodigo.put(plantilla.codigo(), plantilla);
        porEventoCanal.put(clave(plantilla.evento(), plantilla.canal()), plantilla);
    }

    private static NotificationTemplate whatsapp(
            String codigo,
            TipoEventoNotificacion evento,
            String cuerpo) {
        return new NotificationTemplate(codigo, evento, CanalNotificacion.WHATSAPP, null, cuerpo);
    }

    private static String clave(TipoEventoNotificacion evento, CanalNotificacion canal) {
        return evento.name() + "|" + canal.name();
    }
}
