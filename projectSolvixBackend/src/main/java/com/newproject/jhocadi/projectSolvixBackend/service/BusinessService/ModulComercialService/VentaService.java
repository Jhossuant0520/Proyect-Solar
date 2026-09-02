package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleVentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.VentaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoVenta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoPago;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Venta;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.VentaRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.VentaSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;

import lombok.RequiredArgsConstructor;

/**
 * Reglas de venta.
 *
 * <p>El precio se congela al crear la línea y el costo al completar la venta, que es el
 * momento en que el inventario se consume. Un costo desconocido se marca explícitamente
 * para que analytics no lo interprete como margen del 100%.
 *
 * <p>Las devoluciones viven en {@code DevolucionVentaService}: son un documento propio y
 * nunca modifican el importe histórico de la venta.
 */
@Service
@RequiredArgsConstructor
public class VentaService {

    private final VentaRepository ventaRepository;
    private final ProductoRepository productoRepository;
    private final ClienteService clienteService;
    private final InventarioService inventarioService;
    private final SecuenciaDocumentoService secuenciaService;

    @Transactional
    public VentaResponseDTO crear(VentaRequestDTO request, String usuario) {
        Cliente cliente = resolverCliente(request.getClienteId());
        LocalDateTime fecha = request.getFecha() != null ? request.getFecha() : LocalDateTime.now();

        Venta venta = Venta.builder()
            .numero(secuenciaService.siguienteNumero(TipoSecuencia.VENTA, fecha))
            .fecha(fecha)
            .cliente(cliente)
            .estado(EstadoVenta.PENDIENTE)
            .metodoPago(request.getMetodoPago() != null ? request.getMetodoPago() : MetodoPago.EFECTIVO)
            .observaciones(request.getObservaciones())
            .createdBy(usuario)
            .build();

        for (DetalleVentaRequestDTO linea : request.getDetalles()) {
            venta.agregarDetalle(construirDetalle(linea));
        }

        aplicarTotales(venta, request.getDescuento());

        return VentaResponseDTO.fromEntity(ventaRepository.save(venta));
    }

    /**
     * Completa la venta de forma atómica: valida stock, congela el costo aplicado,
     * genera los movimientos de salida y cambia el estado.
     */
    @Transactional
    public VentaResponseDTO completar(Long id, String usuario) {
        Venta venta = buscarOFallar(id);

        if (venta.getEstado() != EstadoVenta.PENDIENTE) {
            throw new BusinessException(
                "Solo se puede completar una venta en estado PENDIENTE. Estado actual: " + venta.getEstado() + ".");
        }

        for (DetalleVenta detalle : venta.getDetalles()) {
            Producto producto = detalle.getProducto();

            BigDecimal costoAplicado = producto.getCostoActual();
            detalle.setCostoUnitario(costoAplicado);
            detalle.setCostoConocido(costoAplicado != null);

            inventarioService.registrarMovimiento(
                producto,
                TipoMovimientoInventario.VENTA,
                detalle.getCantidad(),
                ReferenciaMovimiento.VENTA,
                venta.getId(),
                costoAplicado,
                usuario,
                "Venta " + venta.getNumero());
        }

        venta.setEstado(EstadoVenta.COMPLETADA);
        venta.setFechaCompletada(LocalDateTime.now());

        return VentaResponseDTO.fromEntity(ventaRepository.save(venta));
    }

    @Transactional
    public VentaResponseDTO cancelar(Long id) {
        Venta venta = buscarOFallar(id);

        if (venta.getEstado() != EstadoVenta.PENDIENTE) {
            throw new BusinessException(
                "Solo se puede cancelar una venta PENDIENTE. Una venta completada debe devolverse.");
        }

        venta.setEstado(EstadoVenta.CANCELADA);
        venta.setFechaAnulada(LocalDateTime.now());

        return VentaResponseDTO.fromEntity(ventaRepository.save(venta));
    }

    @Transactional(readOnly = true)
    public List<VentaResponseDTO> listar(
            Long clienteId, EstadoVenta estado, LocalDateTime desde, LocalDateTime hasta) {

        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new BusinessException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        return ventaRepository
            .findAll(VentaSpecifications.conFiltros(clienteId, estado, desde, hasta))
            .stream()
            .map(VentaResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public VentaResponseDTO obtenerPorId(Long id) {
        return VentaResponseDTO.fromEntity(buscarOFallar(id));
    }

    private Cliente resolverCliente(Long clienteId) {
        if (clienteId == null) {
            return clienteService.obtenerOCrearConsumidorFinal();
        }

        Cliente cliente = clienteService.buscarOFallar(clienteId);
        if (!cliente.isActivo()) {
            throw new BusinessException("El cliente seleccionado está inactivo.");
        }
        return cliente;
    }

    private DetalleVenta construirDetalle(DetalleVentaRequestDTO linea) {
        Producto producto = productoRepository.findById(linea.getProductoId())
            .orElseThrow(() -> new BusinessException("El producto " + linea.getProductoId() + " no existe."));

        if (!producto.isActivo()) {
            throw new BusinessException("El producto '" + producto.getNombre() + "' está inactivo.");
        }

        BigDecimal precioUnitario = escalar(
            linea.getPrecioUnitario() != null ? linea.getPrecioUnitario() : producto.getPrecioVentaActual());
        BigDecimal descuentoLinea = escalar(
            linea.getDescuentoLinea() != null ? linea.getDescuentoLinea() : BigDecimal.ZERO);

        BigDecimal bruto = precioUnitario.multiply(BigDecimal.valueOf(linea.getCantidad()));
        if (descuentoLinea.compareTo(bruto) > 0) {
            throw new BusinessException(
                "El descuento de la línea '" + producto.getNombre() + "' supera su valor bruto.");
        }

        return DetalleVenta.builder()
            .producto(producto)
            .productoNombre(producto.getNombre())
            .categoriaCodigo(producto.getCategoria() != null ? producto.getCategoria().getCodigo() : null)
            .cantidad(linea.getCantidad())
            .precioUnitario(precioUnitario)
            .costoUnitario(null)
            .costoConocido(false)
            .descuentoLinea(descuentoLinea)
            .subtotal(escalar(bruto.subtract(descuentoLinea)))
            .cantidadDevuelta(0)
            .build();
    }

    private void aplicarTotales(Venta venta, BigDecimal descuentoCabecera) {
        BigDecimal subtotal = venta.getDetalles().stream()
            .map(DetalleVenta::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal descuento = escalar(descuentoCabecera != null ? descuentoCabecera : BigDecimal.ZERO);

        if (descuento.compareTo(subtotal) > 0) {
            throw new BusinessException("El descuento no puede superar el subtotal de la venta.");
        }

        venta.setSubtotal(escalar(subtotal));
        venta.setDescuento(descuento);
        venta.setTotal(escalar(subtotal.subtract(descuento)));
    }

    private Venta buscarOFallar(Long id) {
        return ventaRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venta no encontrada."));
    }

    private BigDecimal escalar(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
