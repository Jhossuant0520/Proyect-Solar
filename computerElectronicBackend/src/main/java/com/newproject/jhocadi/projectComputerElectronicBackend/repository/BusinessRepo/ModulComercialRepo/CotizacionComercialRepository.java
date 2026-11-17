package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.CotizacionComercial;

public interface CotizacionComercialRepository
        extends JpaRepository<CotizacionComercial, Long>, JpaSpecificationExecutor<CotizacionComercial> {

    Optional<CotizacionComercial> findByTokenConsulta(String tokenConsulta);
}
