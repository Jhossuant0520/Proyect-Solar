package com.newproject.jhocadi.projectComputerElectronicBackend.controller.AccesController;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RolResponseDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RolWriteDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService.serviceRolUsuario;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/roles")
@PreAuthorize("hasRole('ADMIN')")
public class controllerRolUsuario {

    private final serviceRolUsuario rolService;

    public controllerRolUsuario(serviceRolUsuario rolService) {
        this.rolService = rolService;
    }

    @GetMapping
    public List<RolResponseDTO> listarRoles() {
        return rolService.listarRoles();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RolResponseDTO crearRol(@Valid @RequestBody RolWriteDTO dto) {
        return rolService.crearRol(dto);
    }
}
