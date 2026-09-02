package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.CategoriaProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoSpecifications;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.InventarioService;

import lombok.RequiredArgsConstructor;

/**
 * Gestión de datos maestros del producto.
 *
 * <p>Regla de inventario: este servicio NO modifica el stock ni el costo vigente. El stock
 * inicial se registra como movimiento a través de {@link InventarioService}. El costo solo se
 * fija aquí al crear el producto; a partir de entonces lo gobierna la política de costeo o un
 * ajuste de costo explícito.
 */
@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaProductoRepository categoriaRepository;
    private final InventarioService inventarioService;

    @Transactional
    public ProductoResponseDTO crear(ProductoRequestDTO request, String usuario) {
        Producto producto = new Producto();
        aplicarDatosMaestros(producto, request);
        // Único momento en que el catálogo fija el costo: es el punto de partida del producto.
        // A partir de aquí lo gobierna la política de costeo o un ajuste de costo explícito.
        producto.setCostoActual(request.getCostoActual());
        producto.setStockActual(0);

        Producto guardado = productoRepository.save(producto);

        Integer stockInicial = request.getStockInicial();
        if (stockInicial != null && stockInicial > 0) {
            inventarioService.registrarCargaInicial(guardado, stockInicial, usuario);
        }

        return ProductoResponseDTO.fromEntity(guardado);
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseDTO> listar(
            String marca,
            Long categoriaId,
            BigDecimal precioMin,
            BigDecimal precioMax,
            Integer stockMin,
            Boolean activo) {

        validarRangoPrecio(precioMin, precioMax);

        return productoRepository
            .findAll(ProductoSpecifications.conFiltros(marca, categoriaId, precioMin, precioMax, stockMin, activo))
            .stream()
            .map(ProductoResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public ProductoResponseDTO obtenerPorId(Long id) {
        return ProductoResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional
    public ProductoResponseDTO actualizar(Long id, ProductoRequestDTO request) {
        Producto producto = buscarOFallar(id);
        rechazarCambioDirectoDeStock(producto, request);
        rechazarCambioDirectoDeCosto(producto, request);
        aplicarDatosMaestros(producto, request);
        return ProductoResponseDTO.fromEntity(productoRepository.save(producto));
    }

    /** Soft-delete: marca el producto como inactivo en lugar de borrarlo físicamente. */
    @Transactional
    public ProductoResponseDTO desactivar(Long id) {
        Producto producto = buscarOFallar(id);
        producto.setActivo(false);
        return ProductoResponseDTO.fromEntity(productoRepository.save(producto));
    }

    @Transactional(readOnly = true)
    public Producto buscarOFallar(Long id) {
        return productoRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado."));
    }

    private void aplicarDatosMaestros(Producto producto, ProductoRequestDTO request) {
        CategoriaProducto categoria = categoriaRepository.findById(request.getCategoriaId())
            .orElseThrow(() -> new BusinessException("La categoría indicada no existe."));

        producto.setNombre(request.getNombre().trim());
        producto.setMarca(request.getMarca().trim());
        producto.setCategoria(categoria);
        producto.setPrecioVentaActual(request.getPrecioVentaActual());
        producto.setDescripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : null);
        producto.setImagenUrl(request.getImagenUrl() != null ? request.getImagenUrl().trim() : null);
        if (request.getActivo() != null) {
            producto.setActivo(request.getActivo());
        }
    }

    private void rechazarCambioDirectoDeStock(Producto producto, ProductoRequestDTO request) {
        Integer stockSolicitado = request.getStockInicial();
        if (stockSolicitado == null) {
            return;
        }

        int stockVigente = producto.getStockActual() != null ? producto.getStockActual() : 0;
        if (stockSolicitado != stockVigente) {
            throw new BusinessException(
                "El stock no puede modificarse desde la edición del producto. "
                + "Usa compras, ventas o un ajuste de inventario para dejar trazabilidad.");
        }
    }

    /**
     * El costo vigente no es un campo del catálogo: lo determina la política de costeo al
     * completar una compra, o una corrección explícita en
     * {@code POST /api/v1/inventario/ajustes/costo}. Editarlo desde aquí dejaría el margen
     * histórico sin trazabilidad.
     *
     * <p>Se acepta que el PUT reenvíe el costo vigente sin cambios, para que el cliente pueda
     * mandar el objeto completo; solo se rechaza el intento real de modificarlo.
     */
    private void rechazarCambioDirectoDeCosto(Producto producto, ProductoRequestDTO request) {
        BigDecimal costoSolicitado = request.getCostoActual();
        if (costoSolicitado == null) {
            return;
        }

        BigDecimal costoVigente = producto.getCostoActual();
        if (costoVigente != null && costoVigente.compareTo(costoSolicitado) == 0) {
            return;
        }

        throw new BusinessException(
            "El costo no puede modificarse desde la edición del producto. "
            + "Registra un ajuste de costo en /api/v1/inventario/ajustes/costo para dejar trazabilidad.");
    }

    private void validarRangoPrecio(BigDecimal precioMin, BigDecimal precioMax) {
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            throw new BusinessException("El precio mínimo no puede ser mayor que el precio máximo.");
        }
    }
}
