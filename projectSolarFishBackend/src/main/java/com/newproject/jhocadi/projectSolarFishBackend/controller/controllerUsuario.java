package com.newproject.jhocadi.projectSolarFishBackend.controller;

import org.springframework.web.bind.annotation.*;

import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.repositoryUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.service.serviceUsuario;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:4200")
public class controllerUsuario {

    private final repositoryUsuario usuarioRepo;
    private final serviceUsuario usuarioService;

    public controllerUsuario(repositoryUsuario usuarioRepo , serviceUsuario usuarioService) {
        this.usuarioService = usuarioService;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping
    public List<modelUsuario> listarUsuarios() {
        return usuarioRepo.findAll();
    }

    @GetMapping("/{id}")
    public org.springframework.http.ResponseEntity<modelUsuario> obtenerUsuarioPorId(@PathVariable int id) {
        return usuarioRepo.findById(id)
                .map(org.springframework.http.ResponseEntity::ok)
                .orElseGet(() -> org.springframework.http.ResponseEntity.notFound().build());
    }

   

    @PostMapping
    public modelUsuario guardarUsuario(@RequestBody modelUsuario usuario) {
        // usa el service para que encripte antes de salvar
        return usuarioService.guardarUsuario(usuario);
    }

    @PutMapping("/{id}")
    public modelUsuario actualizarUsuario(@PathVariable Integer id, @RequestBody modelUsuario usuario) {
        usuario.setIdUsuario(id);
        return usuarioRepo.save(usuario);
    }

    @DeleteMapping("/{id}")
    public void eliminarUsuario(@PathVariable int id) {
        usuarioRepo.deleteById(id);
    }
}
