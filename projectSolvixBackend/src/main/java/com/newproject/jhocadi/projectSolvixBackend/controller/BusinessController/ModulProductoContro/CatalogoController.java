package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulProductoContro;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CatalogoCategoriaResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.CatalogoProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.CatalogoService;

import lombok.RequiredArgsConstructor;

/**
 * API pública del catálogo. Sin JWT. No acepta filtros de activos ni stock.
 */
@RestController
@RequestMapping("/api/v1/catalogo")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class CatalogoController {

    private final CatalogoService catalogoService;

    @GetMapping("/productos")
    public ResponseEntity<List<CatalogoProductoResponseDTO>> listarProductos() {
        return ResponseEntity.ok(catalogoService.listarProductos());
    }

    @GetMapping("/productos/{id}")
    public ResponseEntity<CatalogoProductoResponseDTO> obtenerProducto(@PathVariable Long id) {
        return ResponseEntity.ok(catalogoService.obtenerProducto(id));
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<CatalogoCategoriaResponseDTO>> listarCategorias() {
        return ResponseEntity.ok(catalogoService.listarCategorias());
    }
}
