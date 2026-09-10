package com.newproject.jhocadi.projectSolvixBackend.repository.AccesRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.newproject.jhocadi.projectSolvixBackend.model.AccesModel.modelUsuario;

import java.util.Optional;

@Repository
public interface repositoryUsuario extends JpaRepository<modelUsuario, Integer> {
    
    Optional<modelUsuario> findByNombreUsuario(String nombreUsuario);

    @Transactional(readOnly = true)
    @Query("SELECT u FROM modelUsuario u JOIN FETCH u.rol WHERE u.nombreUsuario = :nombreUsuario")
    Optional<modelUsuario> findByNombreUsuarioWithRol(@Param("nombreUsuario") String nombreUsuario);

    Optional<modelUsuario> findByEmail(String email);

    Optional<modelUsuario> findByTokenVerificacion(String tokenVerificacion);

    
}
