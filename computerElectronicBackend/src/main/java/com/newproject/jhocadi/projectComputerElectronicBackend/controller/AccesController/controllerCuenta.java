//hola
package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.CambiarPasswordDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.serviceUsuario;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cuenta")
@RequiredArgsConstructor
public class controllerCuenta {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final serviceUsuario usuarioService;

    /**
     * Identidad ya validada por {@code JwtAuthFilter} (principal = nombreUsuario).
     * No reparsea el JWT: evita divergencia con el SecurityContext.
     */
    private String usernameAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !StringUtils.hasText(auth.getName())
                || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token no proporcionado");
        }
        return auth.getName();
    }

    @GetMapping("/mis-datos")
    public ResponseEntity<Map<String, Object>> misDatos() {
        String username = usernameAutenticado();
        modelUsuario usuario = usuarioService.obtenerPorNombreUsuario(username);

        Map<String, Object> datos = new HashMap<>();
        datos.put("nombreUsuario", usuario.getNombreUsuario());
        datos.put("email", usuario.getEmail());
        datos.put("fechaCreacion", usuario.getFechaCreacion() != null
                ? usuario.getFechaCreacion().format(DATE_FORMATTER)
                : "N/A");
        datos.put("ultimoLogin", usuario.getUltimoLogin() != null
                ? usuario.getUltimoLogin().format(DATE_FORMATTER)
                : "Nunca");
        datos.put("fotoUrl", usuario.getFotoUrl());

        return ResponseEntity.ok(datos);
    }

    @PutMapping("/cambiar-password")
    public ResponseEntity<Map<String, String>> cambiarPassword(
            @Valid @RequestBody CambiarPasswordDTO dto) {
        String username = usernameAutenticado();
        usuarioService.cambiarPassword(username, dto);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente"));
    }

    @PostMapping(value = "/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> subirFoto(
            @RequestParam("archivo") MultipartFile archivo) {
        String username = usernameAutenticado();
        String fotoUrl = usuarioService.actualizarFoto(username, archivo);
        return ResponseEntity.ok(Map.of(
            "fotoUrl", fotoUrl,
            "mensaje", "Foto actualizada."
        ));
    }

    @DeleteMapping("/foto")
    public ResponseEntity<Map<String, String>> eliminarFoto() {
        String username = usernameAutenticado();
        usuarioService.eliminarFoto(username);
        return ResponseEntity.ok(Map.of("mensaje", "Foto eliminada."));
    }

    @GetMapping("/avatares/{nombreArchivo:.+}")
    public ResponseEntity<Resource> verAvatar(@PathVariable String nombreArchivo) {
        Resource archivo = usuarioService.obtenerArchivoFoto(nombreArchivo);
        return ResponseEntity.ok()
            .contentType(usuarioService.mediaTypeFoto(nombreArchivo))
            .header("Cache-Control", "no-store")
            .body(archivo);
    }
}
