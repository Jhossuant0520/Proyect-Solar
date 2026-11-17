package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.DocumentoCotizacionComercial;

public interface DocumentoCotizacionComercialRepository
        extends JpaRepository<DocumentoCotizacionComercial, Long> {

    List<DocumentoCotizacionComercial> findByCotizacionIdOrderByVersionDesc(Long cotizacionId);

    Optional<DocumentoCotizacionComercial> findByIdAndCotizacionId(Long id, Long cotizacionId);

    @Query("SELECT COALESCE(MAX(d.version), 0) FROM DocumentoCotizacionComercial d "
        + "WHERE d.cotizacion.id = :cotizacionId")
    int findMaxVersion(@Param("cotizacionId") Long cotizacionId);
}
