package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

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
}
