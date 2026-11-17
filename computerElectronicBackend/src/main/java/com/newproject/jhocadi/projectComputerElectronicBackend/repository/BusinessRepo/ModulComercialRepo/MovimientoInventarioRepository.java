package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.MovimientoInventario;
import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.ReferenciaMovimiento;

public interface MovimientoInventarioRepository
        extends JpaRepository<MovimientoInventario, Long>, JpaSpecificationExecutor<MovimientoInventario> {

    List<MovimientoInventario> findByProductoIdOrderByFechaDescIdDesc(Long productoId);

    List<MovimientoInventario> findByReferenciaTipoAndReferenciaId(
        ReferenciaMovimiento referenciaTipo, Long referenciaId);
}
