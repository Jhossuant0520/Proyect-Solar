package com.newproject.jhocadi.projectSolarFishBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolarFishBackend.model.modelUsuario;

import java.util.Optional;

@Repository
public interface repositoryUsuario extends JpaRepository<modelUsuario, Integer> {
    
    Optional<modelUsuario> findByNombreUsuario(String nombreUsuario);

    Optional<modelUsuario> findByEmail(String email);

    Optional<modelUsuario> findByTokenVerificacion(String tokenVerificacion);

    
}
