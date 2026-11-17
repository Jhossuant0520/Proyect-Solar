package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.UsuarioAdminWriteDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.UsuarioResponseDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.serviceUsuario;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
@PreAuthorize("hasRole('ADMIN')")
public class controllerUsuario {

    private final serviceUsuario usuarioService;

    public controllerUsuario(serviceUsuario usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<UsuarioResponseDTO> listarUsuarios() {
        return usuarioService.listarUsuariosAdmin();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> obtenerUsuarioPorId(@PathVariable int id) {
        return ResponseEntity.ok(usuarioService.obtenerUsuarioAdmin(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponseDTO guardarUsuario(@Valid @RequestBody UsuarioAdminWriteDTO dto) {
        return usuarioService.crearUsuarioAdmin(dto);
    }

    @PutMapping("/{id}")
    public UsuarioResponseDTO actualizarUsuario(
            @PathVariable Integer id,
            @Valid @RequestBody UsuarioAdminWriteDTO dto) {
        return usuarioService.actualizarUsuarioAdmin(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarUsuario(@PathVariable int id) {
        usuarioService.eliminarUsuarioAdmin(id);
    }
}

