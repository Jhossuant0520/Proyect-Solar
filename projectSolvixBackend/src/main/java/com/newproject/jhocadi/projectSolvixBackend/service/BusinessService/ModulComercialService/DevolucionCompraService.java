package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionCompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DevolucionLineaDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MotivoDevolucionCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CompraRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DevolucionCompraRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.DevolucionCompraSpecifications;

import lombok.RequiredArgsConstructor;

/**
 * Devoluciones a proveedor como documento económico propio.
 *
 * <p>La compra original nunca se recalcula: conserva su subtotal, descuento y total
 * históricos, y cada línea conserva su costo unitario. La devolución guarda su propio
 * importe, de modo que compras netas = compras brutas - devoluciones de compra.
 *
 * <p>El costo revertido proviene siempre de {@code DetalleCompra}, nunca de
 * {@code Producto.costoActual}: una compra pasada no se reinterpreta con el costo de hoy.
 */
@Service
@RequiredArgsConstructor
public class DevolucionCompraService {

    private final DevolucionCompraRepository devolucionRepository;
    private final CompraRepository compraRepository;
    private final InventarioService inventarioService;
    private final SecuenciaDocumentoService secuenciaService;

    /**
     * Registra una devolución completa: documento económico, movimientos de inventario,
     * stock y cantidad devuelta. Todo ocurre en una sola transacción; si algún paso falla
     * no queda rastro de ninguno.
     */
    @Transactional
    public DevolucionCompraResponseDTO registrar(
            Long compraId, DevolucionCompraRequestDTO request, String usuario) {

        Compra compra = buscarCompraOFallar(compraId);

        if (!compra.getEstado().permiteDevolucion()) {
            throw new BusinessException(
                "Solo se puede devolver una compra completada. Estado actual: " + compra.getEstado() + ".");
        }

        LocalDateTime fecha = request.getFecha() != null ? request.getFecha() : LocalDateTime.now();
        MetodoReembolso metodoReembolso = request.getMetodoReembolso();

        DevolucionCompra devolucion = DevolucionCompra.builder()
            .numero(secuenciaService.siguienteNumero(TipoSecuencia.DEVOLUCION_COMPRA, fecha))
            .compra(compra)
            .fecha(fecha)
            .motivo(request.getMotivo() != null ? request.getMotivo() : MotivoDevolucionCompra.OTRO)
            .estado(metodoReembolso != null
                ? EstadoDevolucionCompra.REEMBOLSADA
                : EstadoDevolucionCompra.REGISTRADA)
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
            DetalleCompra detalleCompra = buscarDetalleOFallar(compra, linea.getDetalleId());

            if (linea.getCantidad() > detalleCompra.getCantidadPendienteDevolucion()) {
                throw new BusinessException(String.format(
                    "No se pueden devolver %d unidades de '%s': pendiente de devolución %d.",
                    linea.getCantidad(),
                    detalleCompra.getProductoNombre(),
                    detalleCompra.getCantidadPendienteDevolucion()));
            }

            BigDecimal montoLinea = calcularMontoDevuelto(compra, detalleCompra, linea.getCantidad());
            BigDecimal costoHistorico = detalleCompra.getCostoUnitario();
            boolean costoConocido = costoHistorico != null;

            inventarioService.registrarMovimiento(
                detalleCompra.getProducto(),
                TipoMovimientoInventario.DEVOLUCION_COMPRA,
                linea.getCantidad(),
                ReferenciaMovimiento.DEVOLUCION_COMPRA,
                devolucion.getId(),
                costoHistorico,
                usuario,
                "Devolución " + devolucion.getNumero() + " de la compra " + compra.getNumero());

            detalleCompra.setCantidadDevuelta(detalleCompra.getCantidadDevuelta() + linea.getCantidad());

            DetalleDevolucionCompra detalle = DetalleDevolucionCompra.builder()
                .detalleCompra(detalleCompra)
                .producto(detalleCompra.getProducto())
                .cantidad(linea.getCantidad())
                .montoDevuelto(montoLinea)
                .costoUnitario(costoHistorico)
                .costoConocido(costoConocido)
                .build();

            devolucion.agregarDetalle(detalle);

            montoTotal = montoTotal.add(montoLinea);
            if (costoConocido) {
                costoTotal = costoTotal.add(costoHistorico.multiply(BigDecimal.valueOf(linea.getCantidad())));
            } else {
                costoCompleto = false;
            }
        }

        EstadoCompra estadoCompra = calcularEstadoCompra(compra);

        if (estadoCompra == EstadoCompra.DEVUELTA) {
            montoTotal = ajustarResiduoDevolucionFinal(compra, devolucion, montoTotal);
        }

        devolucion.setMontoTotalDevuelto(escalar(montoTotal));
        devolucion.setCostoTotalDevuelto(escalar(costoTotal));
        devolucion.setCostoCompletoConocido(costoCompleto);

        compra.setEstado(estadoCompra);
        compraRepository.save(compra);

        return DevolucionCompraResponseDTO.fromEntity(devolucionRepository.save(devolucion));
    }

    @Transactional
    public DevolucionCompraResponseDTO registrarReembolso(Long id, MetodoReembolso metodoReembolso) {
        DevolucionCompra devolucion = buscarOFallar(id);

        if (devolucion.getEstado() == EstadoDevolucionCompra.REEMBOLSADA) {
            throw new BusinessException("Esta devolución ya fue reembolsada.");
        }

        devolucion.setMetodoReembolso(metodoReembolso);
        devolucion.setEstado(EstadoDevolucionCompra.REEMBOLSADA);
        devolucion.setFechaReembolso(LocalDateTime.now());

        return DevolucionCompraResponseDTO.fromEntity(devolucionRepository.save(devolucion));
    }

    @Transactional(readOnly = true)
    public List<DevolucionCompraResponseDTO> listar(
            Long compraId,
            Long proveedorId,
            EstadoDevolucionCompra estado,
            MotivoDevolucionCompra motivo,
            LocalDateTime desde,
            LocalDateTime hasta) {

        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new BusinessException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        return devolucionRepository
            .findAll(DevolucionCompraSpecifications.conFiltros(compraId, proveedorId, estado, motivo, desde, hasta))
            .stream()
            .map(DevolucionCompraResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public DevolucionCompraResponseDTO obtenerPorId(Long id) {
        return DevolucionCompraResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional(readOnly = true)
    public List<DevolucionCompraResponseDTO> listarPorCompra(Long compraId) {
        return devolucionRepository.findByCompraIdOrderByFechaAscIdAsc(compraId).stream()
            .map(DevolucionCompraResponseDTO::fromEntity)
            .toList();
    }

    /**
     * Importe realmente pagado por las unidades devueltas: se toma el subtotal de la línea
     * de compra, se prorratea por la cantidad devuelta y se le aplica la proporción del
     * descuento de cabecera. Se redondea una sola vez al final.
     */
    private BigDecimal calcularMontoDevuelto(Compra compra, DetalleCompra detalle, int cantidadDevuelta) {
        BigDecimal subtotalCompra = compra.getSubtotal();

        if (subtotalCompra == null || subtotalCompra.signum() == 0 || detalle.getCantidad() == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal numerador = detalle.getSubtotal()
            .multiply(BigDecimal.valueOf(cantidadDevuelta))
            .multiply(compra.getTotal());

        BigDecimal denominador = BigDecimal.valueOf(detalle.getCantidad()).multiply(subtotalCompra);

        return numerador.divide(denominador, 2, RoundingMode.HALF_UP);
    }

    /**
     * Cuando la compra queda totalmente devuelta, la suma de todas sus devoluciones debe
     * coincidir exactamente con el total de la compra. El prorrateo puede dejar diferencias
     * de centavos, así que el residuo se imputa a la última línea de esta devolución.
     */
    private BigDecimal ajustarResiduoDevolucionFinal(
            Compra compra, DevolucionCompra devolucion, BigDecimal montoTotal) {

        if (devolucion.getDetalles().isEmpty()) {
            return montoTotal;
        }

        BigDecimal devueltoPrevio = devolucionRepository.sumarMontoDevueltoPorCompra(compra.getId());
        BigDecimal residuo = compra.getTotal().subtract(devueltoPrevio).subtract(montoTotal);

        if (residuo.signum() == 0) {
            return montoTotal;
        }

        DetalleDevolucionCompra ultima = devolucion.getDetalles().get(devolucion.getDetalles().size() - 1);
        ultima.setMontoDevuelto(escalar(ultima.getMontoDevuelto().add(residuo)));

        return montoTotal.add(residuo);
    }

    private EstadoCompra calcularEstadoCompra(Compra compra) {
        boolean todoDevuelto = compra.getDetalles().stream()
            .allMatch(d -> d.getCantidadPendienteDevolucion() == 0);

        return todoDevuelto ? EstadoCompra.DEVUELTA : EstadoCompra.PARCIALMENTE_DEVUELTA;
    }

    private DetalleCompra buscarDetalleOFallar(Compra compra, Long detalleId) {
        return compra.getDetalles().stream()
            .filter(d -> d.getId().equals(detalleId))
            .findFirst()
            .orElseThrow(() -> new BusinessException(
                "El detalle " + detalleId + " no pertenece a la compra " + compra.getNumero() + "."));
    }

    private Compra buscarCompraOFallar(Long compraId) {
        return compraRepository.findById(compraId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compra no encontrada."));
    }

    private DevolucionCompra buscarOFallar(Long id) {
        return devolucionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Devolución no encontrada."));
    }

    private BigDecimal escalar(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
