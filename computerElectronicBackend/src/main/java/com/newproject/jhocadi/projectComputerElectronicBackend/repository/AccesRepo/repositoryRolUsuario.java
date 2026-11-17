package com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelRolUsuario;

public interface repositoryRolUsuario extends JpaRepository<modelRolUsuario, Integer> {

    Optional<modelRolUsuario> findByNombreRol(String nombreRol);
}
