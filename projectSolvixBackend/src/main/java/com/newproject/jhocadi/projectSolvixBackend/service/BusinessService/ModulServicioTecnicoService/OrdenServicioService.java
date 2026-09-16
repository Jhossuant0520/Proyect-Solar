package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.CambiarEstadoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.OrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.ClienteRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepuestoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.SecuenciaDocumentoService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrdenServicioService {

    private final OrdenServicioRepository ordenServicioRepository;
    private final OrdenServicioRepuestoRepository ordenServicioRepuestoRepository;
    private final ClienteRepository clienteRepository;
    private final EquipoService equipoService;
    private final SecuenciaDocumentoService secuenciaDocumentoService;

    @Transactional
    public OrdenServicioResponseDTO crear(OrdenServicioRequestDTO request, String usuario) {
        Cliente cliente = resolverClienteActivoParaTaller(request.getClienteId());
        Equipo equipo = equipoService.buscarOFallar(request.getEquipoId());
        validarEquipoDelCliente(cliente, equipo);
        if (!equipo.isActivo()) {
            throw new BusinessException("El equipo seleccionado está inactivo.");
        }

        LocalDateTime ahora = LocalDateTime.now();
        OrdenServicio orden = OrdenServicio.builder()
            .numero(secuenciaDocumentoService.siguienteNumero(TipoSecuencia.ORDEN_SERVICIO, ahora))
            .cliente(cliente)
            .equipo(equipo)
            .estado(EstadoOrdenServicio.RECEPCIONADO)
            .problemaReportado(textoOpcional(request.getProblemaReportado()))
            .diagnostico(textoOpcional(request.getDiagnostico()))
            .trabajoRealizado(textoOpcional(request.getTrabajoRealizado()))
            .observaciones(textoOpcional(request.getObservaciones()))
            .createdBy(usuario)
            .build();

        return OrdenServicioResponseDTO.fromEntity(ordenServicioRepository.save(orden));
    }

    @Transactional(readOnly = true)
    public List<OrdenServicioResponseDTO> listar(Long clienteId, Long equipoId, EstadoOrdenServicio estado) {
        List<OrdenServicio> ordenes;
        if (equipoId != null) {
            ordenes = ordenServicioRepository.findByEquipoIdOrderByFechaRecepcionDesc(equipoId);
        } else if (clienteId != null) {
            ordenes = ordenServicioRepository.findByClienteIdOrderByFechaRecepcionDesc(clienteId);
        } else if (estado != null) {
            ordenes = ordenServicioRepository.findByEstadoOrderByFechaRecepcionDesc(estado);
        } else {
            ordenes = ordenServicioRepository.findAllByOrderByFechaRecepcionDesc();
        }

        if (estado != null && (clienteId != null || equipoId != null)) {
            ordenes = ordenes.stream().filter(o -> o.getEstado() == estado).toList();
        }
        if (clienteId != null && equipoId != null) {
            ordenes = ordenes.stream()
                .filter(o -> o.getCliente().getId().equals(clienteId))
                .toList();
        }

        return ordenes.stream().map(OrdenServicioResponseDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public OrdenServicioResponseDTO obtenerPorId(Long id) {
        return OrdenServicioResponseDTO.fromEntity(buscarOFallar(id));
    }

    /**
     * Actualiza campos de taller sin cambiar estado.
     * No permite editar órdenes CERRADAS o CANCELADAS.
     * No permite cambiar cliente ni equipo (trazabilidad).
     */
    @Transactional
    public OrdenServicioResponseDTO actualizar(Long id, OrdenServicioRequestDTO request) {
        OrdenServicio orden = buscarOFallar(id);
        if (orden.getEstado().esTerminal()) {
            throw new BusinessException("No se puede editar una orden " + orden.getEstado() + ".");
        }
        if (!orden.getCliente().getId().equals(request.getClienteId())
                || !orden.getEquipo().getId().equals(request.getEquipoId())) {
            throw new BusinessException(
                "No se puede cambiar el cliente ni el equipo de una orden existente.");
        }

        orden.setProblemaReportado(textoOpcional(request.getProblemaReportado()));
        orden.setDiagnostico(textoOpcional(request.getDiagnostico()));
        orden.setTrabajoRealizado(textoOpcional(request.getTrabajoRealizado()));
        orden.setObservaciones(textoOpcional(request.getObservaciones()));
        return OrdenServicioResponseDTO.fromEntity(ordenServicioRepository.save(orden));
    }

    @Transactional
    public OrdenServicioResponseDTO cambiarEstado(Long id, CambiarEstadoOrdenServicioRequestDTO request) {
        OrdenServicio orden = buscarOFallar(id);
        EstadoOrdenServicio destino = request.getEstado();
        if (!orden.getEstado().puedeTransicionarA(destino)) {
            throw new BusinessException(
                "Transición no permitida: " + orden.getEstado() + " → " + destino + ".");
        }
        if (destino == EstadoOrdenServicio.CANCELADO
                && ordenServicioRepuestoRepository.existeConsumoNetoPendiente(orden.getId())) {
            throw new BusinessException(
                "No se puede cancelar la orden mientras existan repuestos consumidos sin devolver.");
        }
        orden.setEstado(destino);
        if (destino == EstadoOrdenServicio.ENTREGADO
                || destino == EstadoOrdenServicio.CERRADO
                || destino == EstadoOrdenServicio.CANCELADO) {
            orden.setFechaCierre(LocalDateTime.now());
        }
        return OrdenServicioResponseDTO.fromEntity(ordenServicioRepository.save(orden));
    }

    @Transactional(readOnly = true)
    public OrdenServicio buscarOFallar(Long id) {
        return ordenServicioRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden de servicio no encontrada."));
    }

    private void validarEquipoDelCliente(Cliente cliente, Equipo equipo) {
        if (equipo.getCliente() == null || !equipo.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException(
                "El equipo no pertenece al cliente indicado.");
        }
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
