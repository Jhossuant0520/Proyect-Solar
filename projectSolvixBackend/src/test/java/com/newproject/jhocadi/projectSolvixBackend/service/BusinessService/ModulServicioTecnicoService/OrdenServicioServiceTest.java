package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarDiagnosticoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CompletarReparacionRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.HistorialEstadoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarEntregaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RegistrarNuevaFallaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.TransicionOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class OrdenServicioServiceTest extends ComercialTestSupport {

    @Autowired
    private OrdenServicioService ordenServicioService;

    @Autowired
    private EquipoService equipoService;

    @Test
    @DisplayName("crea orden con estado RECEPCIONADO y número OS-yyyy-######")
    void crearOrdenEstadoInicial() {
        Cliente cliente = crearCliente("Cliente OT");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());

        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setProblemaReportado("No enciende");

        OrdenServicioResponseDTO orden = ordenServicioService.crear(request, USUARIO_TEST);

        assertThat(orden.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
        assertThat(orden.getNumero()).matches("OS-\\d{4}-\\d{6}");
        assertThat(orden.getClienteId()).isEqualTo(cliente.getId());
        assertThat(orden.getEquipoId()).isEqualTo(equipo.getId());
        assertThat(orden.getProblemaReportado()).isEqualTo("No enciende");
    }

    @Test
    @DisplayName("RECEPCIONADO → EN_DIAGNOSTICO con motivo automático (sin motivo manual)")
    void iniciarDiagnosticoMotivoAutomatico() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        CambiarEstadoOrdenServicioRequestDTO cambio = new CambiarEstadoOrdenServicioRequestDTO();
        cambio.setNuevoEstado(EstadoOrdenServicio.EN_DIAGNOSTICO);

        TransicionOrdenServicioResponseDTO res =
            ordenServicioService.cambiarEstado(orden.getId(), cambio, USUARIO_TEST);

        assertThat(res.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.EN_DIAGNOSTICO);
        assertThat(res.getMotivo()).isEqualTo("Se inició el diagnóstico técnico.");
        assertThat(res.getUsuario()).isEqualTo(USUARIO_TEST);
        assertThat(res.getFechaCambio()).isNotNull();

        List<HistorialEstadoOrdenServicioResponseDTO> historial =
            ordenServicioService.listarHistorial(orden.getId());
        assertThat(historial).hasSize(1);
        assertThat(historial.get(0).getMotivo()).isEqualTo("Se inició el diagnóstico técnico.");
    }

    @Test
    @DisplayName("completarDiagnostico atómico: guarda ficha y pasa a DIAGNOSTICADO")
    void completarDiagnosticoAtomico() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);

        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setDiagnostico("Fuente dañada");
        req.setObservaciones("Requiere reemplazo");

        TransicionOrdenServicioResponseDTO res =
            ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST);

        assertThat(res.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.DIAGNOSTICADO);
        assertThat(res.getOrden().getDiagnostico()).isEqualTo("Fuente dañada");
        assertThat(res.getMotivo()).contains("diagnóstico técnico");
    }

    @Test
    @DisplayName("completarDiagnostico rechaza diagnóstico vacío")
    void completarDiagnosticoVacio() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);

        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setDiagnostico("   ");

        assertThatThrownBy(() ->
                ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("diagnóstico");
    }

    @Test
    @DisplayName("DIAGNOSTICADO → COTIZADO → PENDIENTE → APROBADO vía dominio cotización")
    void cotizadoYAprobadoSinMotivoManual() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Board OK");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);

        assertThatThrownBy(() -> avanzar(orden.getId(), EstadoOrdenServicio.COTIZADO))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("cotización");

        TransicionOrdenServicioResponseDTO cotizado = avanzarPorDominio(
            orden.getId(), EstadoOrdenServicio.COTIZADO);
        assertThat(cotizado.getMotivo()).isEqualTo("Se preparó la cotización inicial.");

        TransicionOrdenServicioResponseDTO pendiente = avanzarPorDominio(
            orden.getId(), EstadoOrdenServicio.PENDIENTE_APROBACION);
        assertThat(pendiente.getMotivo()).isEqualTo("Se presentó la cotización al cliente.");

        TransicionOrdenServicioResponseDTO aprobado = avanzarPorDominio(
            orden.getId(), EstadoOrdenServicio.APROBADO);
        assertThat(aprobado.getMotivo()).isEqualTo("El cliente aprobó la cotización.");
    }

    @Test
    @DisplayName("APROBADO → EN_REPARACION sin motivo manual")
    void iniciarReparacionSinMotivo() {
        OrdenServicioResponseDTO orden = avanzarHastaAprobado();
        TransicionOrdenServicioResponseDTO res = avanzar(orden.getId(), EstadoOrdenServicio.EN_REPARACION);
        assertThat(res.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.EN_REPARACION);
        assertThat(res.getMotivo()).contains("reparación");
    }

    @Test
    @DisplayName("completarReparacion atómico con trabajo realizado")
    void completarReparacionAtomico() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();

        CompletarReparacionRequestDTO req = new CompletarReparacionRequestDTO();
        req.setTrabajoRealizado("Se reemplazó la fuente");

        TransicionOrdenServicioResponseDTO res =
            ordenServicioService.completarReparacion(orden.getId(), req, USUARIO_TEST);

        assertThat(res.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.LISTO);
        assertThat(res.getOrden().getTrabajoRealizado()).isEqualTo("Se reemplazó la fuente");
        assertThat(res.getMotivo()).isEqualTo("Se completó la reparación.");
    }

    @Test
    @DisplayName("completarReparacion rechaza trabajo vacío")
    void completarReparacionSinTrabajo() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();
        CompletarReparacionRequestDTO req = new CompletarReparacionRequestDTO();
        req.setTrabajoRealizado("");

        assertThatThrownBy(() ->
                ordenServicioService.completarReparacion(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("trabajo realizado");
    }

    @Test
    @DisplayName("registrarNuevaFalla → REQUIERE_APROBACION_ADICIONAL")
    void registrarNuevaFalla() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();
        RegistrarNuevaFallaRequestDTO req = new RegistrarNuevaFallaRequestDTO();
        req.setNuevaFalla("Falla en disco adicional");
        req.setObservacion("No estaba en cotización");

        TransicionOrdenServicioResponseDTO res =
            ordenServicioService.registrarNuevaFalla(orden.getId(), req, USUARIO_TEST);

        assertThat(res.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL);
        assertThat(res.getMotivo()).contains("Falla en disco adicional");
        assertThat(res.getObservacion()).isEqualTo("No estaba en cotización");
    }

    @Test
    @DisplayName("nueva falla exige descripción")
    void nuevaFallaSinDescripcion() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();
        RegistrarNuevaFallaRequestDTO req = new RegistrarNuevaFallaRequestDTO();
        req.setNuevaFalla("  ");

        assertThatThrownBy(() ->
                ordenServicioService.registrarNuevaFalla(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("nueva falla");
    }

    @Test
    @DisplayName("cancelación exige motivo; rechaza cancelar en EN_REPARACION")
    void cancelacionReglas() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        CambiarEstadoOrdenServicioRequestDTO sinMotivo = new CambiarEstadoOrdenServicioRequestDTO();
        sinMotivo.setNuevoEstado(EstadoOrdenServicio.CANCELADO);

        assertThatThrownBy(() ->
                ordenServicioService.cambiarEstado(orden.getId(), sinMotivo, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("cancelación");

        TransicionOrdenServicioResponseDTO cancelada = ordenServicioService.cambiarEstado(
            orden.getId(),
            requestCambio(EstadoOrdenServicio.CANCELADO, "Cliente desistió"),
            USUARIO_TEST);
        assertThat(cancelada.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.CANCELADO);

        OrdenServicioResponseDTO enReparacion = avanzarHastaReparacion();
        assertThatThrownBy(() -> ordenServicioService.cambiarEstado(
                enReparacion.getId(),
                requestCambio(EstadoOrdenServicio.CANCELADO, "Intento tardío"),
                USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("no está permitida");
    }

    @Test
    @DisplayName("rechaza salto de estado inválido")
    void transicionInvalida() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        assertThatThrownBy(() -> avanzar(orden.getId(), EstadoOrdenServicio.LISTO))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("no está permitida");
    }

    @Test
    @DisplayName("enum EstadoOrdenServicio valida mapa 3.15.7")
    void mapaTransiciones() {
        assertThat(EstadoOrdenServicio.RECEPCIONADO.puedeTransicionarA(EstadoOrdenServicio.EN_DIAGNOSTICO)).isTrue();
        assertThat(EstadoOrdenServicio.EN_DIAGNOSTICO.puedeTransicionarA(EstadoOrdenServicio.DIAGNOSTICADO)).isTrue();
        assertThat(EstadoOrdenServicio.EN_DIAGNOSTICO.puedeTransicionarA(EstadoOrdenServicio.COTIZADO)).isFalse();
        assertThat(EstadoOrdenServicio.DIAGNOSTICADO.puedeTransicionarA(EstadoOrdenServicio.COTIZADO)).isTrue();
        assertThat(EstadoOrdenServicio.COTIZADO.puedeTransicionarA(EstadoOrdenServicio.PENDIENTE_APROBACION)).isTrue();
        assertThat(EstadoOrdenServicio.PENDIENTE_APROBACION.puedeTransicionarA(EstadoOrdenServicio.APROBADO)).isTrue();
        assertThat(EstadoOrdenServicio.PENDIENTE_APROBACION.puedeTransicionarA(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL)).isTrue();
        assertThat(EstadoOrdenServicio.EN_REPARACION.puedeTransicionarA(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL)).isTrue();
        assertThat(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL.puedeTransicionarA(EstadoOrdenServicio.PENDIENTE_APROBACION)).isTrue();
        assertThat(EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL.puedeTransicionarA(EstadoOrdenServicio.EN_REPARACION)).isFalse();
        assertThat(EstadoOrdenServicio.EN_REPARACION.puedeTransicionarA(EstadoOrdenServicio.CANCELADO)).isFalse();
        assertThat(EstadoOrdenServicio.APROBADO.puedeTransicionarA(EstadoOrdenServicio.CANCELADO)).isTrue();
        assertThat(EstadoOrdenServicio.requiereDominioCotizacion(
            EstadoOrdenServicio.DIAGNOSTICADO, EstadoOrdenServicio.COTIZADO)).isTrue();
    }

    @Test
    @DisplayName("historial orden desc; OT terminal no reabre")
    void historialYTerminal() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("OK");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);

        List<HistorialEstadoOrdenServicioResponseDTO> historial =
            ordenServicioService.listarHistorial(orden.getId());
        assertThat(historial).hasSize(2);
        assertThat(historial.get(0).getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.DIAGNOSTICADO);

        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.COTIZADO);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.PENDIENTE_APROBACION);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.APROBADO);
        ordenServicioService.cambiarEstado(
            orden.getId(),
            requestCambio(EstadoOrdenServicio.CANCELADO, "Cancela"),
            USUARIO_TEST);

        assertThatThrownBy(() -> avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("CANCELADO");
    }

    @Test
    @DisplayName("equipo inactivo / otro cliente / OT activa en desactivar")
    void reglasEquipo() {
        Cliente cliente = crearCliente("Cliente activo OT");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        ordenServicioService.crear(request, USUARIO_TEST);

        EquipoResponseDTO otro = crearEquipo(cliente.getId());
        equipoService.desactivar(otro.getId());
        OrdenServicioRequestDTO bad = new OrdenServicioRequestDTO();
        bad.setClienteId(cliente.getId());
        bad.setEquipoId(otro.getId());
        assertThatThrownBy(() -> ordenServicioService.crear(bad, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("inactivo");

        assertThatThrownBy(() -> equipoService.desactivar(equipo.getId()))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("orden de servicio activa");

        Cliente clienteB = crearCliente("Cliente B");
        EquipoResponseDTO equipoB = crearEquipo(clienteB.getId());
        OrdenServicioRequestDTO cross = new OrdenServicioRequestDTO();
        cross.setClienteId(cliente.getId());
        cross.setEquipoId(equipoB.getId());
        assertThatThrownBy(() -> ordenServicioService.crear(cross, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("no pertenece al cliente");
    }

    @Test
    @DisplayName("registrarEntrega desde LISTO → CERRADO con historial ENTREGADO y CERRADO")
    void registrarEntregaExitosa() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        RegistrarEntregaRequestDTO req = entregaValida();

        RegistrarEntregaResponseDTO res =
            ordenServicioService.registrarEntrega(orden.getId(), req, USUARIO_TEST);

        assertThat(res.getOrden().getEstado()).isEqualTo(EstadoOrdenServicio.CERRADO);
        assertThat(res.getEntrega().getOrdenServicioId()).isEqualTo(orden.getId());
        assertThat(res.getEntrega().isClienteConfirmo()).isTrue();
        assertThat(res.getEntrega().getFirmaUrl()).startsWith("/api/v1/ordenes-servicio/entregas/firmas/");
        assertThat(res.getEntrega().getUsuarioResponsable()).isEqualTo(USUARIO_TEST);

        List<HistorialEstadoOrdenServicioResponseDTO> historial =
            ordenServicioService.listarHistorial(orden.getId());
        assertThat(historial.stream().map(HistorialEstadoOrdenServicioResponseDTO::getEstadoNuevo))
            .contains(EstadoOrdenServicio.ENTREGADO, EstadoOrdenServicio.CERRADO);
        assertThat(historial.stream()
                .filter(h -> h.getEstadoNuevo() == EstadoOrdenServicio.ENTREGADO)
                .findFirst().orElseThrow().getMotivo())
            .isEqualTo("Se registró la entrega del equipo.");
        assertThat(historial.stream()
                .filter(h -> h.getEstadoNuevo() == EstadoOrdenServicio.CERRADO)
                .findFirst().orElseThrow().getMotivo())
            .isEqualTo("Se cerró la orden después de registrar la entrega.");
    }

    @Test
    @DisplayName("registrarEntrega rechaza desde EN_REPARACION")
    void registrarEntregaDesdeReparacion() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();
        assertThatThrownBy(() ->
                ordenServicioService.registrarEntrega(orden.getId(), entregaValida(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("LISTO");
    }

    @Test
    @DisplayName("registrarEntrega rechaza sin confirmación del cliente")
    void registrarEntregaSinConfirmacion() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        RegistrarEntregaRequestDTO req = entregaValida();
        req.setClienteConfirmo(false);

        assertThatThrownBy(() ->
                ordenServicioService.registrarEntrega(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("confirmar");
    }

    @Test
    @DisplayName("registrarEntrega rechaza sin firma")
    void registrarEntregaSinFirma() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        RegistrarEntregaRequestDTO req = entregaValida();
        req.setFirmaBase64("   ");

        assertThatThrownBy(() ->
                ordenServicioService.registrarEntrega(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("firma");
    }

    @Test
    @DisplayName("registrarEntrega rechaza segunda entrega")
    void registrarEntregaDuplicada() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        ordenServicioService.registrarEntrega(orden.getId(), entregaValida(), USUARIO_TEST);

        assertThatThrownBy(() ->
                ordenServicioService.registrarEntrega(orden.getId(), entregaValida(), USUARIO_TEST))
            .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("OT cerrada tras entrega no se puede actualizar")
    void otCerradaNoActualiza() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        ordenServicioService.registrarEntrega(orden.getId(), entregaValida(), USUARIO_TEST);

        OrdenServicioRequestDTO update = new OrdenServicioRequestDTO();
        update.setClienteId(orden.getClienteId());
        update.setEquipoId(orden.getEquipoId());
        update.setObservaciones("Intento tardío");

        assertThatThrownBy(() -> ordenServicioService.actualizar(orden.getId(), update))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("CERRADO");
    }

    private OrdenServicioResponseDTO avanzarHastaAprobado() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Falla detectada");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.COTIZADO);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.PENDIENTE_APROBACION);
        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.APROBADO);
        return ordenServicioService.obtenerPorId(orden.getId());
    }

    private OrdenServicioResponseDTO avanzarHastaReparacion() {
        OrdenServicioResponseDTO orden = avanzarHastaAprobado();
        return avanzar(orden.getId(), EstadoOrdenServicio.EN_REPARACION).getOrden();
    }

    private OrdenServicioResponseDTO avanzarHastaListo() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();
        CompletarReparacionRequestDTO req = new CompletarReparacionRequestDTO();
        req.setTrabajoRealizado("Reparación completada");
        return ordenServicioService.completarReparacion(orden.getId(), req, USUARIO_TEST).getOrden();
    }

    private RegistrarEntregaRequestDTO entregaValida() {
        RegistrarEntregaRequestDTO req = new RegistrarEntregaRequestDTO();
        req.setClienteConfirmo(true);
        req.setNombreCliente("Juan Pérez");
        req.setDocumentoCliente("123456");
        // PNG 1x1 válido
        req.setFirmaBase64(
            "data:image/png;base64,"
                + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        req.setObservaciones("Entrega en mostrador");
        return req;
    }

    private TransicionOrdenServicioResponseDTO avanzar(Long id, EstadoOrdenServicio destino) {
        CambiarEstadoOrdenServicioRequestDTO cambio = new CambiarEstadoOrdenServicioRequestDTO();
        cambio.setNuevoEstado(destino);
        return ordenServicioService.cambiarEstado(id, cambio, USUARIO_TEST);
    }

    private TransicionOrdenServicioResponseDTO avanzarPorDominio(Long id, EstadoOrdenServicio destino) {
        return ordenServicioService.transicionarPorDominio(id, destino, null, null, USUARIO_TEST);
    }

    private CambiarEstadoOrdenServicioRequestDTO requestCambio(EstadoOrdenServicio estado, String motivo) {
        CambiarEstadoOrdenServicioRequestDTO cambio = new CambiarEstadoOrdenServicioRequestDTO();
        cambio.setNuevoEstado(estado);
        cambio.setMotivo(motivo);
        return cambio;
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente OT base");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        return ordenServicioService.crear(request, USUARIO_TEST);
    }

    private EquipoResponseDTO crearEquipo(Long clienteId) {
        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setClienteId(clienteId);
        request.setTipoEquipo(TipoEquipo.COMPUTADOR);
        request.setMarca("Lenovo");
        return equipoService.crear(request);
    }
}
