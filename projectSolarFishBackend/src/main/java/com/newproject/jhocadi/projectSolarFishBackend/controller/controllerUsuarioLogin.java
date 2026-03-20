package com.newproject.jhocadi.projectSolarFishBackend.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.LoginRequestDTO;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.RegistroRequestDTO;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.repositoryUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.security.JwtUtil;
import com.newproject.jhocadi.projectSolarFishBackend.service.EmailService;
import com.newproject.jhocadi.projectSolarFishBackend.service.serviceUsuario;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class controllerUsuarioLogin {

    @Autowired
    private serviceUsuario service;

    @Autowired
    private repositoryUsuario usuarioRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO loginDTO) {
        java.util.Optional<modelUsuario> optionalUsuario = service.validarCredenciales(
            loginDTO.getNombreUsuario(),
            loginDTO.getPasswordUsuario()
        );

        if (optionalUsuario.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas");
        }

        modelUsuario usuario = optionalUsuario.get();
        if (!usuario.isEmailVerificado()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    "Debes verificar tu email antes de iniciar sesión."
            );
        }
        String token = jwtUtil.generateToken(usuario.getNombreUsuario());

       
       usuario.setUltimoLogin(LocalDateTime.now());
       service.actualizarUltimoLogin(usuario); // lo crearemos ahora

        return ResponseEntity.ok().body(Map.of(
            "token", token,
            "usuario", usuario.getNombreUsuario(),
            "rol", usuario.getRol().getNombreRol()
        ));
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(@Valid @RequestBody RegistroRequestDTO dto) {
        service.registrarUsuario(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of("mensaje", "Registro exitoso. Revisa tu correo para verificar tu cuenta.")
        );
    }

    @GetMapping("/verificar-email")
    public ResponseEntity<?> verificarEmail(@RequestParam String token) {
        java.util.Optional<modelUsuario> optionalUsuario = usuarioRepo.findByTokenVerificacion(token);

        if (optionalUsuario.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("mensaje", "Token inválido o expirado")
            );
        }

        modelUsuario usuario = optionalUsuario.get();
        if (usuario.getTokenVerificacionExpiracion() != null
                && usuario.getTokenVerificacionExpiracion().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                    Map.of("mensaje", "El enlace de verificación ha expirado. Solicita uno nuevo.")
            );
        }

        usuario.setEmailVerificado(true);
        usuario.setTokenVerificacion(null);
        usuario.setTokenVerificacionExpiracion(null);
        usuarioRepo.save(usuario);

        return ResponseEntity.ok().body(
                Map.of("mensaje", "Email verificado correctamente. Ya puedes iniciar sesión.")
        );
    }

    @PostMapping("/reenviar-verificacion")
    public ResponseEntity<?> reenviarVerificacion(@RequestBody Map<String, String> body) {
        String mensajeGenerico = "Si el email existe, recibirás un nuevo enlace.";
        String email = body != null ? body.get("email") : null;

        if (email == null || email.isBlank()) {
            return ResponseEntity.ok().body(Map.of("mensaje", mensajeGenerico));
        }

        Optional<modelUsuario> optUsuario = usuarioRepo.findByEmail(email);

        if (optUsuario.isEmpty()) {
            return ResponseEntity.ok().body(Map.of("mensaje", mensajeGenerico));
        }

        modelUsuario usr = optUsuario.get();

        if (usr.isEmailVerificado()) {
            return ResponseEntity.ok().body(Map.of("mensaje", mensajeGenerico));
        }

        String nuevoToken = UUID.randomUUID().toString();
        usr.setTokenVerificacion(nuevoToken);
        usr.setTokenVerificacionExpiracion(LocalDateTime.now().plusHours(24));
        usuarioRepo.save(usr);
        emailService.enviarEmailVerificacion(usr.getEmail(), nuevoToken);

        return ResponseEntity.ok().body(Map.of("mensaje", mensajeGenerico));
    }
}
