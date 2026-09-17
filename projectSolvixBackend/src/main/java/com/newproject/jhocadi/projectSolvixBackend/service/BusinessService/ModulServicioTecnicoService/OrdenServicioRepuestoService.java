package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulServicioTecnicoService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.ConsumirRepuestoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.DevolverRepuestoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos.RepuestoOrdenServicioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicioRepuesto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo.OrdenServicioRepuestoRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.InventarioService;

import lombok.RequiredArgsConstructor;

/**
 * Repuestos de OT. Planificar no mueve stock; consumir/devolver pasan por InventarioService.
 */
@Service
@RequiredArgsConstructor
public class OrdenServicioRepuestoService {

    private static final Set<EstadoOrdenServicio> ESTADOS_PLANIFICAR = EnumSet.of(
        EstadoOrdenServicio.RECEPCIONADO,
        EstadoOrdenServicio.EN_DIAGNOSTICO,
        EstadoOrdenServicio.COTIZADO,
        EstadoOrdenServicio.APROBADO,
        EstadoOrdenServicio.EN_REPARACION,
        EstadoOrdenServicio.ESPERA_REPUESTO);

    /** Consumo físico solo con uso confirmado en reparación. */
    private static final Set<EstadoOrdenServicio> ESTADOS_CONSUMIR = EnumSet.of(
        EstadoOrdenServicio.EN_REPARACION,
        EstadoOrdenServicio.ESPERA_REPUESTO);

    private static final Set<EstadoOrdenServicio> ESTADOS_DEVOLVER = EnumSet.of(
        EstadoOrdenServicio.EN_REPARACION,
        EstadoOrdenServicio.ESPERA_REPUESTO,
        EstadoOrdenServicio.LISTO,
        EstadoOrdenServicio.ENTREGADO);

    private final OrdenServicioRepuestoRepository repuestoRepository;
    private final OrdenServicioService ordenServicioService;
    private final ProductoRepository productoRepository;
    private final InventarioService inventarioService;

    @Transactional(readOnly = true)
    public List<RepuestoOrdenServicioResponseDTO> listar(Long ordenId) {
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        return repuestoRepository.findByOrdenServicioIdOrderByFechaRegistroAsc(ordenId).stream()
            .map(linea -> toResponse(linea, orden))
            .toList();
    }

    @Transactional
    public RepuestoOrdenServicioResponseDTO planificar(
            Long ordenId,
            RepuestoOrdenServicioRequestDTO request) {
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        validarPuedePlanificar(orden);

        if (request.getProductoId() == null) {
            throw new BusinessException("El producto es obligatorio.");
        }
        Producto producto = buscarProductoActivo(request.getProductoId());
        int cantidad = request.getCantidadPlanificada();

        OrdenServicioRepuesto linea = OrdenServicioRepuesto.builder()
            .ordenServicio(orden)
            .producto(producto)
            .productoNombre(producto.getNombre())
            .cantidadPlanificada(cantidad)
            .cantidadConsumida(0)
            .cantidadDevuelta(0)
            .costoUnitario(null)
            .costoConocido(false)
            .anulado(false)
            .build();

        return toResponse(repuestoRepository.save(linea), orden);
    }

    @Transactional
    public RepuestoOrdenServicioResponseDTO actualizarPlanificacion(
            Long ordenId,
            Long repuestoId,
            RepuestoOrdenServicioRequestDTO request) {
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        OrdenServicioRepuesto linea = buscarLinea(ordenId, repuestoId);
        validarPuedePlanificar(orden);
        if (linea.isAnulado()) {
            throw new BusinessException("No se puede editar una línea de repuesto anulada.");
        }
        if (request.getProductoId() != null
                && !request.getProductoId().equals(linea.getProducto().getId())) {
            throw new BusinessException("No se puede cambiar el producto de una línea existente.");
        }

        int nuevaPlanificada = request.getCantidadPlanificada();
        int neta = linea.cantidadNetaConsumida();
        if (nuevaPlanificada < neta) {
            throw new BusinessException(
                "La cantidad planificada no puede ser menor que el consumo neto ("
                    + neta + ").");
        }

        linea.setCantidadPlanificada(nuevaPlanificada);
        return toResponse(repuestoRepository.save(linea), orden);
    }

    /**
     * Anula lógicamente una línea sin consumo neto.
     * No genera movimiento de inventario.
     */
    @Transactional
    public RepuestoOrdenServicioResponseDTO anular(Long ordenId, Long repuestoId) {
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        OrdenServicioRepuesto linea = buscarLinea(ordenId, repuestoId);
        validarPuedePlanificar(orden);

        if (linea.isAnulado()) {
            throw new BusinessException("La línea de repuesto ya está anulada.");
        }
        if (linea.cantidadNetaConsumida() > 0) {
            throw new BusinessException(
                "No se puede anular una línea con consumo neto. Devuelve el repuesto primero.");
        }

        linea.setAnulado(true);
        return toResponse(repuestoRepository.save(linea), orden);
    }

    @Transactional
    public RepuestoOrdenServicioResponseDTO consumir(
            Long ordenId,
            Long repuestoId,
            ConsumirRepuestoRequestDTO request,
            String usuario) {
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        OrdenServicioRepuesto linea = buscarLinea(ordenId, repuestoId);
        validarPuedeConsumir(orden, linea);

        int cantidad = request.getCantidad();
        int pendiente = linea.getCantidadPlanificada() - linea.cantidadNetaConsumida();
        if (cantidad > pendiente) {
            throw new BusinessException(
                "La cantidad consumida supera la cantidad planificada. Disponible: " + pendiente + ".");
        }

        if (linea.getCantidadConsumida() == 0) {
            BigDecimal snapshot = linea.getProducto().getCostoActual();
            linea.setCostoUnitario(snapshot);
            linea.setCostoConocido(snapshot != null);
        }

        Producto producto = linea.getProducto();
        inventarioService.registrarMovimiento(
            producto,
            TipoMovimientoInventario.CONSUMO_SERVICIO,
            cantidad,
            ReferenciaMovimiento.ORDEN_SERVICIO,
            orden.getId(),
            linea.getCostoUnitario(),
            usuario,
            "Consumo OT " + orden.getNumero() + " repuesto #" + linea.getId());

        linea.setCantidadConsumida(linea.getCantidadConsumida() + cantidad);
        linea.setFechaUltimoConsumo(LocalDateTime.now());
        return toResponse(repuestoRepository.save(linea), orden);
    }

    @Transactional
    public RepuestoOrdenServicioResponseDTO devolver(
            Long ordenId,
            Long repuestoId,
            DevolverRepuestoRequestDTO request,
            String usuario) {
        OrdenServicio orden = ordenServicioService.buscarOFallar(ordenId);
        OrdenServicioRepuesto linea = buscarLinea(ordenId, repuestoId);
        validarPuedeDevolver(orden, linea);

        int cantidad = request.getCantidad();
        int pendienteDevolver = linea.getCantidadConsumida() - linea.getCantidadDevuelta();
        if (cantidad > pendienteDevolver) {
            throw new BusinessException(
                "No se puede devolver más de lo consumido neto. Disponible: " + pendienteDevolver + ".");
        }

        inventarioService.registrarMovimiento(
            linea.getProducto(),
            TipoMovimientoInventario.DEVOLUCION_SERVICIO,
            cantidad,
            ReferenciaMovimiento.ORDEN_SERVICIO,
            orden.getId(),
            linea.getCostoUnitario(),
            usuario,
            "Devolución OT " + orden.getNumero() + " repuesto #" + linea.getId());

        linea.setCantidadDevuelta(linea.getCantidadDevuelta() + cantidad);
        linea.setFechaUltimaDevolucion(LocalDateTime.now());
        return toResponse(repuestoRepository.save(linea), orden);
    }

    @Transactional(readOnly = true)
    public boolean existeConsumoNetoPendiente(Long ordenId) {
        return repuestoRepository.existeConsumoNetoPendiente(ordenId);
    }

    private OrdenServicioRepuesto buscarLinea(Long ordenId, Long repuestoId) {
        return repuestoRepository.findByIdAndOrdenServicioId(repuestoId, ordenId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Repuesto no encontrado en esta orden de servicio."));
    }

    private Producto buscarProductoActivo(Long productoId) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new BusinessException("El producto indicado no existe."));
        if (!producto.isActivo()) {
            throw new BusinessException("El producto '" + producto.getNombre() + "' está inactivo.");
        }
        return producto;
    }

    private void validarPuedePlanificar(OrdenServicio orden) {
        if (orden.getEstado().esTerminal()) {
            throw new BusinessException(
                "No se pueden gestionar repuestos en una orden " + orden.getEstado() + ".");
        }
        if (!ESTADOS_PLANIFICAR.contains(orden.getEstado())) {
            throw new BusinessException(
                "No se puede planificar repuestos en estado " + orden.getEstado() + ".");
        }
    }

    private void validarPuedeConsumir(OrdenServicio orden, OrdenServicioRepuesto linea) {
        if (linea.isAnulado()) {
            throw new BusinessException("No se puede consumir una línea de repuesto anulada.");
        }
        if (orden.getEstado().esTerminal()) {
            throw new BusinessException(
                "No se puede consumir repuestos en una orden " + orden.getEstado() + ".");
        }
        if (!ESTADOS_CONSUMIR.contains(orden.getEstado())) {
            throw new BusinessException(
                "No se puede consumir repuestos en estado " + orden.getEstado() + ".");
        }
    }

    private void validarPuedeDevolver(OrdenServicio orden, OrdenServicioRepuesto linea) {
        if (linea.isAnulado()) {
            throw new BusinessException("No se puede devolver una línea de repuesto anulada.");
        }
        if (orden.getEstado().esTerminal()) {
            throw new BusinessException(
                "No se puede devolver repuestos en una orden " + orden.getEstado() + ".");
        }
        if (!ESTADOS_DEVOLVER.contains(orden.getEstado())) {
            throw new BusinessException(
                "No se puede devolver repuestos en estado " + orden.getEstado() + ".");
        }
    }

    private RepuestoOrdenServicioResponseDTO toResponse(OrdenServicioRepuesto linea, OrdenServicio orden) {
        boolean terminal = orden.getEstado().esTerminal();
        boolean anulado = linea.isAnulado();
        boolean puedePlanificarEstado = ESTADOS_PLANIFICAR.contains(orden.getEstado()) && !terminal;
        boolean puedeConsumirEstado = ESTADOS_CONSUMIR.contains(orden.getEstado()) && !terminal;
        boolean puedeDevolverEstado = ESTADOS_DEVOLVER.contains(orden.getEstado()) && !terminal;

        boolean puedeEditar = puedePlanificarEstado && !anulado;
        boolean puedeEliminar = puedePlanificarEstado && !anulado && linea.cantidadNetaConsumida() == 0;
        boolean puedeConsumir = puedeConsumirEstado && !anulado
            && linea.cantidadNetaConsumida() < linea.getCantidadPlanificada();
        boolean puedeDevolver = puedeDevolverEstado && !anulado && linea.cantidadNetaConsumida() > 0;

        return RepuestoOrdenServicioResponseDTO.fromEntity(
            linea, puedeEditar, puedeEliminar, puedeConsumir, puedeDevolver);
    }
}
