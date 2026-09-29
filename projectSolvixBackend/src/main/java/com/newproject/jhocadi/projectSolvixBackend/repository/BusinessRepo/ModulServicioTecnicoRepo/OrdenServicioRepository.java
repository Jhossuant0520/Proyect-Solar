package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicio;

public interface OrdenServicioRepository extends JpaRepository<OrdenServicio, Long> {

    Optional<OrdenServicio> findByNumero(String numero);

    List<OrdenServicio> findByClienteIdOrderByFechaRecepcionDesc(Long clienteId);

    List<OrdenServicio> findByEquipoIdOrderByFechaRecepcionDesc(Long equipoId);

    List<OrdenServicio> findByEstadoOrderByFechaRecepcionDesc(EstadoOrdenServicio estado);

    List<OrdenServicio> findAllByOrderByFechaRecepcionDesc();

    boolean existsByEquipoId(Long equipoId);

    boolean existsByEquipoIdAndEstadoNotIn(Long equipoId, Collection<EstadoOrdenServicio> estados);

    Optional<OrdenServicio> findByTokenConsulta(String tokenConsulta);

    /**
     * Búsqueda parcial: número OT, cliente (nombre/documento/teléfono),
     * equipo (marca/modelo/serie/referencia).
     */
    @Query("""
        SELECT o FROM OrdenServicio o
        JOIN o.cliente c
        JOIN o.equipo e
        WHERE (:estado IS NULL OR o.estado = :estado)
          AND (:clienteId IS NULL OR c.id = :clienteId)
          AND (:equipoId IS NULL OR e.id = :equipoId)
          AND (
            :patron IS NULL
            OR LOWER(o.numero) LIKE :patron
            OR LOWER(c.nombre) LIKE :patron
            OR LOWER(COALESCE(c.numeroDocumento, '')) LIKE :patron
            OR LOWER(COALESCE(c.telefono, '')) LIKE :patron
            OR LOWER(COALESCE(e.marca, '')) LIKE :patron
            OR LOWER(COALESCE(e.modelo, '')) LIKE :patron
            OR LOWER(COALESCE(e.numeroSerie, '')) LIKE :patron
            OR LOWER(COALESCE(e.referenciaInterna, '')) LIKE :patron
          )
        """)
    Page<OrdenServicio> buscar(
        @Param("patron") String patron,
        @Param("estado") EstadoOrdenServicio estado,
        @Param("clienteId") Long clienteId,
        @Param("equipoId") Long equipoId,
        Pageable pageable);
}
