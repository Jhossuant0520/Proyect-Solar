package com.newproject.jhocadi.projectSolarFishBackend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.LoginRequestDTO;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.security.JwtUtil;
import com.newproject.jhocadi.projectSolarFishBackend.service.serviceUsuario;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class controllerUsuarioLogin {

    @Autowired
    private serviceUsuario service;

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
        String token = jwtUtil.generateToken(usuario.getNombreUsuario());

       
       usuario.setUltimoLogin(LocalDateTime.now());
       service.actualizarUltimoLogin(usuario); // lo crearemos ahora

        return ResponseEntity.ok().body(Map.of(
            "token", token,
            "usuario", usuario.getNombreUsuario(),
            "rol", usuario.getRol().getNombreRol()
        ));
    }
}
