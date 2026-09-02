package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.AjusteCostoProducto;

public interface AjusteCostoProductoRepository extends JpaRepository<AjusteCostoProducto, Long> {

    List<AjusteCostoProducto> findByProductoIdOrderByFechaDescIdDesc(Long productoId);

    List<AjusteCostoProducto> findAllByOrderByFechaDescIdDesc();
}
