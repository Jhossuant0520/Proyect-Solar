package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.RecepcionOrdenServicio;

public interface RecepcionOrdenServicioRepository extends JpaRepository<RecepcionOrdenServicio, Long> {

    Optional<RecepcionOrdenServicio> findByOrdenServicioId(Long ordenServicioId);

    boolean existsByOrdenServicioId(Long ordenServicioId);
}
