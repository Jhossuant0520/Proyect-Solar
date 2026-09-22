package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.CotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio;

public interface CotizacionServicioRepository extends JpaRepository<CotizacionServicio, Long> {

    List<CotizacionServicio> findByOrdenServicioIdOrderByFechaCreacionAsc(Long ordenServicioId);

    Optional<CotizacionServicio> findByIdAndOrdenServicioId(Long id, Long ordenServicioId);

    boolean existsByOrdenServicioIdAndTipoAndEstadoIn(
        Long ordenServicioId,
        TipoCotizacionServicio tipo,
        List<EstadoCotizacionServicio> estados);

    boolean existsByOrdenServicioIdAndEstadoIn(
        Long ordenServicioId,
        List<EstadoCotizacionServicio> estados);

    long countByOrdenServicioIdAndTipoAndEstado(
        Long ordenServicioId,
        TipoCotizacionServicio tipo,
        EstadoCotizacionServicio estado);

    @Query("""
        SELECT COUNT(c) > 0 FROM CotizacionServicio c
        WHERE c.ordenServicio.id = :ordenId
          AND c.tipo = com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio.ADICIONAL
          AND c.estado = com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio.APROBADA
          AND c.fechaAprobacion IS NOT NULL
          AND c.fechaAprobacion >= :desde
        """)
    boolean existeAdicionalAprobadaDesde(
        @Param("ordenId") Long ordenId,
        @Param("desde") java.time.LocalDateTime desde);

    @Query("""
        SELECT COALESCE(SUM(c.total), 0) FROM CotizacionServicio c
        WHERE c.ordenServicio.id = :ordenId
          AND c.estado = com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio.APROBADA
        """)
    java.math.BigDecimal totalAutorizadoAprobado(@Param("ordenId") Long ordenId);
}
