package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.CompraResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.DetalleCompraRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Compra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CompraRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.CompraSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.costeo.PoliticaCosteoInventario;

import lombok.RequiredArgsConstructor;

/**
 * Reglas de compra. Los costos aplicados quedan congelados en cada línea y son la
 * fuente de verdad para recalcular políticas de costeo sin tocar el historial.
 */
@Service
@RequiredArgsConstructor
public class CompraService {

    private final CompraRepository compraRepository;
    private final ProductoRepository productoRepository;
    private final ProveedorService proveedorService;
    private final InventarioService inventarioService;
    private final SecuenciaDocumentoService secuenciaService;
    private final PoliticaCosteoInventario politicaCosteo;

    @Transactional
    public CompraResponseDTO crear(CompraRequestDTO request, String usuario) {
        Proveedor proveedor = proveedorService.buscarOFallar(request.getProveedorId());
        LocalDateTime fecha = request.getFecha() != null ? request.getFecha() : LocalDateTime.now();

        Compra compra = Compra.builder()
            .numero(secuenciaService.siguienteNumero(TipoSecuencia.COMPRA, fecha))
            .fecha(fecha)
            .proveedor(proveedor)
            .estado(EstadoCompra.PENDIENTE)
            .observaciones(request.getObservaciones())
            .createdBy(usuario)
            .build();

        for (DetalleCompraRequestDTO linea : request.getDetalles()) {
            compra.agregarDetalle(construirDetalle(linea));
        }

        aplicarTotales(compra, request.getDescuento());

        return CompraResponseDTO.fromEntity(compraRepository.save(compra));
    }

    /**
     * Completa la compra: ingresa stock con trazabilidad y actualiza el costo vigente
     * del producto según la política de costeo configurada.
     */
    @Transactional
    public CompraResponseDTO completar(Long id, String usuario) {
        Compra compra = buscarOFallar(id);

        if (compra.getEstado() != EstadoCompra.PENDIENTE) {
            throw new BusinessException(
                "Solo se puede completar una compra en estado PENDIENTE. Estado actual: " + compra.getEstado() + ".");
        }

        for (DetalleCompra detalle : compra.getDetalles()) {
            Producto producto = detalle.getProducto();
            int stockAntes = producto.getStockActual() != null ? producto.getStockActual() : 0;

            // La política se aplica antes del movimiento para que el libro de inventario
            // registre el costo que queda vigente, no el que regía antes de la compra.
            BigDecimal nuevoCosto = politicaCosteo.calcularCostoActual(
                producto, detalle.getCostoUnitario(), detalle.getCantidad(), stockAntes);
            producto.setCostoActual(nuevoCosto);
            productoRepository.save(producto);

            inventarioService.registrarMovimiento(
                producto,
                TipoMovimientoInventario.COMPRA,
                detalle.getCantidad(),
                ReferenciaMovimiento.COMPRA,
                compra.getId(),
                detalle.getCostoUnitario(),
                usuario,
                "Compra " + compra.getNumero());
        }

        compra.setEstado(EstadoCompra.COMPLETADA);
        compra.setFechaCompletada(LocalDateTime.now());

        return CompraResponseDTO.fromEntity(compraRepository.save(compra));
    }

    @Transactional
    public CompraResponseDTO cancelar(Long id) {
        Compra compra = buscarOFallar(id);

        if (compra.getEstado() != EstadoCompra.PENDIENTE) {
            throw new BusinessException(
                "Solo se puede cancelar una compra PENDIENTE. Una compra completada debe devolverse.");
        }

        compra.setEstado(EstadoCompra.CANCELADA);
        compra.setFechaAnulada(LocalDateTime.now());

        return CompraResponseDTO.fromEntity(compraRepository.save(compra));
    }

    @Transactional(readOnly = true)
    public List<CompraResponseDTO> listar(
            Long proveedorId, EstadoCompra estado, LocalDateTime desde, LocalDateTime hasta) {

        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new BusinessException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        return compraRepository
            .findAll(CompraSpecifications.conFiltros(proveedorId, estado, desde, hasta))
            .stream()
            .map(CompraResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public CompraResponseDTO obtenerPorId(Long id) {
        return CompraResponseDTO.fromEntity(buscarOFallar(id));
    }

    private DetalleCompra construirDetalle(DetalleCompraRequestDTO linea) {
        Producto producto = productoRepository.findById(linea.getProductoId())
            .orElseThrow(() -> new BusinessException(
                "El producto " + linea.getProductoId() + " no existe."));

        BigDecimal costoUnitario = escalar(linea.getCostoUnitario());
        BigDecimal subtotal = escalar(costoUnitario.multiply(BigDecimal.valueOf(linea.getCantidad())));

        return DetalleCompra.builder()
            .producto(producto)
            .productoNombre(producto.getNombre())
            .categoriaCodigo(producto.getCategoria() != null ? producto.getCategoria().getCodigo() : null)
            .cantidad(linea.getCantidad())
            .costoUnitario(costoUnitario)
            .subtotal(subtotal)
            .cantidadDevuelta(0)
            .build();
    }

    private void aplicarTotales(Compra compra, BigDecimal descuentoCabecera) {
        BigDecimal subtotal = compra.getDetalles().stream()
            .map(DetalleCompra::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal descuento = escalar(descuentoCabecera != null ? descuentoCabecera : BigDecimal.ZERO);

        if (descuento.compareTo(subtotal) > 0) {
            throw new BusinessException("El descuento no puede superar el subtotal de la compra.");
        }

        compra.setSubtotal(escalar(subtotal));
        compra.setDescuento(descuento);
        compra.setTotal(escalar(subtotal.subtract(descuento)));
    }

    private Compra buscarOFallar(Long id) {
        return compraRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compra no encontrada."));
    }

    private BigDecimal escalar(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
