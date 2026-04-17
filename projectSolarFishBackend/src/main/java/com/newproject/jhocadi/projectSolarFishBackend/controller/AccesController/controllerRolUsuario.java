package com.newproject.jhocadi.projectSolarFishBackend.controller.AccesController;

import org.springframework.web.bind.annotation.*;

import com.newproject.jhocadi.projectSolarFishBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectSolarFishBackend.repository.AccesRepo.repositoryRolUsuario;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "http://localhost:4200")
public class controllerRolUsuario {

    private final repositoryRolUsuario rolRepo;

    public controllerRolUsuario(repositoryRolUsuario rolRepo) {
        this.rolRepo = rolRepo;
    }

    @PostMapping
    public modelRolUsuario crearRol(@RequestBody modelRolUsuario rol) {
        if (rol == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no puede ser nulo");
        }
        return rolRepo.save(rol);
    }

    @GetMapping
    public List<modelRolUsuario> listarRoles() {
        return rolRepo.findAll();
    }
}
