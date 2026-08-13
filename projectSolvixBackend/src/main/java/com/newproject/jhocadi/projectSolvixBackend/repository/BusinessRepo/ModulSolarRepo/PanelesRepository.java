package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulSolarRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulSolarModel.modelPanelSolares;

@Repository
public interface PanelesRepository extends JpaRepository<modelPanelSolares, Long> {

    
}
