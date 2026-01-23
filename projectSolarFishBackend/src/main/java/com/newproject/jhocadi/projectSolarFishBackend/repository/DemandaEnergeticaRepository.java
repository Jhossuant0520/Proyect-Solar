package com.newproject.jhocadi.projectSolarFishBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.newproject.jhocadi.projectSolarFishBackend.model.modelDemandaEnergetica;
import com.newproject.jhocadi.projectSolarFishBackend.model.fincaModel;
import java.util.List;

public interface DemandaEnergeticaRepository extends JpaRepository<modelDemandaEnergetica, Long> {
    List<modelDemandaEnergetica> findByFinca(fincaModel finca);
}
