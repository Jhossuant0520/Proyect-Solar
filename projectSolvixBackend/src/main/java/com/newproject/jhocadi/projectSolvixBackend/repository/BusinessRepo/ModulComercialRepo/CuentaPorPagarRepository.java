package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.CuentaPorPagar;

@Repository
public interface CuentaPorPagarRepository
        extends JpaRepository<CuentaPorPagar, Long>, JpaSpecificationExecutor<CuentaPorPagar> {

    Optional<CuentaPorPagar> findByCompraId(Long compraId);

    boolean existsByCompraId(Long compraId);
}
