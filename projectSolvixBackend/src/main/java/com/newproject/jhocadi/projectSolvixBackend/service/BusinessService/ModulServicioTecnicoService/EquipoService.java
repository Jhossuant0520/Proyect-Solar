package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.util.EnumSet;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.EquipoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ClienteRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.EquipoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EquipoService {

    private final EquipoRepository equipoRepository;
    private final ClienteRepository clienteRepository;
    private final OrdenServicioRepository ordenServicioRepository;

    @Transactional
    public EquipoResponseDTO crear(EquipoRequestDTO request) {
        Cliente cliente = resolverClienteActivoParaTaller(request.getClienteId());
        Equipo equipo = new Equipo();
        aplicarDatos(equipo, request, cliente);
        equipo.setActivo(request.getActivo() == null || request.getActivo());
        return EquipoResponseDTO.fromEntity(equipoRepository.save(equipo));
    }

    @Transactional(readOnly = true)
    public List<EquipoResponseDTO> listar(Long clienteId, Boolean soloActivos) {
        List<Equipo> equipos;
        if (clienteId != null && Boolean.TRUE.equals(soloActivos)) {
            equipos = equipoRepository.findByClienteIdAndActivoTrueOrderByFechaRegistroDesc(clienteId);
        } else if (clienteId != null) {
            equipos = equipoRepository.findByClienteIdOrderByFechaRegistroDesc(clienteId);
        } else if (Boolean.TRUE.equals(soloActivos)) {
            equipos = equipoRepository.findByActivoTrueOrderByFechaRegistroDesc();
        } else {
            equipos = equipoRepository.findAllByOrderByFechaRegistroDesc();
        }
        return equipos.stream().map(EquipoResponseDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public EquipoResponseDTO obtenerPorId(Long id) {
        return EquipoResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional
    public EquipoResponseDTO actualizar(Long id, EquipoRequestDTO request) {
        Equipo equipo = buscarOFallar(id);
        Cliente cliente = resolverClienteActivoParaTaller(request.getClienteId());
        if (!cliente.getId().equals(equipo.getCliente().getId())
                && ordenServicioRepository.existsByEquipoId(equipo.getId())) {
            throw new BusinessException(
                "No se puede cambiar el cliente de un equipo que ya tiene órdenes de servicio.");
        }
        if (request.getActivo() != null && !request.getActivo() && equipo.isActivo()) {
            validarSinOrdenesActivas(equipo.getId());
        }
        aplicarDatos(equipo, request, cliente);
        if (request.getActivo() != null) {
            equipo.setActivo(request.getActivo());
        }
        return EquipoResponseDTO.fromEntity(equipoRepository.save(equipo));
    }

    @Transactional
    public EquipoResponseDTO desactivar(Long id) {
        Equipo equipo = buscarOFallar(id);
        if (!equipo.isActivo()) {
            return EquipoResponseDTO.fromEntity(equipo);
        }
        validarSinOrdenesActivas(equipo.getId());
        equipo.setActivo(false);
        return EquipoResponseDTO.fromEntity(equipoRepository.save(equipo));
    }

    private void validarSinOrdenesActivas(Long equipoId) {
        if (ordenServicioRepository.existsByEquipoIdAndEstadoNotIn(
                equipoId,
                EnumSet.of(EstadoOrdenServicio.CERRADO, EstadoOrdenServicio.CANCELADO))) {
            throw new BusinessException(
                "No se puede desactivar el equipo porque tiene una orden de servicio activa.");
        }
    }

    @Transactional(readOnly = true)
    public Equipo buscarOFallar(Long id) {
        return equipoRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipo no encontrado."));
    }

    private void aplicarDatos(Equipo equipo, EquipoRequestDTO request, Cliente cliente) {
        equipo.setCliente(cliente);
        equipo.setTipoEquipo(request.getTipoEquipo());
        equipo.setMarca(textoOpcional(request.getMarca()));
        equipo.setModelo(textoOpcional(request.getModelo()));
        equipo.setNumeroSerie(textoOpcional(request.getNumeroSerie()));
        equipo.setReferenciaInterna(textoOpcional(request.getReferenciaInterna()));
        equipo.setObservaciones(textoOpcional(request.getObservaciones()));
    }

    private Cliente resolverClienteActivoParaTaller(Long clienteId) {
        if (clienteId == null) {
            throw new BusinessException("El cliente es obligatorio.");
        }
        Cliente cliente = clienteRepository.findById(clienteId)
            .orElseThrow(() -> new BusinessException("El cliente indicado no existe."));
        if (!cliente.isActivo()) {
            throw new BusinessException("El cliente seleccionado está inactivo.");
        }
        if (cliente.esConsumidorFinal()) {
            throw new BusinessException(
                "El consumidor final del sistema no se usa como cliente de taller. Registra un cliente real.");
        }
        return cliente;
    }

    private String textoOpcional(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
