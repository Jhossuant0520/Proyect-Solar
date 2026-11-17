package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.CuentaPorPagar;

public interface CuentaPorPagarRepository
        extends JpaRepository<CuentaPorPagar, Long>, JpaSpecificationExecutor<CuentaPorPagar> {

    Optional<CuentaPorPagar> findByCompraId(Long compraId);

    boolean existsByCompraId(Long compraId);
}
