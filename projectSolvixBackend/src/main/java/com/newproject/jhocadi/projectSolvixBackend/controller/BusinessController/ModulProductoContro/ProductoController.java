package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulProductoContro;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoRequestDTO;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulProductoDtos.ProductoResponseDTO;
import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.ProductoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * API administrativa de productos. Incluye costo, stock y código de barras.
 * El catálogo público vive en {@link CatalogoController}.
 */
@RestController
@RequestMapping("/api/v1/productos")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ProductoController {

    private final ProductoService productoService;

    @PostMapping
    public ResponseEntity<ProductoResponseDTO> crear(
            @Valid @RequestBody ProductoRequestDTO request,
            Principal principal) {
        String usuario = principal != null ? principal.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(productoService.crear(request, usuario));
    }

    /**
     * Listado administrativo. Si no se envía {@code activo}, devuelve activos e inactivos.
     * El catálogo público no usa este endpoint.
     */
    @GetMapping
    public ResponseEntity<List<ProductoResponseDTO>> listar(
            @RequestParam(required = false) String marca,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) Integer stockMin,
            @RequestParam(required = false) Boolean activo) {

        return ResponseEntity.ok(
            productoService.listar(marca, categoriaId, precioMin, precioMax, stockMin, activo)
        );
    }

    /**
     * Búsqueda exacta por código de barras. Operativa interna (ventas/compras).
     * Debe declararse antes de {@code /{id}}.
     */
    @GetMapping("/codigo-barras/{codigoBarras}")
    public ResponseEntity<ProductoResponseDTO> obtenerPorCodigoBarras(
            @PathVariable String codigoBarras) {
        return ResponseEntity.ok(productoService.obtenerPorCodigoBarras(codigoBarras));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ProductoRequestDTO request,
            Principal principal) {
        return ResponseEntity.ok(productoService.actualizar(id, request));
    }

    /**
     * Subida de imagen local. Parámetro multipart: {@code file}.
     * Actualiza {@code imagenUrl} con la ruta pública relativa de SOLVIX.
     */
    @PostMapping(value = "/{id}/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductoResponseDTO> subirImagen(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productoService.subirImagen(id, file));
    }

    /** Elimina la referencia de imagen (y el archivo local si aplica). */
    @DeleteMapping("/{id}/imagen")
    public ResponseEntity<ProductoResponseDTO> eliminarImagen(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.eliminarImagen(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ProductoResponseDTO> desactivar(
            @PathVariable Long id,
            Principal principal) {
        return ResponseEntity.ok(productoService.desactivar(id));
    }
}
