package com.newproject.jhocadi.projectSolvixBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectSolvixBackend.model.fincaModel;
import com.newproject.jhocadi.projectSolvixBackend.model.modelDemandaEnergetica;

import java.util.List;

public interface DemandaEnergeticaRepository extends JpaRepository<modelDemandaEnergetica, Long> {
    List<modelDemandaEnergetica> findByFinca(fincaModel finca);
}
