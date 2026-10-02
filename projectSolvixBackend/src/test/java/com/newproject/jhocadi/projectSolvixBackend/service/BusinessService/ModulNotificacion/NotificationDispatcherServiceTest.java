package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulNotificacion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.CanalNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.EstadoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.Notificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion.TipoEventoNotificacion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulNotificacion.NotificacionRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.EquipoService;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.FirmaRecepcionTestSupport;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService.OrdenServicioService;

@Import(NotificationDispatcherServiceTest.FakeAdapterTestConfig.class)
class NotificationDispatcherServiceTest extends ComercialTestSupport {

    private static final String USUARIO = "admin-dispatch";

    @Autowired
    private NotificationDispatcherService dispatcher;
    @Autowired
    private NotificationChannelRegistry channelRegistry;
    @Autowired
    private ControllableFakeWhatsAppAdapter fakeWhatsApp;
    @Autowired
    private NotificacionRepository notificacionRepository;
    @Autowired
    private OrdenServicioService ordenServicioService;
    @Autowired
    private EquipoService equipoService;

    @BeforeEach
    void resetFake() {
        fakeWhatsApp.reset();
    }

    @Test
    @DisplayName("A/I: PENDIENTE → PROCESANDO → ENVIADA (fake éxito)")
    void pendienteAEnviada() {
        Notificacion n = notificacionPendienteDeOt();
        fakeWhatsApp.simularExitoConProviderId("wa-ext-001");

        NotificationDispatchResult result = dispatcher.dispatch(n.getId());

        assertThat(result.processed()).isTrue();
        assertThat(result.estado()).isEqualTo(EstadoNotificacion.ENVIADA);
        assertThat(result.adapterCodigo()).isEqualTo("FAKE_WHATSAPP_TEST");
        assertThat(result.sendResult().success()).isTrue();
        assertThat(result.sendResult().providerMessageId()).isEqualTo("wa-ext-001");

        Notificacion persisted = notificacionRepository.findById(n.getId()).orElseThrow();
        assertThat(persisted.getEstado()).isEqualTo(EstadoNotificacion.ENVIADA);
        assertThat(persisted.getFechaEnvio()).isNotNull();
        assertThat(persisted.getProveedorMensajeId()).isEqualTo("wa-ext-001");
        assertThat(persisted.getAdapterCodigo()).isEqualTo("FAKE_WHATSAPP_TEST");
        assertThat(persisted.getErrorResumen()).isNull();
        assertThat(fakeWhatsApp.getSendCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("B/J: PENDIENTE → PROCESANDO → FALLIDA (fake fallo)")
    void pendienteAFallida() {
        Notificacion n = notificacionPendienteDeOt();
        fakeWhatsApp.simularFallo("PROVIDER_REJECT", "número inválido");

        NotificationDispatchResult result = dispatcher.dispatch(n.getId());

        assertThat(result.processed()).isTrue();
        assertThat(result.estado()).isEqualTo(EstadoNotificacion.FALLIDA);
        assertThat(result.sendResult().success()).isFalse();
        assertThat(result.sendResult().errorCode()).isEqualTo("PROVIDER_REJECT");

        Notificacion persisted = notificacionRepository.findById(n.getId()).orElseThrow();
        assertThat(persisted.getEstado()).isEqualTo(EstadoNotificacion.FALLIDA);
        assertThat(persisted.getFechaEnvio()).isNull();
        assertThat(persisted.getErrorResumen()).contains("PROVIDER_REJECT");
        assertThat(persisted.getErrorResumen()).doesNotContain("Exception");
    }

    @Test
    @DisplayName("C: canal sin adapter → FALLIDA CANAL_SIN_ADAPTER (no ENVIADA)")
    void canalSinAdapter() {
        // EMAIL no tiene adapter (ni fake); materializamos notificación EMAIL a mano.
        OrdenServicioResponseDTO orden = crearOrden();
        Notificacion email = notificacionRepository.save(Notificacion.builder()
            .tipoEvento(TipoEventoNotificacion.ORDEN_RECIBIDA)
            .canal(CanalNotificacion.EMAIL)
            .estado(EstadoNotificacion.PENDIENTE)
            .plantillaCodigo("ORDEN_RECIBIDA_EMAIL_TEST")
            .ordenServicioId(orden.getId())
            .clienteId(orden.getClienteId())
            .cuerpoRenderizado("hola")
            .idempotencyKey("EMAIL_TEST:ot:" + orden.getId())
            .build());

        assertThat(channelRegistry.tieneAdapter(CanalNotificacion.EMAIL)).isFalse();

        NotificationDispatchResult result = dispatcher.dispatch(email.getId());

        assertThat(result.processed()).isTrue();
        assertThat(result.estado()).isEqualTo(EstadoNotificacion.FALLIDA);
        assertThat(result.sendResult().errorCode())
            .isEqualTo(NotificationDispatcherService.ERROR_CANAL_SIN_ADAPTER);
        assertThat(result.sendResult().errorMessage())
            .contains("No existe un adaptador configurado para el canal EMAIL");

        Notificacion persisted = notificacionRepository.findById(email.getId()).orElseThrow();
        assertThat(persisted.getEstado()).isEqualTo(EstadoNotificacion.FALLIDA);
        assertThat(persisted.getEstado()).isNotEqualTo(EstadoNotificacion.ENVIADA);
    }

    @Test
    @DisplayName("D: ENVIADA no se reprocesa")
    void enviadaNoReprocesa() {
        Notificacion n = notificacionPendienteDeOt();
        dispatcher.dispatch(n.getId());
        int sends = fakeWhatsApp.getSendCount();

        NotificationDispatchResult second = dispatcher.dispatch(n.getId());

        assertThat(second.skipped()).isTrue();
        assertThat(second.skipReason()).isEqualTo("YA_ENVIADA");
        assertThat(second.estado()).isEqualTo(EstadoNotificacion.ENVIADA);
        assertThat(fakeWhatsApp.getSendCount()).isEqualTo(sends);
    }

    @Test
    @DisplayName("E: CANCELADA no se procesa")
    void canceladaNoProcesa() {
        Notificacion n = notificacionPendienteDeOt();
        n.setEstado(EstadoNotificacion.CANCELADA);
        notificacionRepository.save(n);

        NotificationDispatchResult result = dispatcher.dispatch(n.getId());

        assertThat(result.skipped()).isTrue();
        assertThat(result.skipReason()).isEqualTo("CANCELADA");
        assertThat(fakeWhatsApp.getSendCount()).isZero();
    }

    @Test
    @DisplayName("F/L: doble dispatch concurrente → un solo claim/envío")
    void dobleProcesamientoConcurrente() throws Exception {
        Notificacion n = notificacionPendienteDeOt();
        fakeWhatsApp.simularExito();

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger processed = new AtomicInteger();
        AtomicInteger skipped = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                start.await();
                NotificationDispatchResult r = dispatcher.dispatch(n.getId());
                if (r.processed()) {
                    processed.incrementAndGet();
                } else if (r.skipped()) {
                    skipped.incrementAndGet();
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(5, TimeUnit.SECONDS)).isTrue();

        assertThat(processed.get()).isEqualTo(1);
        assertThat(skipped.get()).isEqualTo(threads - 1);
        assertThat(fakeWhatsApp.getSendCount()).isEqualTo(1);
        assertThat(notificacionRepository.findById(n.getId()).orElseThrow().getEstado())
            .isEqualTo(EstadoNotificacion.ENVIADA);
    }

    @Test
    @DisplayName("G: adapter lanza excepción → FALLIDA")
    void adapterExcepcionAFallida() {
        Notificacion n = notificacionPendienteDeOt();
        fakeWhatsApp.simularExcepcion();

        NotificationDispatchResult result = dispatcher.dispatch(n.getId());

        assertThat(result.estado()).isEqualTo(EstadoNotificacion.FALLIDA);
        assertThat(result.sendResult().errorCode())
            .isEqualTo(NotificationDispatcherService.ERROR_ADAPTER_EXCEPTION);
        assertThat(notificacionRepository.findById(n.getId()).orElseThrow().getErrorResumen())
            .contains("fake-adapter-boom");
    }

    @Test
    @DisplayName("H: fallo de notificación NO altera estado de OT")
    void falloNoAlteraOt() {
        OrdenServicioResponseDTO orden = crearOrden();
        assertThat(orden.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);

        Notificacion n = notificacionRepository
            .findByOrdenServicioIdAndTipoEvento(orden.getId(), TipoEventoNotificacion.ORDEN_RECIBIDA)
            .get(0);
        fakeWhatsApp.simularFallo("X", "fallo controlado");
        dispatcher.dispatch(n.getId());

        OrdenServicioResponseDTO despues = ordenServicioService.obtenerPorId(orden.getId());
        assertThat(despues.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
        assertThat(notificacionRepository.findById(n.getId()).orElseThrow().getEstado())
            .isEqualTo(EstadoNotificacion.FALLIDA);
    }

    @Test
    @DisplayName("K: providerMessageId opcional se persiste en éxito")
    void providerMessageIdOpcional() {
        Notificacion n = notificacionPendienteDeOt();
        fakeWhatsApp.simularExitoConProviderId("ext-99");
        dispatcher.dispatch(n.getId());
        assertThat(notificacionRepository.findById(n.getId()).orElseThrow().getProveedorMensajeId())
            .isEqualTo("ext-99");
    }

    @Test
    @DisplayName("M: FALLIDA no se reprocesa sin mecanismo de retry")
    void fallidaNoReprocesa() {
        Notificacion n = notificacionPendienteDeOt();
        fakeWhatsApp.simularFallo("E", "fail");
        dispatcher.dispatch(n.getId());
        fakeWhatsApp.reset();
        fakeWhatsApp.simularExito();

        NotificationDispatchResult second = dispatcher.dispatch(n.getId());

        assertThat(second.skipped()).isTrue();
        assertThat(second.skipReason()).isEqualTo("YA_FALLIDA");
        assertThat(fakeWhatsApp.getSendCount()).isZero();
        assertThat(notificacionRepository.findById(n.getId()).orElseThrow().getEstado())
            .isEqualTo(EstadoNotificacion.FALLIDA);
    }

    @Test
    @DisplayName("registry resuelve fake WHATSAPP en tests")
    void registryResuelveWhatsapp() {
        assertThat(channelRegistry.tieneAdapter(CanalNotificacion.WHATSAPP)).isTrue();
        assertThat(channelRegistry.resolve(CanalNotificacion.WHATSAPP).orElseThrow().codigo())
            .isEqualTo("FAKE_WHATSAPP_TEST");
    }

    private Notificacion notificacionPendienteDeOt() {
        OrdenServicioResponseDTO orden = crearOrden();
        List<Notificacion> lista = notificacionRepository.findByOrdenServicioIdAndTipoEvento(
            orden.getId(), TipoEventoNotificacion.ORDEN_RECIBIDA);
        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).getEstado()).isEqualTo(EstadoNotificacion.PENDIENTE);
        assertThat(lista.get(0).getCanal()).isEqualTo(CanalNotificacion.WHATSAPP);
        return lista.get(0);
    }

    private OrdenServicioResponseDTO crearOrden() {
        Cliente cliente = crearCliente("Cliente dispatch " + System.nanoTime());
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
        request.setMarca("HP");
        return equipoService.crear(request);
    }

    @TestConfiguration
    static class FakeAdapterTestConfig {
        @Bean
        ControllableFakeWhatsAppAdapter controllableFakeWhatsAppAdapter() {
            return new ControllableFakeWhatsAppAdapter();
        }
    }
}
