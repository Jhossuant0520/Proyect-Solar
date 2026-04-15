package com.newproject.jhocadi.projectSolarFishBackend.repository;

import com.newproject.jhocadi.projectSolarFishBackend.model.modelDemandaRecibo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RepositoryDemandaRecibo extends JpaRepository<modelDemandaRecibo, Long> {
    // Aquí puedes añadir métodos de búsqueda personalizados en el futuro
}