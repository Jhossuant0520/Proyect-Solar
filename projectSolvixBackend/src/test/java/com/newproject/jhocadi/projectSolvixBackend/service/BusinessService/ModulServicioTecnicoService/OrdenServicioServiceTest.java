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
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RecepcionOrdenServicioResponseDTO;
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
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);

        OrdenServicioResponseDTO orden = ordenServicioService.crear(request, USUARIO_TEST);

        assertThat(orden.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
        assertThat(orden.getNumero()).matches("OS-\\d{4}-\\d{6}");
        assertThat(orden.getClienteId()).isEqualTo(cliente.getId());
        assertThat(orden.getEquipoId()).isEqualTo(equipo.getId());
        assertThat(orden.getProblemaReportado()).isEqualTo("No enciende");

        RecepcionOrdenServicioResponseDTO recepcion =
            ordenServicioService.obtenerRecepcion(orden.getId());
        assertThat(recepcion.getOrdenServicioId()).isEqualTo(orden.getId());
        assertThat(recepcion.isClienteConfirmo()).isTrue();
        assertThat(recepcion.getFirmaUrl())
            .startsWith("/api/v1/ordenes-servicio/recepciones/firmas/");
        assertThat(recepcion.getUsuarioResponsable()).isEqualTo(USUARIO_TEST);
        assertThat(recepcion.getFechaRecepcion()).isNotNull();
        assertThat(recepcion.getNombreCliente()).isEqualTo("Firmante Test");
    }

    @Test
    @DisplayName("D.2: crear OT sin firma de recepción → rechazo")
    void crearOrdenSinFirmaRecepcion() {
        Cliente cliente = crearCliente("Cliente sin firma");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        request.setClienteConfirmoRecepcion(true);
        request.setNombreFirmanteRecepcion("Alguien");

        assertThatThrownBy(() -> ordenServicioService.crear(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("firma");
    }

    @Test
    @DisplayName("D.2: crear OT sin confirmación de recepción → rechazo")
    void crearOrdenSinConfirmacionRecepcion() {
        Cliente cliente = crearCliente("Cliente sin confirm");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        request.setClienteConfirmoRecepcion(false);

        assertThatThrownBy(() -> ordenServicioService.crear(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("confirmar");
    }

    @Test
    @DisplayName("D.2: firma recepción no sobrescribe firma de entrega")
    void firmaRecepcionIndependienteDeEntrega() {
        OrdenServicioResponseDTO orden = avanzarHastaListo();
        RecepcionOrdenServicioResponseDTO recepcion =
            ordenServicioService.obtenerRecepcion(orden.getId());
        String firmaRecepcion = recepcion.getFirmaUrl();

        RegistrarEntregaResponseDTO entregaRes =
            ordenServicioService.registrarEntrega(orden.getId(), entregaValida(), USUARIO_TEST);

        assertThat(entregaRes.getEntrega().getFirmaUrl())
            .startsWith("/api/v1/ordenes-servicio/entregas/firmas/");
        assertThat(entregaRes.getEntrega().getFirmaUrl()).isNotEqualTo(firmaRecepcion);
        assertThat(ordenServicioService.obtenerRecepcion(orden.getId()).getFirmaUrl())
            .isEqualTo(firmaRecepcion);
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
    @DisplayName("Caso 1: RECEPCIONADO → guardar diagnóstico se rechaza; el estado no cambia ni se persiste nada")
    void completarDiagnosticoDesdeRecepcionadoSeRechaza() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        assertThat(orden.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);

        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setProblemaReportado("No enciende");
        req.setDiagnostico("Fuente dañada");

        assertThatThrownBy(() ->
                ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Inicia el diagnóstico");

        OrdenServicioResponseDTO despues = ordenServicioService.obtenerPorId(orden.getId());
        assertThat(despues.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
        assertThat(despues.getDiagnostico()).isNull();
        assertThat(ordenServicioService.listarHistorial(orden.getId())).isEmpty();
    }

    @Test
    @DisplayName("Caso 3: EN_DIAGNOSTICO → guardar diagnóstico → DIAGNOSTICADO; historial conserva ambos pasos")
    void historialConservaIniciarYCompletarDiagnostico() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);

        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setProblemaReportado("No enciende");
        req.setDiagnostico("Fuente dañada");
        req.setObservaciones("Dos pasos reales");

        TransicionOrdenServicioResponseDTO res =
            ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST);

        assertThat(res.getEstadoAnterior()).isEqualTo(EstadoOrdenServicio.EN_DIAGNOSTICO);
        assertThat(res.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.DIAGNOSTICADO);
        assertThat(res.getOrden().getDiagnostico()).isEqualTo("Fuente dañada");

        var historial = ordenServicioService.listarHistorial(orden.getId());
        assertThat(historial).hasSize(2);
        assertThat(historial).anySatisfy(h -> {
            assertThat(h.getEstadoAnterior()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
            assertThat(h.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.EN_DIAGNOSTICO);
        });
        assertThat(historial).anySatisfy(h -> {
            assertThat(h.getEstadoAnterior()).isEqualTo(EstadoOrdenServicio.EN_DIAGNOSTICO);
            assertThat(h.getEstadoNuevo()).isEqualTo(EstadoOrdenServicio.DIAGNOSTICADO);
        });
    }

    @Test
    @DisplayName("completarDiagnostico solo admite EN_DIAGNOSTICO (rechaza DIAGNOSTICADO)")
    void completarDiagnosticoFueraDeEnDiagnostico() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setDiagnostico("Board OK");
        ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST);

        assertThatThrownBy(() ->
                ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("EN_DIAGNOSTICO");
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.DIAGNOSTICADO);
    }

    @Test
    @DisplayName("Caso 4: completarDiagnostico rechaza trabajo realizado (no se persiste anticipado)")
    void completarDiagnosticoRechazaTrabajoRealizado() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        CompletarDiagnosticoRequestDTO req = new CompletarDiagnosticoRequestDTO();
        req.setDiagnostico("Board OK");
        req.setTrabajoRealizado("Soldadura ya hecha");

        assertThatThrownBy(() ->
                ordenServicioService.completarDiagnostico(orden.getId(), req, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("trabajo realizado");

        OrdenServicioResponseDTO despues = ordenServicioService.obtenerPorId(orden.getId());
        assertThat(despues.getEstado()).isEqualTo(EstadoOrdenServicio.EN_DIAGNOSTICO);
        assertThat(despues.getTrabajoRealizado()).isNull();
        assertThat(despues.getDiagnostico()).isNull();
    }

    @Test
    @DisplayName("Caso 4: RECEPCIONADO → PUT con diagnóstico o trabajo realizado se rechaza")
    void actualizarEnRecepcionadoRechazaDiagnosticoYTrabajo() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();

        OrdenServicioRequestDTO conDiagnostico = requestActualizacion(orden);
        conDiagnostico.setDiagnostico("Fuente dañada");
        assertThatThrownBy(() -> ordenServicioService.actualizar(orden.getId(), conDiagnostico))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("diagnóstico");

        OrdenServicioRequestDTO conTrabajo = requestActualizacion(orden);
        conTrabajo.setTrabajoRealizado("Cambio de fuente");
        assertThatThrownBy(() -> ordenServicioService.actualizar(orden.getId(), conTrabajo))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("trabajo realizado");

        OrdenServicioResponseDTO despues = ordenServicioService.obtenerPorId(orden.getId());
        assertThat(despues.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
        assertThat(despues.getDiagnostico()).isNull();
        assertThat(despues.getTrabajoRealizado()).isNull();
    }

    @Test
    @DisplayName("RECEPCIONADO → PUT sin tocar diagnóstico/trabajo sigue permitido (problema y observaciones)")
    void actualizarEnRecepcionadoPermiteCamposDeRecepcion() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        OrdenServicioRequestDTO req = requestActualizacion(orden);
        req.setProblemaReportado("No enciende ni da video");
        req.setObservaciones("Trae cargador");

        OrdenServicioResponseDTO actualizada = ordenServicioService.actualizar(orden.getId(), req);

        assertThat(actualizada.getProblemaReportado()).isEqualTo("No enciende ni da video");
        assertThat(actualizada.getObservaciones()).isEqualTo("Trae cargador");
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
    }

    @Test
    @DisplayName("Caso 4: crear OT con diagnóstico o trabajo realizado se rechaza (nace en RECEPCIONADO)")
    void crearConDiagnosticoOTrabajoSeRechaza() {
        Cliente cliente = crearCliente("Cliente OT técnica");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());

        OrdenServicioRequestDTO conDiagnostico = new OrdenServicioRequestDTO();
        conDiagnostico.setClienteId(cliente.getId());
        conDiagnostico.setEquipoId(equipo.getId());
        conDiagnostico.setDiagnostico("Fuente dañada");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(conDiagnostico);
        assertThatThrownBy(() -> ordenServicioService.crear(conDiagnostico, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("diagnóstico");

        OrdenServicioRequestDTO conTrabajo = new OrdenServicioRequestDTO();
        conTrabajo.setClienteId(cliente.getId());
        conTrabajo.setEquipoId(equipo.getId());
        conTrabajo.setTrabajoRealizado("Cambio de fuente");
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(conTrabajo);
        assertThatThrownBy(() -> ordenServicioService.crear(conTrabajo, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("trabajo realizado");
    }

    @Test
    @DisplayName("Trabajo realizado no es editable en EN_DIAGNOSTICO, DIAGNOSTICADO, COTIZADO ni PENDIENTE_APROBACION")
    void trabajoRealizadoNoEditableAntesDeReparacion() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        avanzar(orden.getId(), EstadoOrdenServicio.EN_DIAGNOSTICO);
        assertTrabajoRechazado(orden);

        CompletarDiagnosticoRequestDTO diag = new CompletarDiagnosticoRequestDTO();
        diag.setDiagnostico("Board OK");
        ordenServicioService.completarDiagnostico(orden.getId(), diag, USUARIO_TEST);
        assertTrabajoRechazado(orden);

        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.COTIZADO);
        assertTrabajoRechazado(orden);

        avanzarPorDominio(orden.getId(), EstadoOrdenServicio.PENDIENTE_APROBACION);
        assertTrabajoRechazado(orden);
    }

    @Test
    @DisplayName("Caso 5: EN_REPARACION → guardar trabajo realizado (PUT) está permitido")
    void trabajoRealizadoEditableEnReparacion() {
        OrdenServicioResponseDTO orden = avanzarHastaReparacion();
        OrdenServicioRequestDTO req = requestActualizacion(orden);
        req.setTrabajoRealizado("Cambio parcial de fuente");

        OrdenServicioResponseDTO actualizada = ordenServicioService.actualizar(orden.getId(), req);

        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrdenServicio.EN_REPARACION);
        assertThat(actualizada.getTrabajoRealizado()).isEqualTo("Cambio parcial de fuente");
    }

    @Test
    @DisplayName("Caso 6: no existe camino RECEPCIONADO → DIAGNOSTICADO sin pasar por EN_DIAGNOSTICO")
    void noHaySaltoRecepcionadoADiagnosticado() {
        assertThat(EstadoOrdenServicio.RECEPCIONADO.puedeTransicionarA(EstadoOrdenServicio.DIAGNOSTICADO))
            .isFalse();

        OrdenServicioResponseDTO orden = crearOrdenBasica();
        assertThatThrownBy(() -> avanzar(orden.getId(), EstadoOrdenServicio.DIAGNOSTICADO))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("no está permitida");
        assertThatThrownBy(() -> ordenServicioService.transicionarPorDominio(
                orden.getId(), EstadoOrdenServicio.DIAGNOSTICADO, null, null, USUARIO_TEST))
            .isInstanceOf(BusinessException.class);

        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getEstado())
            .isEqualTo(EstadoOrdenServicio.RECEPCIONADO);
        assertThat(ordenServicioService.listarHistorial(orden.getId())).isEmpty();
    }

    @Test
    @DisplayName("Reglas centralizadas: disponibilidad de diagnóstico y trabajo realizado por estado")
    void disponibilidadCamposTecnicosPorEstado() {
        assertThat(EstadoOrdenServicio.RECEPCIONADO.permiteDiagnostico()).isFalse();
        assertThat(EstadoOrdenServicio.EN_DIAGNOSTICO.permiteDiagnostico()).isTrue();
        assertThat(EstadoOrdenServicio.DIAGNOSTICADO.permiteDiagnostico()).isTrue();

        for (EstadoOrdenServicio e : List.of(
                EstadoOrdenServicio.RECEPCIONADO,
                EstadoOrdenServicio.EN_DIAGNOSTICO,
                EstadoOrdenServicio.DIAGNOSTICADO,
                EstadoOrdenServicio.COTIZADO,
                EstadoOrdenServicio.PENDIENTE_APROBACION,
                EstadoOrdenServicio.APROBADO)) {
            assertThat(e.permiteTrabajoRealizado()).as(e.name()).isFalse();
        }
        for (EstadoOrdenServicio e : List.of(
                EstadoOrdenServicio.EN_REPARACION,
                EstadoOrdenServicio.ESPERA_REPUESTO,
                EstadoOrdenServicio.REQUIERE_APROBACION_ADICIONAL,
                EstadoOrdenServicio.LISTO)) {
            assertThat(e.permiteTrabajoRealizado()).as(e.name()).isTrue();
        }
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
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        ordenServicioService.crear(request, USUARIO_TEST);

        EquipoResponseDTO otro = crearEquipo(cliente.getId());
        equipoService.desactivar(otro.getId());
        OrdenServicioRequestDTO bad = new OrdenServicioRequestDTO();
        bad.setClienteId(cliente.getId());
        bad.setEquipoId(otro.getId());
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(bad);
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
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(cross);
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

    /** Request de PUT que conserva la ficha actual; cada test cambia solo el campo que prueba. */
    private OrdenServicioRequestDTO requestActualizacion(OrdenServicioResponseDTO orden) {
        OrdenServicioRequestDTO req = new OrdenServicioRequestDTO();
        req.setClienteId(orden.getClienteId());
        req.setEquipoId(orden.getEquipoId());
        req.setProblemaReportado(orden.getProblemaReportado());
        req.setDiagnostico(orden.getDiagnostico());
        req.setTrabajoRealizado(orden.getTrabajoRealizado());
        req.setObservaciones(orden.getObservaciones());
        return req;
    }

    private void assertTrabajoRechazado(OrdenServicioResponseDTO orden) {
        OrdenServicioResponseDTO actual = ordenServicioService.obtenerPorId(orden.getId());
        OrdenServicioRequestDTO req = requestActualizacion(actual);
        req.setTrabajoRealizado("Trabajo anticipado");
        assertThatThrownBy(() -> ordenServicioService.actualizar(orden.getId(), req))
            .as("trabajo realizado en " + actual.getEstado())
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("trabajo realizado");
        assertThat(ordenServicioService.obtenerPorId(orden.getId()).getTrabajoRealizado()).isNull();
    }

    private OrdenServicioResponseDTO crearOrdenBasica() {
        Cliente cliente = crearCliente("Cliente OT base");
        EquipoResponseDTO equipo = crearEquipo(cliente.getId());
        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(cliente.getId());
        request.setEquipoId(equipo.getId());
        FirmaRecepcionTestSupport.aplicarFirmaRecepcion(request);
        return ordenServicioService.crear(request, USUARIO_TEST);
    }

    private EquipoResponseDTO crearEquipo(Long clienteId) {
        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setClienteId(clienteId);
        request.setTipoEquipo(TipoEquipo.COMPUTADOR);
        request.setMarca("Lenovo");
        return equipoService.crear(request);
    }

    @Test
    @DisplayName("listarPaginado: búsqueda parcial por fragmento de número OT")
    void listarPaginadoBusquedaParcialNumero() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        String fragmento = orden.getNumero().substring(orden.getNumero().length() - 3);

        var pagina = ordenServicioService.listarPaginado(fragmento, null, null, null, 0, 20);

        assertThat(pagina.getContenido()).extracting(OrdenServicioResponseDTO::getId)
            .contains(orden.getId());
        assertThat(pagina.getTamano()).isLessThanOrEqualTo(50);
    }

    @Test
    @DisplayName("listarPaginado: sin coincidencias y límite de página")
    void listarPaginadoSinResultadosYTope() {
        crearOrdenBasica();
        var vacia = ordenServicioService.listarPaginado("zzz-inexistente-999", null, null, null, 0, 20);
        assertThat(vacia.getContenido()).isEmpty();
        assertThat(vacia.getTotalElementos()).isZero();

        var tope = ordenServicioService.listarPaginado(null, null, null, null, 0, 500);
        assertThat(tope.getTamano()).isEqualTo(50);
    }
}
