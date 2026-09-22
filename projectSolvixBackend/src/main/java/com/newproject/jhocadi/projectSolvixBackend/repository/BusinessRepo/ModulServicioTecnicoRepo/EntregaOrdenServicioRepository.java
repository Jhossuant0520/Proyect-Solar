package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EntregaOrdenServicio;

public interface EntregaOrdenServicioRepository extends JpaRepository<EntregaOrdenServicio, Long> {

    boolean existsByOrdenServicioId(Long ordenServicioId);

    Optional<EntregaOrdenServicio> findByOrdenServicioId(Long ordenServicioId);
}
