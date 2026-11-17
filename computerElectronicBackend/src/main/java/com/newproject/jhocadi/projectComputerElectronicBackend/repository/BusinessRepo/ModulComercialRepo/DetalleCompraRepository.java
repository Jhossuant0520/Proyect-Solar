package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.DetalleCompra;

public interface DetalleCompraRepository extends JpaRepository<DetalleCompra, Long> {

    List<DetalleCompra> findByCompraId(Long compraId);

    List<DetalleCompra> findByProductoIdOrderByIdDesc(Long productoId);
}
