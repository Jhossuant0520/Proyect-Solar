package com.newproject.jhocadi.projectSolarFishBackend.repository.BusinessRepo.ModulDemandaReciboRepo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulDemandaReciboModel.modelDemandaRecibo;

@Repository
public interface RepositoryDemandaRecibo extends JpaRepository<modelDemandaRecibo, Long> {
    // Aquí puedes añadir métodos de búsqueda personalizados en el futuro
}