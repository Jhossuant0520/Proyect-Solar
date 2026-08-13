package com.newproject.jhocadi.projectSolvixBackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.fincaModel;

@Repository
public interface FincaRepository extends JpaRepository<fincaModel, Long> {
    
}
