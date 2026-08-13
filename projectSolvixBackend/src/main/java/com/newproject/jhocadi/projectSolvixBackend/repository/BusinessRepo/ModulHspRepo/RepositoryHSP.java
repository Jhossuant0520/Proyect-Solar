package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulHspRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulHSPModel.modelHSP;

import java.util.List;

@Repository
public interface RepositoryHSP extends JpaRepository<modelHSP, Long> {
    List<modelHSP> findByUsuario_NombreUsuarioOrderByFechaRegistroDesc(String nombreUsuario);
}