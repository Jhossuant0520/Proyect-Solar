package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
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
    @DisplayName("consulta orden por id")
    void consultarOrden() {
        OrdenServicioResponseDTO creada = crearOrdenBasica();
        OrdenServicioResponseDTO obtenida = ordenServicioService.obtenerPorId(creada.getId());
        assertThat(obtenida.getNumero()).isEqualTo(creada.getNumero());
    }

    @Test
    @DisplayName("permite transición válida RECEPCIONADO → EN_DIAGNOSTICO")
    void transicionValida() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        CambiarEstadoOrdenServicioRequestDTO cambio = new CambiarEstadoOrdenServicioRequestDTO();
        cambio.setEstado(EstadoOrdenServicio.EN_DIAGNOSTICO);

        OrdenServicioResponseDTO actualizada = ordenServicioService.cambiarEstado(orden.getId(), cambio);
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrdenServicio.EN_DIAGNOSTICO);
    }

    @Test
    @DisplayName("rechaza transición inválida RECEPCIONADO → LISTO")
    void transicionInvalida() {
        OrdenServicioResponseDTO orden = crearOrdenBasica();
        CambiarEstadoOrdenServicioRequestDTO cambio = new CambiarEstadoOrdenServicioRequestDTO();
        cambio.setEstado(EstadoOrdenServicio.LISTO);

        assertThatThrownBy(() -> ordenServicioService.cambiarEstado(orden.getId(), cambio))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Transición no permitida");
    }

    @Test
    @DisplayName("no permite orden con equipo de otro cliente")
    void equipoDeOtroCliente() {
        Cliente clienteA = crearCliente("Cliente A");
        Cliente clienteB = crearCliente("Cliente B");
        EquipoResponseDTO equipoB = crearEquipo(clienteB.getId());

        OrdenServicioRequestDTO request = new OrdenServicioRequestDTO();
        request.setClienteId(clienteA.getId());
        request.setEquipoId(equipoB.getId());

        assertThatThrownBy(() -> ordenServicioService.crear(request, USUARIO_TEST))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("no pertenece al cliente");
    }

    @Test
    @DisplayName("enum EstadoOrdenServicio valida mapa de transiciones")
    void mapaTransiciones() {
        assertThat(EstadoOrdenServicio.RECEPCIONADO.puedeTransicionarA(EstadoOrdenServicio.EN_DIAGNOSTICO)).isTrue();
        assertThat(EstadoOrdenServicio.COTIZADO.puedeTransicionarA(EstadoOrdenServicio.APROBADO)).isTrue();
        assertThat(EstadoOrdenServicio.COTIZADO.puedeTransicionarA(EstadoOrdenServicio.CANCELADO)).isTrue();
        assertThat(EstadoOrdenServicio.ENTREGADO.puedeTransicionarA(EstadoOrdenServicio.CERRADO)).isTrue();
        assertThat(EstadoOrdenServicio.CERRADO.puedeTransicionarA(EstadoOrdenServicio.RECEPCIONADO)).isFalse();
        assertThat(EstadoOrdenServicio.EN_REPARACION.puedeTransicionarA(EstadoOrdenServicio.LISTO)).isTrue();
        assertThat(EstadoOrdenServicio.EN_REPARACION.puedeTransicionarA(EstadoOrdenServicio.ESPERA_REPUESTO)).isTrue();
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
