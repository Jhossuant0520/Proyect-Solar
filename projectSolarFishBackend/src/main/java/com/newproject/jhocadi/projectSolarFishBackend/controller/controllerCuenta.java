package com.newproject.jhocadi.projectSolarFishBackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.CambiarPasswordDTO;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.repositoryUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.security.JwtUtil;
import com.newproject.jhocadi.projectSolarFishBackend.service.serviceUsuario;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cuenta")
@CrossOrigin("http://localhost:4200")
@RequiredArgsConstructor
public class controllerCuenta {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final serviceUsuario usuarioService;
    private final JwtUtil jwtUtil;
    private final repositoryUsuario usuarioRepo;

    private String extraerUsernameDelToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token no proporcionado");
        }
        String token = authHeader.substring(7);
        if (token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token no proporcionado");
        }
        return jwtUtil.getUsernameFromToken(token);
    }

    @GetMapping("/mis-datos")
    public ResponseEntity<Map<String, Object>> misDatos(HttpServletRequest request) {
        String username = extraerUsernameDelToken(request);
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

        return ResponseEntity.ok(datos);
    }

    @PutMapping("/cambiar-password")
    public ResponseEntity<Map<String, String>> cambiarPassword(
            @Valid @RequestBody CambiarPasswordDTO dto,
            HttpServletRequest request) {
        String username = extraerUsernameDelToken(request);
        usuarioService.cambiarPassword(username, dto);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente"));
    }
}
