package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulServicioTecnicoModel.HistorialEstadoOrdenServicio;

public interface HistorialEstadoOrdenServicioRepository
        extends JpaRepository<HistorialEstadoOrdenServicio, Long> {

    List<HistorialEstadoOrdenServicio> findByOrdenServicioIdOrderByFechaCambioDesc(Long ordenServicioId);
}
