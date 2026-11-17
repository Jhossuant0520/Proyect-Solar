package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.LoginRequestDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RegistroRequestDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.AuthRateLimiter;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.ClientIpResolver;
import com.newproject.jhocadi.projectComputerElectronicBackend.security.JwtUtil;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.EmailService;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.serviceUsuario;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class controllerUsuarioLogin {

    private final serviceUsuario service;
    private final repositoryUsuario usuarioRepo;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;
    private final AuthRateLimiter authRateLimiter;
    private final ClientIpResolver clientIpResolver;

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequestDTO loginDTO,
            HttpServletRequest httpRequest) {
        authRateLimiter.checkLogin(clientIpResolver.resolve(httpRequest));

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
        String rol = usuario.getRol() != null ? usuario.getRol().getNombreRol() : "USUARIO";
        String token = jwtUtil.generateToken(usuario.getNombreUsuario(), rol);

       usuario.setUltimoLogin(LocalDateTime.now());
       service.actualizarUltimoLogin(usuario);

        return ResponseEntity.ok().body(Map.of(
            "token", token,
            "usuario", usuario.getNombreUsuario(),
            "rol", usuario.getRol().getNombreRol()
        ));
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registro(
            @Valid @RequestBody RegistroRequestDTO dto,
            HttpServletRequest httpRequest) {
        authRateLimiter.checkRegistro(clientIpResolver.resolve(httpRequest));
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
    public ResponseEntity<?> reenviarVerificacion(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {
        // Límite por IP antes de lookup/envío; no depende del email (manipulable).
        authRateLimiter.checkReenviarVerificacion(clientIpResolver.resolve(httpRequest));

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
