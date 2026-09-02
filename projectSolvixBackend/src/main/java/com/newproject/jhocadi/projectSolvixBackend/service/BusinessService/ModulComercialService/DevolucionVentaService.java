package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionVentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleDevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucion;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Venta;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DevolucionVentaRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DevolucionVentaSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.VentaRepository;

import lombok.RequiredArgsConstructor;

/**
 * Devoluciones de venta como documento económico propio.
 *
 * <p>La venta original nunca se recalcula: conserva su importe histórico. La devolución
 * guarda su propio monto, calculado sobre lo que el cliente pagó realmente (precio de
 * línea con su descuento y la parte proporcional del descuento de cabecera), de modo que
 * ventas netas = ventas brutas - devoluciones.
 */
@Service
@RequiredArgsConstructor
public class DevolucionVentaService {

    private final DevolucionVentaRepository devolucionRepository;
    private final VentaRepository ventaRepository;
    private final InventarioService inventarioService;
    private final SecuenciaDocumentoService secuenciaService;

    /**
     * Registra una devolución completa: documento económico, movimientos de inventario,
     * stock y cantidad devuelta. Todo ocurre en una sola transacción; si algún paso falla
     * no queda rastro de ninguno.
     */
    @Transactional
    public DevolucionVentaResponseDTO registrar(Long ventaId, DevolucionVentaRequestDTO request, String usuario) {
        Venta venta = buscarVentaOFallar(ventaId);

        if (!venta.getEstado().permiteDevolucion()) {
            throw new BusinessException(
                "Solo se puede devolver una venta completada. Estado actual: " + venta.getEstado() + ".");
        }

        LocalDateTime fecha = request.getFecha() != null ? request.getFecha() : LocalDateTime.now();
        MetodoReembolso metodoReembolso = request.getMetodoReembolso();

        DevolucionVenta devolucion = DevolucionVenta.builder()
            .numero(secuenciaService.siguienteNumero(TipoSecuencia.DEVOLUCION_VENTA, fecha))
            .venta(venta)
            .fecha(fecha)
            .motivo(request.getMotivo() != null ? request.getMotivo() : MotivoDevolucion.OTRO)
            .estado(metodoReembolso != null
                ? EstadoDevolucionVenta.REEMBOLSADA
                : EstadoDevolucionVenta.REGISTRADA)
            .metodoReembolso(metodoReembolso)
            .fechaReembolso(metodoReembolso != null ? fecha : null)
            .observaciones(request.getObservaciones())
            .createdBy(usuario)
            .build();

        // Se persiste primero para que los movimientos de inventario puedan referenciarla.
        devolucion = devolucionRepository.save(devolucion);

        BigDecimal montoTotal = BigDecimal.ZERO;
        BigDecimal costoTotal = BigDecimal.ZERO;
        boolean costoCompleto = true;

        for (DevolucionLineaDTO linea : request.getLineas()) {
            DetalleVenta detalleVenta = buscarDetalleOFallar(venta, linea.getDetalleId());

            if (linea.getCantidad() > detalleVenta.getCantidadPendienteDevolucion()) {
                throw new BusinessException(String.format(
                    "No se pueden devolver %d unidades de '%s': pendiente de devolución %d.",
                    linea.getCantidad(),
                    detalleVenta.getProductoNombre(),
                    detalleVenta.getCantidadPendienteDevolucion()));
            }

            BigDecimal montoLinea = calcularMontoDevuelto(venta, detalleVenta, linea.getCantidad());

            inventarioService.registrarMovimiento(
                detalleVenta.getProducto(),
                TipoMovimientoInventario.DEVOLUCION_VENTA,
                linea.getCantidad(),
                ReferenciaMovimiento.DEVOLUCION_VENTA,
                devolucion.getId(),
                detalleVenta.getCostoUnitario(),
                usuario,
                "Devolución " + devolucion.getNumero() + " de la venta " + venta.getNumero());

            detalleVenta.setCantidadDevuelta(detalleVenta.getCantidadDevuelta() + linea.getCantidad());

            DetalleDevolucionVenta detalle = DetalleDevolucionVenta.builder()
                .detalleVenta(detalleVenta)
                .producto(detalleVenta.getProducto())
                .cantidad(linea.getCantidad())
                .montoDevuelto(montoLinea)
                .costoUnitario(detalleVenta.getCostoUnitario())
                .costoConocido(detalleVenta.isCostoConocido())
                .build();

            devolucion.agregarDetalle(detalle);

            montoTotal = montoTotal.add(montoLinea);
            if (detalleVenta.isCostoConocido()) {
                costoTotal = costoTotal.add(
                    detalleVenta.getCostoUnitario().multiply(BigDecimal.valueOf(linea.getCantidad())));
            } else {
                costoCompleto = false;
            }
        }

        EstadoVenta estadoVenta = calcularEstadoVenta(venta);

        if (estadoVenta == EstadoVenta.DEVUELTA) {
            montoTotal = ajustarResiduoDevolucionFinal(venta, devolucion, montoTotal);
        }

        devolucion.setMontoTotalDevuelto(escalar(montoTotal));
        devolucion.setCostoTotalDevuelto(escalar(costoTotal));
        devolucion.setCostoCompletoConocido(costoCompleto);

        venta.setEstado(estadoVenta);
        ventaRepository.save(venta);

        return DevolucionVentaResponseDTO.fromEntity(devolucionRepository.save(devolucion));
    }

    @Transactional
    public DevolucionVentaResponseDTO registrarReembolso(Long id, MetodoReembolso metodoReembolso) {
        DevolucionVenta devolucion = buscarOFallar(id);

        if (devolucion.getEstado() == EstadoDevolucionVenta.REEMBOLSADA) {
            throw new BusinessException("Esta devolución ya fue reembolsada.");
        }

        devolucion.setMetodoReembolso(metodoReembolso);
        devolucion.setEstado(EstadoDevolucionVenta.REEMBOLSADA);
        devolucion.setFechaReembolso(LocalDateTime.now());

        return DevolucionVentaResponseDTO.fromEntity(devolucionRepository.save(devolucion));
    }

    @Transactional(readOnly = true)
    public List<DevolucionVentaResponseDTO> listar(
            Long ventaId,
            Long clienteId,
            EstadoDevolucionVenta estado,
            MotivoDevolucion motivo,
            LocalDateTime desde,
            LocalDateTime hasta) {

        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new BusinessException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        return devolucionRepository
            .findAll(DevolucionVentaSpecifications.conFiltros(ventaId, clienteId, estado, motivo, desde, hasta))
            .stream()
            .map(DevolucionVentaResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public DevolucionVentaResponseDTO obtenerPorId(Long id) {
        return DevolucionVentaResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional(readOnly = true)
    public List<DevolucionVentaResponseDTO> listarPorVenta(Long ventaId) {
        return devolucionRepository.findByVentaIdOrderByFechaAscIdAsc(ventaId).stream()
            .map(DevolucionVentaResponseDTO::fromEntity)
            .toList();
    }

    /**
     * Importe realmente pagado por las unidades devueltas: se toma el subtotal de la línea
     * (ya neto de su propio descuento), se prorratea por la cantidad devuelta y se le aplica
     * la proporción del descuento de cabecera. Se redondea una sola vez al final.
     */
    private BigDecimal calcularMontoDevuelto(Venta venta, DetalleVenta detalle, int cantidadDevuelta) {
        BigDecimal subtotalVenta = venta.getSubtotal();

        if (subtotalVenta == null || subtotalVenta.signum() == 0 || detalle.getCantidad() == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal numerador = detalle.getSubtotal()
            .multiply(BigDecimal.valueOf(cantidadDevuelta))
            .multiply(venta.getTotal());

        BigDecimal denominador = BigDecimal.valueOf(detalle.getCantidad()).multiply(subtotalVenta);

        return numerador.divide(denominador, 2, RoundingMode.HALF_UP);
    }

    /**
     * Cuando la venta queda totalmente devuelta, la suma de todas sus devoluciones debe
     * coincidir exactamente con el total de la venta. El prorrateo puede dejar diferencias
     * de centavos, así que el residuo se imputa a la última línea de esta devolución.
     */
    private BigDecimal ajustarResiduoDevolucionFinal(
            Venta venta, DevolucionVenta devolucion, BigDecimal montoTotal) {

        if (devolucion.getDetalles().isEmpty()) {
            return montoTotal;
        }

        BigDecimal devueltoPrevio = devolucionRepository.sumarMontoDevueltoPorVenta(venta.getId());
        BigDecimal residuo = venta.getTotal().subtract(devueltoPrevio).subtract(montoTotal);

        if (residuo.signum() == 0) {
            return montoTotal;
        }

        DetalleDevolucionVenta ultima = devolucion.getDetalles().get(devolucion.getDetalles().size() - 1);
        ultima.setMontoDevuelto(escalar(ultima.getMontoDevuelto().add(residuo)));

        return montoTotal.add(residuo);
    }

    private EstadoVenta calcularEstadoVenta(Venta venta) {
        boolean todoDevuelto = venta.getDetalles().stream()
            .allMatch(d -> d.getCantidadPendienteDevolucion() == 0);

        return todoDevuelto ? EstadoVenta.DEVUELTA : EstadoVenta.PARCIALMENTE_DEVUELTA;
    }

    private DetalleVenta buscarDetalleOFallar(Venta venta, Long detalleId) {
        return venta.getDetalles().stream()
            .filter(d -> d.getId().equals(detalleId))
            .findFirst()
            .orElseThrow(() -> new BusinessException(
                "El detalle " + detalleId + " no pertenece a la venta " + venta.getNumero() + "."));
    }

    private Venta buscarVentaOFallar(Long ventaId) {
        return ventaRepository.findById(ventaId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada."));
    }

    private DevolucionVenta buscarOFallar(Long id) {
        return devolucionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devolución no encontrada."));
    }

    private BigDecimal escalar(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
