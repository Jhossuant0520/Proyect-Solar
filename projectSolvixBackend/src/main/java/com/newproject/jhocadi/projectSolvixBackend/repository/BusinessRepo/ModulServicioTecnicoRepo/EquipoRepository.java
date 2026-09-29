package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    List<Equipo> findByClienteIdOrderByFechaRegistroDesc(Long clienteId);

    List<Equipo> findByClienteIdAndActivoTrueOrderByFechaRegistroDesc(Long clienteId);

    List<Equipo> findByActivoTrueOrderByFechaRegistroDesc();

    List<Equipo> findAllByOrderByFechaRegistroDesc();

    /** Autocomplete: marca, modelo, serie, referencia o nombre de cliente. */
    @Query("""
        SELECT e FROM Equipo e
        JOIN e.cliente c
        WHERE (:clienteId IS NULL OR c.id = :clienteId)
          AND (:soloActivos = false OR e.activo = true)
          AND (
            :patron IS NULL
            OR LOWER(COALESCE(e.marca, '')) LIKE :patron
            OR LOWER(COALESCE(e.modelo, '')) LIKE :patron
            OR LOWER(COALESCE(e.numeroSerie, '')) LIKE :patron
            OR LOWER(COALESCE(e.referenciaInterna, '')) LIKE :patron
            OR LOWER(c.nombre) LIKE :patron
          )
        """)
    List<Equipo> buscar(
        @Param("patron") String patron,
        @Param("clienteId") Long clienteId,
        @Param("soloActivos") boolean soloActivos,
        Pageable pageable);
}
