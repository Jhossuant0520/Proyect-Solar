package com.newproject.jhocadi.projectComputerElectronicBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.fincaModel;

public interface FincaRepository extends JpaRepository<fincaModel, Long> {
    
}
