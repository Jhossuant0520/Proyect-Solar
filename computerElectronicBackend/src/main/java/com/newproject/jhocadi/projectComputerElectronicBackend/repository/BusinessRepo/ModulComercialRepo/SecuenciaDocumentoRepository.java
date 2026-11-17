package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.SecuenciaDocumento;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;

import jakarta.persistence.LockModeType;

public interface SecuenciaDocumentoRepository extends JpaRepository<SecuenciaDocumento, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SecuenciaDocumento> findByTipoAndAnio(TipoSecuencia tipo, Integer anio);
}
