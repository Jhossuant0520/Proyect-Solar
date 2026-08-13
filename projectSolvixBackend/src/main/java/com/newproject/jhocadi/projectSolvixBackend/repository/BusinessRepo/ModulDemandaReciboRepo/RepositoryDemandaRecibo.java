package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulDemandaReciboRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulDemandaReciboModel.modelDemandaRecibo;

@Repository
public interface RepositoryDemandaRecibo extends JpaRepository<modelDemandaRecibo, Long> {
    
}