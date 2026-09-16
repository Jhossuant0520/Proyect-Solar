package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    List<Equipo> findByClienteIdOrderByFechaRegistroDesc(Long clienteId);

    List<Equipo> findByClienteIdAndActivoTrueOrderByFechaRegistroDesc(Long clienteId);

    List<Equipo> findByActivoTrueOrderByFechaRegistroDesc();

    List<Equipo> findAllByOrderByFechaRegistroDesc();
}
