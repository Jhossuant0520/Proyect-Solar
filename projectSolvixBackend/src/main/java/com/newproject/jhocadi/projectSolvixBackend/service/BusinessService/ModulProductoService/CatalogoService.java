package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CatalogoCategoriaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CatalogoProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.CategoriaProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;

import lombok.RequiredArgsConstructor;

/**
 * Lectura pública del catálogo. Solo productos y categorías activos.
 * No reutiliza {@code ProductoResponseDTO}: el costo y el stock numérico no salen de aquí.
 */
@Service
@RequiredArgsConstructor
public class CatalogoService {

    private final ProductoRepository productoRepository;
    private final CategoriaProductoRepository categoriaRepository;

    @Transactional(readOnly = true)
    public List<CatalogoProductoResponseDTO> listarProductos() {
        return productoRepository.findByActivoTrue().stream()
            .map(CatalogoProductoResponseDTO::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public CatalogoProductoResponseDTO obtenerProducto(Long id) {
        Producto producto = productoRepository.findById(id)
            .filter(Producto::isActivo)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado."));
        return CatalogoProductoResponseDTO.fromEntity(producto);
    }

    @Transactional(readOnly = true)
    public List<CatalogoCategoriaResponseDTO> listarCategorias() {
        return categoriaRepository.findByActivoTrueOrderByNombreAsc().stream()
            .map(CatalogoCategoriaResponseDTO::fromEntity)
            .toList();
    }
}
