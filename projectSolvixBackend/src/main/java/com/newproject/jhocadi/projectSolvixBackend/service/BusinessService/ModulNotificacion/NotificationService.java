package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.EstadoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EtapaPublicaOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulNotificacion.NotificacionRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;

/**
 * Motor central de notificaciones (3.15.9.1).
 * Registra eventos → plantilla → Notification PENDIENTE. Sin envío externo.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final NotificacionRepository notificacionRepository;
    private final OrdenServicioRepository ordenServicioRepository;
    private final NotificationTemplateCatalog catalog;
    private final NotificationTemplateRenderer renderer;
    private final String frontendBaseUrl;

    public NotificationService(
            NotificacionRepository notificacionRepository,
            OrdenServicioRepository ordenServicioRepository,
            NotificationTemplateCatalog catalog,
            NotificationTemplateRenderer renderer,
            @Value("${solvix.frontend.base-url:http://localhost:4200}") String frontendBaseUrl) {
        this.notificacionRepository = notificacionRepository;
        this.ordenServicioRepository = ordenServicioRepository;
        this.catalog = catalog;
        this.renderer = renderer;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    /**
     * API principal: materializa notificaciones PENDIENTES para los canales activos.
     * Idempotente por {@code idempotency_key}.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<Notificacion> publish(NotificationEvent event) {
        List<Notificacion> creadas = new ArrayList<>();
        Map<String, String> variables = renderer.variablesDesdeEvento(event);
        variables.put("fecha", LocalDate.now().format(FECHA));

        for (CanalNotificacion canal : catalog.canalesActivos()) {
            Optional<NotificationTemplate> plantillaOpt =
                catalog.porEventoYCanal(event.tipo(), canal);
            if (plantillaOpt.isEmpty()) {
                continue;
            }
            NotificationTemplate plantilla = plantillaOpt.get();
            String idempotencyKey = construirIdempotencyKey(event, canal);
            if (notificacionRepository.existsByIdempotencyKey(idempotencyKey)) {
                log.debug("Notificación idempotente omitida: {}", idempotencyKey);
                continue;
            }

            String cuerpo = renderer.render(plantilla.cuerpo(), variables);
            String asunto = renderer.render(plantilla.asunto(), variables);
            Notificacion notificacion = Notificacion.builder()
                .tipoEvento(event.tipo())
                .canal(canal)
                .estado(EstadoNotificacion.PENDIENTE)
                .plantillaCodigo(plantilla.codigo())
                .ordenServicioId(event.ordenServicioId())
                .clienteId(event.clienteId())
                .cotizacionId(event.cotizacionId())
                .destinatarioRef(destinatarioRef(event, canal))
                .asunto(asunto.isBlank() ? null : asunto)
                .cuerpoRenderizado(cuerpo)
                .urlConsultaPublica(event.urlConsulta())
                .idempotencyKey(idempotencyKey)
                .build();

            try {
                creadas.add(notificacionRepository.save(notificacion));
            } catch (DataIntegrityViolationException dup) {
                log.debug("Carrera idempotente en notificación {}: {}", idempotencyKey, dup.toString());
            }
        }
        return creadas;
    }

    /**
     * Construye el evento desde la OT persistida y publica (uso del listener AFTER_COMMIT).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<Notificacion> publishDesdeOrden(
            TipoEventoNotificacion tipo,
            Long ordenServicioId,
            Long cotizacionId,
            String cotizacionNumero) {
        OrdenServicio orden = ordenServicioRepository.findById(ordenServicioId)
            .orElse(null);
        if (orden == null) {
            log.warn("No se publica notificación {}: OT {} no encontrada", tipo, ordenServicioId);
            return List.of();
        }
        return publish(construirEvento(tipo, orden, cotizacionId, cotizacionNumero));
    }

    public NotificationEvent construirEvento(
            TipoEventoNotificacion tipo,
            OrdenServicio orden,
            Long cotizacionId,
            String cotizacionNumero) {
        Cliente cliente = orden.getCliente();
        Equipo equipo = orden.getEquipo();
        EtapaPublicaOrdenServicio etapa = EtapaPublicaOrdenServicio.desde(orden.getEstado());
        return new NotificationEvent(
            tipo,
            orden.getId(),
            cliente != null ? cliente.getId() : null,
            cotizacionId,
            orden.getNumero(),
            cliente != null ? cliente.getNombre() : null,
            resumenEquipo(equipo),
            orden.getEstado() != null ? orden.getEstado().name() : null,
            etapa != null ? etapa.name() : null,
            urlConsultaOt(orden.getTokenConsulta()),
            cotizacionNumero,
            Map.of()
        );
    }

    public String urlConsultaOt(String tokenConsulta) {
        if (tokenConsulta == null || tokenConsulta.isBlank()) {
            return trimSlash(frontendBaseUrl) + "/consulta/ot";
        }
        return trimSlash(frontendBaseUrl) + "/consulta/ot/" + tokenConsulta.trim();
    }

    public static String construirIdempotencyKey(
            NotificationEvent event,
            CanalNotificacion canal) {
        StringBuilder key = new StringBuilder();
        key.append(event.tipo().name())
            .append(":ot:")
            .append(event.ordenServicioId())
            .append(':')
            .append(canal.name());
        if (event.cotizacionId() != null) {
            key.append(":cot:").append(event.cotizacionId());
        }
        return key.toString();
    }

    @Transactional(readOnly = true)
    public List<Notificacion> listarPorOrden(Long ordenServicioId) {
        return notificacionRepository.findByOrdenServicioIdOrderByFechaCreacionDesc(ordenServicioId);
    }

    private static String destinatarioRef(NotificationEvent event, CanalNotificacion canal) {
        // Solo referencia; el envío real resolverá el contacto en fases posteriores.
        return canal.name() + ":ot:" + event.ordenServicioId();
    }

    private static String resumenEquipo(Equipo equipo) {
        if (equipo == null) {
            return "";
        }
        String tipo = equipo.getTipoEquipo() != null ? equipo.getTipoEquipo().name() : "";
        String marca = equipo.getMarca() != null ? equipo.getMarca() : "";
        String modelo = equipo.getModelo() != null ? equipo.getModelo() : "";
        String base = (tipo + " " + marca + " " + modelo).trim().replaceAll("\\s+", " ");
        if (equipo.getReferenciaInterna() != null && !equipo.getReferenciaInterna().isBlank()) {
            return base.isBlank()
                ? equipo.getReferenciaInterna().trim()
                : base + " (" + equipo.getReferenciaInterna().trim() + ")";
        }
        return base;
    }

    private static String trimSlash(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:4200";
        }
        String trimmed = url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
