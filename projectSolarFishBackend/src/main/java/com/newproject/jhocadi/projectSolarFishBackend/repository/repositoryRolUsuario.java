package com.newproject.jhocadi.projectSolarFishBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolarFishBackend.model.modelRolUsuario;

@Repository
public interface repositoryRolUsuario extends JpaRepository<modelRolUsuario, Integer> {
}
