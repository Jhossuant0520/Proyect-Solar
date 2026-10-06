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
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CondicionPagoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ContactoProveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DetalleCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.EstadoCompra;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Proveedor;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoDocumentoExternoCompra;
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
 *
 * <p>Total enriquecido (3.15.11-B/C): {@code total = subtotal - descuento + impuestoTotal}.
 * El IVA monetario ({@code valorImpuesto} / {@code impuestoTotal}) lo calcula el backend
 * desde la tasa de línea; valores enviados en el request se ignoran.
 * Compras legacy sin impuesto tienen {@code impuestoTotal = 0} y el total conserva
 * la semántica histórica (subtotal − descuento).
 */
@Service
@RequiredArgsConstructor
public class CompraService {

    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    private final CompraRepository compraRepository;
    private final ProductoRepository productoRepository;
    private final ProveedorService proveedorService;
    private final InventarioService inventarioService;
    private final SecuenciaDocumentoService secuenciaService;
    private final PoliticaCosteoInventario politicaCosteo;
    private final CxPService cxpService;

    @Transactional
    public CompraResponseDTO crear(CompraRequestDTO request, String usuario) {
        Proveedor proveedor = proveedorService.buscarActivoParaCompra(request.getProveedorId());
        LocalDateTime fecha = request.getFecha() != null ? request.getFecha() : LocalDateTime.now();

        validarDocumentoExterno(request.getTipoDocumentoExterno(), request.getNumeroDocumentoExterno());

        CondicionPagoProveedor condicion = request.getCondicionPagoAplicada() != null
            ? request.getCondicionPagoAplicada()
            : proveedor.getCondicionPago();
        Integer diasCredito = resolverDiasCredito(condicion, request.getDiasCreditoAplicados(), proveedor);
        validarCondicionPago(condicion, diasCredito);

        ContactoSnapshot contacto = resolverContacto(proveedor, request);

        Compra compra = Compra.builder()
            .numero(secuenciaService.siguienteNumero(TipoSecuencia.COMPRA, fecha))
            .fecha(fecha)
            .proveedor(proveedor)
            .proveedorNombreSnapshot(proveedor.getNombre())
            .proveedorDocumentoSnapshot(proveedor.getDocumento())
            .tipoDocumentoExterno(request.getTipoDocumentoExterno())
            .numeroDocumentoExterno(normalizar(request.getNumeroDocumentoExterno()))
            .numeroOrdenCompra(normalizar(request.getNumeroOrdenCompra()))
            .numeroCotizacionProveedor(normalizar(request.getNumeroCotizacionProveedor()))
            .fechaDocumentoProveedor(request.getFechaDocumentoProveedor())
            .fechaEntrega(request.getFechaEntrega())
            .condicionPagoAplicada(condicion)
            .diasCreditoAplicados(diasCredito)
            .moneda("COP")
            .contactoProveedorId(contacto.id())
            .contactoNombreSnapshot(contacto.nombre())
            .estado(EstadoCompra.PENDIENTE)
            .observaciones(request.getObservaciones())
            .createdBy(usuario)
            .build();

        compra.setFechaVencimiento(resolverFechaVencimiento(
            condicion, diasCredito, fecha, request.getFechaVencimiento()));

        for (DetalleCompraRequestDTO linea : request.getDetalles()) {
            compra.agregarDetalle(construirDetalle(linea));
        }

        aplicarTotales(compra, request.getDescuento());

        return CompraResponseDTO.fromEntity(compraRepository.save(compra));
    }

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

        Compra guardada = compraRepository.save(compra);
        // Misma transacción: si falla CxP, no se confirma el inventario.
        cxpService.crearDesdeCompraCompletada(guardada, usuario);

        return CompraResponseDTO.fromEntity(guardada);
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
        // Tasa de negocio. Omitida → 0 (compat. clientes legacy). La UI envía 19% por defecto.
        BigDecimal porcentaje = linea.getPorcentajeImpuesto() != null
            ? escalar(linea.getPorcentajeImpuesto())
            : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (porcentaje.signum() < 0) {
            throw new BusinessException("El porcentaje de impuesto no puede ser negativo.");
        }

        // valorImpuesto siempre lo calcula SOLVIX. Se ignora cualquier valor enviado en el request.
        BigDecimal valorImpuesto = porcentaje.signum() == 0
            ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
            : escalar(subtotal.multiply(porcentaje).divide(CIEN, 8, RoundingMode.HALF_UP));

        return DetalleCompra.builder()
            .producto(producto)
            .productoNombre(producto.getNombre())
            .categoriaCodigo(producto.getCategoria() != null ? producto.getCategoria().getCodigo() : null)
            .cantidad(linea.getCantidad())
            .costoUnitario(costoUnitario)
            .subtotal(subtotal)
            .referenciaProveedor(normalizar(linea.getReferenciaProveedor()))
            .porcentajeImpuesto(porcentaje)
            .valorImpuesto(valorImpuesto)
            .cantidadDevuelta(0)
            .build();
    }

    /**
     * {@code total = subtotal - descuento + impuestoTotal},
     * con {@code impuestoTotal = Σ valorImpuesto de líneas} (calculado por backend).
     */
    private void aplicarTotales(Compra compra, BigDecimal descuentoCabecera) {
        BigDecimal subtotal = compra.getDetalles().stream()
            .map(DetalleCompra::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal descuento = escalar(descuentoCabecera != null ? descuentoCabecera : BigDecimal.ZERO);
        if (descuento.compareTo(subtotal) > 0) {
            throw new BusinessException("El descuento no puede superar el subtotal de la compra.");
        }

        BigDecimal impuestoTotal = escalar(compra.getDetalles().stream()
            .map(d -> d.getValorImpuesto() != null ? d.getValorImpuesto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add));

        compra.setSubtotal(escalar(subtotal));
        compra.setDescuento(descuento);
        compra.setImpuestoTotal(impuestoTotal);
        compra.setTotal(escalar(subtotal.subtract(descuento).add(impuestoTotal)));
    }

    private void validarDocumentoExterno(TipoDocumentoExternoCompra tipo, String numero) {
        String limpio = normalizar(numero);
        if (tipo != null && limpio == null) {
            throw new BusinessException(
                "Si indica el tipo de documento externo, el número de documento es obligatorio.");
        }
    }

    private Integer resolverDiasCredito(
            CondicionPagoProveedor condicion, Integer requestDias, Proveedor proveedor) {
        if (condicion == CondicionPagoProveedor.CONTADO) {
            return 0;
        }
        if (requestDias != null) {
            return requestDias;
        }
        if (condicion == CondicionPagoProveedor.CREDITO) {
            return proveedor.getDiasCredito();
        }
        return requestDias != null ? requestDias : proveedor.getDiasCredito();
    }

    private void validarCondicionPago(CondicionPagoProveedor condicion, Integer diasCredito) {
        if (condicion == CondicionPagoProveedor.CREDITO) {
            if (diasCredito == null || diasCredito <= 0) {
                throw new BusinessException(
                    "Para crédito, los días de crédito aplicados deben ser mayores que cero.");
            }
        }
    }

    private LocalDateTime resolverFechaVencimiento(
            CondicionPagoProveedor condicion,
            Integer diasCredito,
            LocalDateTime fechaNegocio,
            LocalDateTime fechaVencimientoRequest) {

        if (fechaVencimientoRequest != null) {
            return fechaVencimientoRequest;
        }
        if (condicion == CondicionPagoProveedor.CREDITO && diasCredito != null && diasCredito > 0) {
            return fechaNegocio.plusDays(diasCredito);
        }
        // CONTADO / sin condición: no forzar vencimiento.
        return null;
    }

    private ContactoSnapshot resolverContacto(Proveedor proveedor, CompraRequestDTO request) {
        if (request.getContactoProveedorId() != null) {
            Proveedor conContactos = proveedorService.obtenerEntidadConContactos(proveedor.getId());
            ContactoProveedor contacto = conContactos.getContactos().stream()
                .filter(c -> request.getContactoProveedorId().equals(c.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                    "El contacto no pertenece al proveedor seleccionado."));
            if (!contacto.isActivo()) {
                throw new BusinessException("El contacto del proveedor está inactivo.");
            }
            return new ContactoSnapshot(contacto.getId(), contacto.getNombre());
        }
        String nombre = normalizar(request.getContactoNombreSnapshot());
        return new ContactoSnapshot(null, nombre);
    }

    private Compra buscarOFallar(Long id) {
        return compraRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Compra no encontrada."));
    }

    private BigDecimal escalar(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    private record ContactoSnapshot(Long id, String nombre) {}
}
