package com.newproject.jhocadi.projectComputerElectronicBackend.service.AcessService;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RolResponseDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.dtos.AccesDtos.RolWriteDTO;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryRolUsuario;
import com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo.repositoryUsuario;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class serviceRolUsuario {

    private final repositoryRolUsuario rolRepo;
    private final repositoryUsuario usuarioRepo;

    @Transactional(readOnly = true)
    public List<RolResponseDTO> listarRoles() {
        return rolRepo.findAll().stream().map(RolResponseDTO::fromEntity).toList();
    }

    @Transactional
    public RolResponseDTO crearRol(RolWriteDTO dto) {
        String nombre = dto.getNombreRol().trim();
        if (nombre.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del rol es obligatorio");
        }
        if (rolRepo.findByNombreRol(nombre).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un rol con ese nombre");
        }

        modelRolUsuario rol = new modelRolUsuario();
        rol.setNombreRol(nombre);
        rol.setDescripcionRol(dto.getDescripcionRol() != null ? dto.getDescripcionRol().trim() : null);
        return RolResponseDTO.fromEntity(rolRepo.save(rol));
    }

    /**
     * Eliminación no expuesta por API hoy; validación lista si se habilita.
     * Impide borrar roles referenciados por usuarios (id_rol NOT NULL en usuarios).
     */
    @Transactional
    public void eliminarRolSiSinUsuarios(Integer idRol) {
        modelRolUsuario rol = rolRepo.findById(idRol)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rol no encontrado"));

        long asignados = usuarioRepo.countByRol_IdRol(idRol);
        if (asignados > 0) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No se puede eliminar el rol: hay usuarios asignados");
        }
        rolRepo.delete(rol);
    }
}
