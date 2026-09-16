package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.OrdenServicioRepuesto;

public interface OrdenServicioRepuestoRepository extends JpaRepository<OrdenServicioRepuesto, Long> {

    List<OrdenServicioRepuesto> findByOrdenServicioIdOrderByFechaRegistroAsc(Long ordenServicioId);

    Optional<OrdenServicioRepuesto> findByIdAndOrdenServicioId(Long id, Long ordenServicioId);

    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM OrdenServicioRepuesto r
        WHERE r.ordenServicio.id = :ordenId
          AND r.anulado = false
          AND (r.cantidadConsumida - r.cantidadDevuelta) > 0
        """)
    boolean existeConsumoNetoPendiente(@Param("ordenId") Long ordenId);
}
