package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteCostoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.AjusteInventarioRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.MovimientoInventarioResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos.StockProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.AjusteCostoProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoMovimientoInventario;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.AjusteCostoProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.MovimientoInventarioRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo.MovimientoInventarioSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;

import lombok.RequiredArgsConstructor;

/**
 * Autoridad única sobre el stock y sobre el costo vigente del producto.
 *
 * <p>Ningún otro servicio puede modificar {@code Producto.stockActual}: toda variación queda
 * registrada como movimiento auditable. {@code Producto.costoActual} sigue la misma regla: lo
 * determina la política de costeo al completar una compra, o una corrección explícita de costo
 * registrada aquí. La edición de producto no puede tocarlo.
 */
@Service
@RequiredArgsConstructor
public class InventarioService {

    private static final Set<TipoMovimientoInventario> TIPOS_AJUSTE_MANUAL = EnumSet.of(
        TipoMovimientoInventario.AJUSTE_ENTRADA,
        TipoMovimientoInventario.AJUSTE_SALIDA,
        TipoMovimientoInventario.MERMA);

    private final MovimientoInventarioRepository movimientoRepository;
    private final AjusteCostoProductoRepository ajusteCostoRepository;
    private final ProductoRepository productoRepository;

    /**
     * Registra un movimiento y aplica el cambio de stock de forma atómica.
     * Es el único punto autorizado para mover inventario.
     *
     * <p>El movimiento guarda además el costo que queda vigente en el producto tras la
     * operación, que es lo que permite valorar el inventario en fechas pasadas. Quien aplique
     * una política de costeo debe hacerlo <b>antes</b> de llamar aquí, para que el libro
     * registre el costo resultante y no el anterior.
     */
    @Transactional
    public MovimientoInventario registrarMovimiento(
            Producto producto,
            TipoMovimientoInventario tipo,
            int cantidad,
            ReferenciaMovimiento referenciaTipo,
            Long referenciaId,
            BigDecimal costoUnitario,
            String usuario,
            String observaciones) {

        if (producto == null) {
            throw new BusinessException("El producto del movimiento de inventario es obligatorio.");
        }
        if (tipo == null) {
            throw new BusinessException("El tipo de movimiento de inventario es obligatorio.");
        }
        if (cantidad <= 0) {
            throw new BusinessException("La cantidad del movimiento debe ser mayor que cero.");
        }

        int stockAnterior = producto.getStockActual() != null ? producto.getStockActual() : 0;
        int stockNuevo = tipo.esEntrada() ? stockAnterior + cantidad : stockAnterior - cantidad;

        if (stockNuevo < 0) {
            throw new BusinessException(String.format(
                "Stock insuficiente para '%s'. Disponible: %d, requerido: %d.",
                producto.getNombre(), stockAnterior, cantidad));
        }

        producto.setStockActual(stockNuevo);
        productoRepository.save(producto);

        MovimientoInventario movimiento = MovimientoInventario.builder()
            .producto(producto)
            .tipo(tipo)
            .direccion(tipo.getDireccion())
            .cantidad(cantidad)
            .stockAnterior(stockAnterior)
            .stockNuevo(stockNuevo)
            .costoUnitario(costoUnitario)
            .costoProductoResultante(producto.getCostoActual())
            .fecha(LocalDateTime.now())
            .referenciaTipo(referenciaTipo)
            .referenciaId(referenciaId)
            .usuarioRegistro(usuario)
            .observaciones(observaciones)
            .build();

        return movimientoRepository.save(movimiento);
    }

    /** Ajuste manual de inventario (entrada, salida o merma) con trazabilidad. */
    @Transactional
    public MovimientoInventarioResponseDTO registrarAjuste(AjusteInventarioRequestDTO request, String usuario) {
        if (!TIPOS_AJUSTE_MANUAL.contains(request.getTipo())) {
            throw new BusinessException(
                "Solo se permiten ajustes de tipo AJUSTE_ENTRADA, AJUSTE_SALIDA o MERMA.");
        }

        Producto producto = buscarProducto(request.getProductoId());

        MovimientoInventario movimiento = registrarMovimiento(
            producto,
            request.getTipo(),
            request.getCantidad(),
            ReferenciaMovimiento.AJUSTE_MANUAL,
            null,
            null,
            usuario,
            request.getObservaciones());

        return MovimientoInventarioResponseDTO.fromEntity(movimiento);
    }

    /**
     * Corrige manualmente el costo vigente de un producto dejando historial.
     *
     * <p>Existe porque {@code costoActual} no es un campo del catálogo: lo determina la política
     * de costeo a partir de las compras. Cuando hay que intervenirlo a mano, la corrección es
     * una operación propia y auditable, no una edición del producto.
     *
     * <p><b>No mueve stock ni genera movimiento de inventario.</b> El libro de inventario
     * registra unidades; una fila con cantidad cero solo lo ensuciaría y rompería la
     * reconstrucción de existencias. El historial de costo vive en su propia tabla y la
     * valuación histórica lee ambas fuentes.
     */
    @Transactional
    public AjusteCostoResponseDTO registrarAjusteCosto(AjusteCostoRequestDTO request, String usuario) {
        Producto producto = buscarProducto(request.getProductoId());

        BigDecimal costoAnterior = producto.getCostoActual();
        BigDecimal costoNuevo = request.getCostoNuevo().setScale(2, RoundingMode.HALF_UP);

        if (costoAnterior != null && costoAnterior.compareTo(costoNuevo) == 0) {
            throw new BusinessException(
                "El costo indicado es el que ya está vigente. No hay nada que corregir.");
        }

        int stockAlAjustar = producto.getStockActual() != null ? producto.getStockActual() : 0;

        producto.setCostoActual(costoNuevo);
        productoRepository.save(producto);

        AjusteCostoProducto ajuste = AjusteCostoProducto.builder()
            .producto(producto)
            .costoAnterior(costoAnterior)
            .costoNuevo(costoNuevo)
            .costoProductoResultante(producto.getCostoActual())
            .stockAlAjustar(stockAlAjustar)
            .motivo(request.getMotivo())
            .observaciones(request.getObservaciones())
            .usuarioRegistro(usuario)
            .fecha(LocalDateTime.now())
            .build();

        return AjusteCostoResponseDTO.fromEntity(ajusteCostoRepository.save(ajuste));
    }

    /** Historial de correcciones de costo, completo o acotado a un producto. */
    @Transactional(readOnly = true)
    public List<AjusteCostoResponseDTO> listarAjustesCosto(Long productoId) {
        List<AjusteCostoProducto> ajustes = productoId != null
            ? ajusteCostoRepository.findByProductoIdOrderByFechaDescIdDesc(productoId)
            : ajusteCostoRepository.findAllByOrderByFechaDescIdDesc();

        return ajustes.stream().map(AjusteCostoResponseDTO::fromEntity).toList();
    }

    /** Carga inicial de stock al crear un producto. Deja historial desde el primer día. */
    @Transactional
    public MovimientoInventario registrarCargaInicial(Producto producto, int cantidad, String usuario) {
        return registrarMovimiento(
            producto,
            TipoMovimientoInventario.CARGA_INICIAL,
            cantidad,
            ReferenciaMovimiento.CARGA_INICIAL,
            producto.getId(),
            producto.getCostoActual(),
            usuario,
            "Stock inicial registrado al crear el producto.");
    }

    @Transactional(readOnly = true)
    public List<MovimientoInventarioResponseDTO> listarMovimientos(
            Long productoId,
            TipoMovimientoInventario tipo,
            LocalDateTime desde,
            LocalDateTime hasta) {

        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new BusinessException("La fecha inicial no puede ser posterior a la fecha final.");
        }

        return movimientoRepository
            .findAll(MovimientoInventarioSpecifications.conFiltros(productoId, tipo, desde, hasta))
            .stream()
            .map(MovimientoInventarioResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public StockProductoResponseDTO consultarStock(Long productoId) {
        Producto producto = buscarProducto(productoId);

        LocalDateTime ultimoMovimiento = movimientoRepository
            .findByProductoIdOrderByFechaDescIdDesc(productoId)
            .stream()
            .findFirst()
            .map(MovimientoInventario::getFecha)
            .orElse(null);

        return StockProductoResponseDTO.builder()
            .productoId(producto.getId())
            .productoNombre(producto.getNombre())
            .stockActual(producto.getStockActual())
            .costoActual(producto.getCostoActual())
            .costoConocido(producto.tieneCostoConocido())
            .fechaUltimoMovimiento(ultimoMovimiento)
            .build();
    }

    private Producto buscarProducto(Long productoId) {
        return productoRepository.findById(productoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado."));
    }
}
