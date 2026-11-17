package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulServicioTecnicoModel.RecepcionOrdenServicio;

public interface RecepcionOrdenServicioRepository extends JpaRepository<RecepcionOrdenServicio, Long> {

    Optional<RecepcionOrdenServicio> findByOrdenServicioId(Long ordenServicioId);

    boolean existsByOrdenServicioId(Long ordenServicioId);
}
