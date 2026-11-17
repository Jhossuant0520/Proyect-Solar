package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.AjusteCostoProducto;

public interface AjusteCostoProductoRepository extends JpaRepository<AjusteCostoProducto, Long> {

    List<AjusteCostoProducto> findByProductoIdOrderByFechaDescIdDesc(Long productoId);

    List<AjusteCostoProducto> findAllByOrderByFechaDescIdDesc();
}
