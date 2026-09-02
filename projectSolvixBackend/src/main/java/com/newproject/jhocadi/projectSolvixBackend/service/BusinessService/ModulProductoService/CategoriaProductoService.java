package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CategoriaProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CategoriaProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.exception.BusinessException;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.CategoriaProducto;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.CategoriaProductoRepository;
import com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulProductoRepo.ProductoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoriaProductoService {

    private final CategoriaProductoRepository categoriaRepository;
    private final ProductoRepository productoRepository;

    @Transactional
    public CategoriaProductoResponseDTO crear(CategoriaProductoRequestDTO request) {
        String codigo = normalizarCodigo(request.getCodigo());

        if (categoriaRepository.existsByCodigoIgnoreCase(codigo)) {
            throw new BusinessException("Ya existe una categoría con el código " + codigo + ".");
        }

        CategoriaProducto categoria = CategoriaProducto.builder()
            .codigo(codigo)
            .nombre(request.getNombre().trim())
            .activo(request.getActivo() == null || request.getActivo())
            .build();

        return CategoriaProductoResponseDTO.fromEntity(categoriaRepository.save(categoria));
    }

    @Transactional(readOnly = true)
    public List<CategoriaProductoResponseDTO> listar(Boolean soloActivas) {
        List<CategoriaProducto> categorias = Boolean.TRUE.equals(soloActivas)
            ? categoriaRepository.findByActivoTrueOrderByNombreAsc()
            : categoriaRepository.findAll();

        return categorias.stream().map(CategoriaProductoResponseDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public CategoriaProductoResponseDTO obtenerPorId(Long id) {
        return CategoriaProductoResponseDTO.fromEntity(buscarOFallar(id));
    }

    @Transactional
    public CategoriaProductoResponseDTO actualizar(Long id, CategoriaProductoRequestDTO request) {
        CategoriaProducto categoria = buscarOFallar(id);
        String codigo = normalizarCodigo(request.getCodigo());

        boolean codigoCambio = !categoria.getCodigo().equalsIgnoreCase(codigo);
        if (codigoCambio && categoriaRepository.existsByCodigoIgnoreCase(codigo)) {
            throw new BusinessException("Ya existe una categoría con el código " + codigo + ".");
        }

        categoria.setCodigo(codigo);
        categoria.setNombre(request.getNombre().trim());
        if (request.getActivo() != null) {
            categoria.setActivo(request.getActivo());
        }

        return CategoriaProductoResponseDTO.fromEntity(categoriaRepository.save(categoria));
    }

    /** Desactivación lógica: no se borra para no romper el histórico de productos. */
    @Transactional
    public CategoriaProductoResponseDTO desactivar(Long id) {
        CategoriaProducto categoria = buscarOFallar(id);
        categoria.setActivo(false);
        return CategoriaProductoResponseDTO.fromEntity(categoriaRepository.save(categoria));
    }

    @Transactional(readOnly = true)
    public CategoriaProducto buscarOFallar(Long id) {
        return categoriaRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoría no encontrada."));
    }

    @Transactional(readOnly = true)
    public boolean tieneProductosAsociados(Long categoriaId) {
        return productoRepository.existsByCategoriaId(categoriaId);
    }

    private String normalizarCodigo(String codigo) {
        return codigo.trim().toUpperCase().replace(' ', '_');
    }
}
