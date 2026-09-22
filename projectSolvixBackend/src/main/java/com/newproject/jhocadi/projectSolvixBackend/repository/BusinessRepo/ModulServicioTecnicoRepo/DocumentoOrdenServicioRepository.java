package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.DocumentoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoDocumentoOrdenServicio;

public interface DocumentoOrdenServicioRepository extends JpaRepository<DocumentoOrdenServicio, Long> {

    List<DocumentoOrdenServicio> findByOrdenServicioIdOrderByFechaGeneracionDesc(Long ordenServicioId);

    Optional<DocumentoOrdenServicio> findByIdAndOrdenServicioId(Long id, Long ordenServicioId);

    @Query("""
        SELECT d FROM DocumentoOrdenServicio d
        WHERE d.ordenServicio.id = :ordenId
          AND d.tipoDocumento = :tipo
          AND (
            (:cotizacionId IS NULL AND d.cotizacion IS NULL)
            OR (d.cotizacion.id = :cotizacionId)
          )
        ORDER BY d.version DESC
        """)
    List<DocumentoOrdenServicio> findByOrdenServicioIdAndTipoDocumentoAndCotizacionIdOrderByVersionDesc(
        @Param("ordenId") Long ordenId,
        @Param("tipo") TipoDocumentoOrdenServicio tipo,
        @Param("cotizacionId") Long cotizacionId);

    @Query("""
        SELECT COALESCE(MAX(d.version), 0) FROM DocumentoOrdenServicio d
        WHERE d.ordenServicio.id = :ordenId
          AND d.tipoDocumento = :tipo
          AND (
            (:cotizacionId IS NULL AND d.cotizacion IS NULL)
            OR (d.cotizacion.id = :cotizacionId)
          )
        """)
    int findMaxVersion(
        @Param("ordenId") Long ordenId,
        @Param("tipo") TipoDocumentoOrdenServicio tipo,
        @Param("cotizacionId") Long cotizacionId);

    Optional<DocumentoOrdenServicio> findByTokenDocumento(String tokenDocumento);
}
