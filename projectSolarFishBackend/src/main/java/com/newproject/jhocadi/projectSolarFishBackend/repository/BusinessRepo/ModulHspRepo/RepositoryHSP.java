package com.newproject.jhocadi.projectSolarFishBackend.repository.BusinessRepo.ModulHspRepo;

import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulHSPModel.modelHSP;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RepositoryHSP extends JpaRepository<modelHSP, Long> {
    List<modelHSP> findByUsuario_NombreUsuarioOrderByFechaRegistroDesc(String nombreUsuario);
}