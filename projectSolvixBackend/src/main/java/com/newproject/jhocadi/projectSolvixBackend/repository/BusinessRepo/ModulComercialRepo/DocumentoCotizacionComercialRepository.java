package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DocumentoCotizacionComercial;

@Repository
public interface DocumentoCotizacionComercialRepository
        extends JpaRepository<DocumentoCotizacionComercial, Long> {

    List<DocumentoCotizacionComercial> findByCotizacionIdOrderByVersionDesc(Long cotizacionId);

    Optional<DocumentoCotizacionComercial> findByIdAndCotizacionId(Long id, Long cotizacionId);

    @Query("SELECT COALESCE(MAX(d.version), 0) FROM DocumentoCotizacionComercial d "
        + "WHERE d.cotizacion.id = :cotizacionId")
    int findMaxVersion(@Param("cotizacionId") Long cotizacionId);
}
