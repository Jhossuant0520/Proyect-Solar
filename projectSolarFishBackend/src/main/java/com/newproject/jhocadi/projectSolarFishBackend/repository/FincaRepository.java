package com.newproject.jhocadi.projectSolarFishBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.newproject.jhocadi.projectSolarFishBackend.model.fincaModel;
import org.springframework.stereotype.Repository;

@Repository
public interface FincaRepository extends JpaRepository<fincaModel, Long> {
    
}
