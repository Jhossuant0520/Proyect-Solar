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
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoSpecifications;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;

    @Transactional
    public ProductoResponseDTO crear(ProductoRequestDTO request) {
        Producto producto = mapRequestToEntity(new Producto(), request);
        if (request.getActivo() == null) {
            producto.setActivo(true);
        }
        return ProductoResponseDTO.fromEntity(productoRepository.save(producto));
    }

    @Transactional(readOnly = true)
    public List<ProductoResponseDTO> listar(
            String marca,
            CategoriaProducto categoria,
            BigDecimal precioMin,
            BigDecimal precioMax,
            Integer stockMin,
            Boolean activo) {

        validarRangoPrecio(precioMin, precioMax);

        return productoRepository
            .findAll(ProductoSpecifications.conFiltros(marca, categoria, precioMin, precioMax, stockMin, activo))
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
        mapRequestToEntity(producto, request);
        return ProductoResponseDTO.fromEntity(productoRepository.save(producto));
    }

    /**
     * Soft-delete: marca el producto como inactivo en lugar de borrarlo físicamente.
     */
    @Transactional
    public ProductoResponseDTO desactivar(Long id) {
        Producto producto = buscarOFallar(id);
        producto.setActivo(false);
        return ProductoResponseDTO.fromEntity(productoRepository.save(producto));
    }

    private Producto buscarOFallar(Long id) {
        return productoRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado."));
    }

    private Producto mapRequestToEntity(Producto producto, ProductoRequestDTO request) {
        producto.setNombre(request.getNombre().trim());
        producto.setMarca(request.getMarca().trim());
        producto.setCategoria(request.getCategoria());
        producto.setPrecio(request.getPrecio());
        producto.setCantidadStock(request.getCantidadStock());
        producto.setDescripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : null);
        producto.setImagenUrl(request.getImagenUrl() != null ? request.getImagenUrl().trim() : null);
        if (request.getActivo() != null) {
            producto.setActivo(request.getActivo());
        }
        return producto;
    }

    private void validarRangoPrecio(BigDecimal precioMin, BigDecimal precioMax) {
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            throw new BusinessException("El precio mínimo no puede ser mayor que el precio máximo.");
        }
    }
}
