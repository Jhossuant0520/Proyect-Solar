package com.newproject.jhocadi.projectSolarFishBackend.repository.BusinessRepo.ModulSolarRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulSolarModel.modelPanelSolares;
import org.springframework.stereotype.Repository;

@Repository
public interface PanelesRepository extends JpaRepository<modelPanelSolares, Long> {

    
}
