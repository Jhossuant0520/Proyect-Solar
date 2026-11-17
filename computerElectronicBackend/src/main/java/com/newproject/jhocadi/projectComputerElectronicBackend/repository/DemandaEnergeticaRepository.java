package com.newproject.jhocadi.projectComputerElectronicBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.fincaModel;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.modelDemandaEnergetica;

import java.util.List;

public interface DemandaEnergeticaRepository extends JpaRepository<modelDemandaEnergetica, Long> {
    List<modelDemandaEnergetica> findByFinca(fincaModel finca);
}
