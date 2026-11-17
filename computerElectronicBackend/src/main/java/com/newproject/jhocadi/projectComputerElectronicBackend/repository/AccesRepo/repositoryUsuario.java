package com.newproject.jhocadi.projectComputerElectronicBackend.repository.AccesRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel.modelUsuario;

import java.util.Optional;

public interface repositoryUsuario extends JpaRepository<modelUsuario, Integer> {
    
    Optional<modelUsuario> findByNombreUsuario(String nombreUsuario);

    @Transactional(readOnly = true)
    @Query("SELECT u FROM modelUsuario u JOIN FETCH u.rol WHERE u.nombreUsuario = :nombreUsuario")
    Optional<modelUsuario> findByNombreUsuarioWithRol(@Param("nombreUsuario") String nombreUsuario);

    Optional<modelUsuario> findByEmail(String email);

    Optional<modelUsuario> findByTokenVerificacion(String tokenVerificacion);

    long countByRol_IdRol(Integer idRol);
}
