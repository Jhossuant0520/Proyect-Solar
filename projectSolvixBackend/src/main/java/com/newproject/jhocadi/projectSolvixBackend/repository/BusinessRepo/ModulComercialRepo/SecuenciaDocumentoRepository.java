package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.SecuenciaDocumento;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.TipoSecuencia;

import jakarta.persistence.LockModeType;

@Repository
public interface SecuenciaDocumentoRepository extends JpaRepository<SecuenciaDocumento, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SecuenciaDocumento> findByTipoAndAnio(TipoSecuencia tipo, Integer anio);
}
