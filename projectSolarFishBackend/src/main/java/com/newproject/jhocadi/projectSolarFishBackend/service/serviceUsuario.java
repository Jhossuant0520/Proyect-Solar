package com.newproject.jhocadi.projectSolarFishBackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.repositoryUsuario;

import java.util.Optional;

@Service
public class serviceUsuario {

    private final repositoryUsuario usuarioRepo;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public serviceUsuario(repositoryUsuario usuarioRepo) {
        this.usuarioRepo = usuarioRepo;
        this.passwordEncoder = new BCryptPasswordEncoder(); 
    }

    public void actualizarUltimoLogin(modelUsuario usuario) {
        usuarioRepo.save(usuario); // ya tiene el nuevo valor en el campo
    }
    

    public modelUsuario guardarUsuario(modelUsuario usuario) {
        if (usuario == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no puede ser nulo");
        }
        usuario.setPasswordUsuario(passwordEncoder.encode(usuario.getPasswordUsuario())); // Encriptar contraseña
        return usuarioRepo.save(usuario);
    }

    public Optional<modelUsuario> validarCredenciales(String nombreUsuario, String passwordPlano) {
        Optional<modelUsuario> optionalUsuario = usuarioRepo.findByNombreUsuario(nombreUsuario);

        if (optionalUsuario.isPresent()) {
            modelUsuario usuario = optionalUsuario.get();
            if (passwordEncoder.matches(passwordPlano, usuario.getPasswordUsuario())) {
                return Optional.of(usuario);
            }
        }

        return Optional.empty(); // credenciales inválidas
    }
    
    
    
}
