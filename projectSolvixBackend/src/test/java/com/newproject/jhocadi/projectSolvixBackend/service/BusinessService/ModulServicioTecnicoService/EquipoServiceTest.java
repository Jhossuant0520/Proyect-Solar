package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.ComercialTestSupport;

class EquipoServiceTest extends ComercialTestSupport {

    @Autowired
    private EquipoService equipoService;

    @Test
    @DisplayName("crea equipo con cliente obligatorio")
    void crearEquipo() {
        Cliente cliente = crearCliente("Taller SA");

        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setClienteId(cliente.getId());
        request.setTipoEquipo(TipoEquipo.PORTATIL);
        request.setMarca("Dell");
        request.setModelo("Latitude");
        request.setNumeroSerie("SN-001");

        EquipoResponseDTO creado = equipoService.crear(request);

        assertThat(creado.getId()).isNotNull();
        assertThat(creado.getClienteId()).isEqualTo(cliente.getId());
        assertThat(creado.getTipoEquipo()).isEqualTo(TipoEquipo.PORTATIL);
        assertThat(creado.isActivo()).isTrue();
    }

    @Test
    @DisplayName("consulta y actualiza equipo")
    void consultarYActualizar() {
        Cliente cliente = crearCliente("Cliente Equipo");
        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setClienteId(cliente.getId());
        request.setTipoEquipo(TipoEquipo.IMPRESORA);
        EquipoResponseDTO creado = equipoService.crear(request);

        EquipoResponseDTO obtenido = equipoService.obtenerPorId(creado.getId());
        assertThat(obtenido.getTipoEquipo()).isEqualTo(TipoEquipo.IMPRESORA);

        request.setTipoEquipo(TipoEquipo.IMPRESORA);
        request.setMarca("HP");
        EquipoResponseDTO actualizado = equipoService.actualizar(creado.getId(), request);
        assertThat(actualizado.getMarca()).isEqualTo("HP");
    }

    @Test
    @DisplayName("rechaza crear equipo sin cliente")
    void clienteObligatorio() {
        EquipoRequestDTO request = new EquipoRequestDTO();
        request.setTipoEquipo(TipoEquipo.OTRO);

        assertThatThrownBy(() -> equipoService.crear(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("cliente");
    }

    @Test
    @DisplayName("permite varios equipos sin serial del mismo cliente")
    void equiposSinSerial() {
        Cliente cliente = crearCliente("Sin serial");
        EquipoRequestDTO a = new EquipoRequestDTO();
        a.setClienteId(cliente.getId());
        a.setTipoEquipo(TipoEquipo.MONITOR);
        EquipoRequestDTO b = new EquipoRequestDTO();
        b.setClienteId(cliente.getId());
        b.setTipoEquipo(TipoEquipo.MONITOR);

        assertThat(equipoService.crear(a).getId()).isNotNull();
        assertThat(equipoService.crear(b).getId()).isNotNull();
        assertThat(equipoService.listar(cliente.getId(), true)).hasSize(2);
    }
}
