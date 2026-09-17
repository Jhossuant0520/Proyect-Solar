package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulServicioTecnicoRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.HistorialEstadoOrdenServicio;

public interface HistorialEstadoOrdenServicioRepository
        extends JpaRepository<HistorialEstadoOrdenServicio, Long> {

    List<HistorialEstadoOrdenServicio> findByOrdenServicioIdOrderByFechaCambioDesc(Long ordenServicioId);
}
