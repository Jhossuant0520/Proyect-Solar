package com.newproject.jhocadi.projectSolvixBackend.controller.BusinessController.ModulProductoContro;

import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulProductoService.ProductoImagenService;

import lombok.RequiredArgsConstructor;

/**
 * Sirve imágenes de producto de forma pública (catálogo y admin).
 * No lista directorios: solo archivos con nombre UUID validado.
 */
@RestController
@RequestMapping("/api/v1/productos/imagenes")
@RequiredArgsConstructor
public class ProductoImagenPublicController {

    private final ProductoImagenService productoImagenService;

    @GetMapping("/{nombreArchivo:.+}")
    public ResponseEntity<Resource> verImagen(@PathVariable String nombreArchivo) {
        Resource archivo = productoImagenService.cargar(nombreArchivo);
        return ResponseEntity.ok()
            .contentType(productoImagenService.mediaTypeDe(nombreArchivo))
            .header("Cache-Control", "public, max-age=86400")
            .body(archivo);
    }
}
