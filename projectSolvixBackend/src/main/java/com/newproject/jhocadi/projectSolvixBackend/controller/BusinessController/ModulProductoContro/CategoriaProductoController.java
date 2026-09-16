package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulProductoContro;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CategoriaProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CategoriaProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.CategoriaProductoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/categorias-producto")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CategoriaProductoController {

    private final CategoriaProductoService categoriaService;

    /** Listado administrativo. El catálogo público usa {@code GET /api/v1/catalogo/categorias}. */
    @GetMapping
    public ResponseEntity<List<CategoriaProductoResponseDTO>> listar(
            @RequestParam(required = false, defaultValue = "true") Boolean soloActivas) {
        return ResponseEntity.ok(categoriaService.listar(soloActivas));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoriaProductoResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(categoriaService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<CategoriaProductoResponseDTO> crear(
            @Valid @RequestBody CategoriaProductoRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaProductoResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody CategoriaProductoRequestDTO request) {
        return ResponseEntity.ok(categoriaService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<CategoriaProductoResponseDTO> desactivar(@PathVariable Long id) {
        return ResponseEntity.ok(categoriaService.desactivar(id));
    }
}
