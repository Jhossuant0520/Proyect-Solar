package com.newproject.jhocadi.projectComputerElectronicBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.componenteEnergeticoModel;

import java.util.List;

public interface ComponenteEnergeticoRepository extends JpaRepository<componenteEnergeticoModel, Long> {
    @Query("SELECT c FROM componenteEnergeticoModel c JOIN FETCH c.finca WHERE c.finca.id = :fincaId")
    List<componenteEnergeticoModel> findByFincaId(@Param("fincaId") Long fincaId);
}
