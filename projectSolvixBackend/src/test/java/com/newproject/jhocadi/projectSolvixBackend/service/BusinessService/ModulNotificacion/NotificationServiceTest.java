package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.EstadoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulNotificacion.NotificacionRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.EquipoService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.FirmaRecepcionTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.OrdenServicioService;

class NotificationServiceTest extends ComercialTestSupport {

    private static final String USUARIO = "admin-notif";

    @Autowired
    private NotificationService notificationService;
    @Autowired
    private NotificationTemplateCatalog catalog;
    @Autowired
    private NotificationTemplateRenderer renderer;
    @Autowired
    private OrdenServicioService ordenServicioService;
    @Autowired
    private EquipoService equipoService;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("catálogo contiene plantillas WHATSAPP para los 6 eventos")
    void catalogoPlantillasWhatsapp() {
        for (TipoEventoNotificacion tipo : TipoEventoNotificacion.values()) {
            assertThat(catalog.porEventoYCanal(tipo, CanalNotificacion.WHATSAPP))
                .as(tipo.name())
                .isPresent();
        }
        assertThat(catalog.canalesActivos()).containsExactly(CanalNotificacion.WHATSAPP);
    }

    @Test
    @DisplayName("renderer sustituye variables públicas y oculta claves técnicas")
    void rendererVariables() {
        NotificationEvent event = new NotificationEvent(
            TipoEventoNotificacion.ORDEN_RECIBIDA,
            1L,
            2L,
            null,
            "OS-2026-000001",
            "Ana Ruiz",
            "PORTATIL Dell XPS",
            "RECEPCIONADO",
            "RECEPCION",
            "http://localhost:4200/consulta/ot/abc",
            null,
            Map.of("costoInterno", "999", "notaCliente", "Urgente")
        );
        Map<String, String> vars = renderer.variablesDesdeEvento(event);
        assertThat(vars.get("clienteNombre")).isEqualTo("Ana Ruiz");
        assertThat(vars.get("ordenNumero")).isEqualTo("OS-2026-000001");
        assertThat(vars.get("urlConsulta")).contains("/consulta/ot/abc");
        assertThat(vars).doesNotContainKey("costoInterno");
        assertThat(vars.get("notaCliente")).isEqualTo("Urgente");

        String cuerpo = renderer.render(
            "Hola {{clienteNombre}} — {{ordenNumero}} {{urlConsulta}}",
            vars);
        assertThat(cuerpo).contains("Ana Ruiz").contains("OS-2026-000001").contains("/consulta/ot/abc");
        assertThat(cuerpo).doesNotContain("{{");
    }

    @Test
    @DisplayName("publish crea Notification PENDIENTE con OT/cliente/canal/plantilla")
    void publishCreaPendiente() {
        OrdenServicioResponseDTO orden = crearOrden();
        // Evento distinto al disparado en crear (ORDEN_RECIBIDA) para ejercitar publish() aislado.
        NotificationEvent event = new NotificationEvent(
            TipoEventoNotificacion.EQUIPO_LISTO,
            orden.getId(),
            orden.getClienteId(),
            null,
            orden.getNumero(),
            orden.getClienteNombre(),
            "COMPUTADOR Lenovo",
            "LISTO",
            "LISTO",
            notificationService.urlConsultaOt(
                ordenServicioService.buscarOFallar(orden.getId()).getTokenConsulta()),
            null,
            Map.of()
        );

        List<Notificacion> creadas = notificationService.publish(event);

        assertThat(creadas).hasSize(1);
        Notificacion n = creadas.get(0);
        assertThat(n.getEstado()).isEqualTo(EstadoNotificacion.PENDIENTE);
        assertThat(n.getCanal()).isEqualTo(CanalNotificacion.WHATSAPP);
        assertThat(n.getTipoEvento()).isEqualTo(TipoEventoNotificacion.EQUIPO_LISTO);
        assertThat(n.getOrdenServicioId()).isEqualTo(orden.getId());
        assertThat(n.getClienteId()).isEqualTo(orden.getClienteId());
        assertThat(n.getPlantillaCodigo()).isEqualTo("EQUIPO_LISTO_WA_V1");
        assertThat(n.getCuerpoRenderizado()).contains(orden.getNumero());
        assertThat(n.getUrlConsultaPublica()).startsWith("http://localhost:4200/consulta/ot/");
        assertThat(n.getCuerpoRenderizado()).doesNotContain("jwt").doesNotContain("password");
    }

    @Test
    @DisplayName("idempotencia: segundo publish no duplica")
    void idempotenciaBasica() {
        OrdenServicioResponseDTO orden = crearOrden();
        NotificationEvent event = new NotificationEvent(
            TipoEventoNotificacion.DIAGNOSTICO_COMPLETADO,
            orden.getId(),
            orden.getClienteId(),
            null,
            orden.getNumero(),
            "Cliente",
            "Equipo",
            "DIAGNOSTICADO",
            "DIAGNOSTICO",
            "http://localhost:4200/consulta/ot/tok",
            null,
            Map.of()
        );

        assertThat(notificationService.publish(event)).hasSize(1);
        assertThat(notificationService.publish(event)).isEmpty();
        assertThat(notificacionRepository.findByOrdenServicioIdAndTipoEvento(
            orden.getId(), TipoEventoNotificacion.DIAGNOSTICO_COMPLETADO)).hasSize(1);
    }

    @Test
    @DisplayName("crear OT dispara ORDEN_RECIBIDA tras commit")
    void crearOrdenDisparaEvento() {
        OrdenServicioResponseDTO orden = crearOrden();
        List<Notificacion> lista = notificacionRepository
            .findByOrdenServicioIdAndTipoEvento(orden.getId(), TipoEventoNotificacion.ORDEN_RECIBIDA);
        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).getEstado()).isEqualTo(EstadoNotificacion.PENDIENTE);
        assertThat(lista.get(0).getUrlConsultaPublica()).contains("/consulta/ot/");
    }

    @Test
    @DisplayName("completarDiagnostico dispara DIAGNOSTICO_COMPLETADO")
    void diagnosticoDisparaEvento() {
        OrdenServicioResponseDTO orden = crearOrden();
        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setDiagnostico("Fuente dañada");
        ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO);

        List<Notificacion> lista = notificacionRepository.findByOrdenServicioIdAndTipoEvento(
            orden.getId(), TipoEventoNotificacion.DIAGNOSTICO_COMPLETADO);
        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).getCuerpoRenderizado()).contains(orden.getNumero());
    }

    @Test
    @DisplayName("rollback de negocio no materializa notificación (AFTER_COMMIT)")
    void rollbackNoCreaNotificacion() {
        Cliente cliente = crearCliente("Cliente rollback notif");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        long antes = notificacionRepository.count();
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
            request.setClienteId(cliente.getId());
            request.setEquipoId(equipo.getId());
            FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
            ordenServicioService.crear(request, USUARIO);
            throw new RuntimeException("forzar-rollback-notif");
        })).hasMessageContaining("forzar-rollback-notif");

        assertThat(notificacionRepository.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("NotificationEvent exige tipo y orden")
    void eventValidacion() {
        assertThatThrownBy(() -> new NotificationEvent(
            null, 1L, null, null, null, null, null, null, null, null, null, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private OrdenServicioResponseDTO crearOrden() {
        Cliente cliente = crearCliente("Cliente notif " + System.nanoTime());
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        return ordenServicioService.crear(request, USUARIO);
    }

    private EquipoResponseDTO crearEquipo(Long clienteId) {
        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setClienteId(clienteId);
        request.setTipoEquipo(TipoEquipo.PORTATIL);
        request.setMarca("Dell");
        request.setModelo("XPS");
        return equipoService.crear(request);
    }
}
