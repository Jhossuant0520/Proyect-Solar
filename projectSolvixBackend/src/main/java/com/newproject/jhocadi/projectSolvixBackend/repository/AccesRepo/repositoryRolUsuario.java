package com.newproject.jhocadi.projectSolvixBackend.repository.AccesRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.AccesModel.modelRolUsuario;

@Repository
public interface repositoryRolUsuario extends JpaRepository<modelRolUsuario, Integer> {
}
