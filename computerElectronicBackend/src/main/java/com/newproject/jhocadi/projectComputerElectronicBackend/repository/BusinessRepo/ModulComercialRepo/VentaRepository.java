package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.Venta;

public interface VentaRepository extends JpaRepository<Venta, Long>, JpaSpecificationExecutor<Venta> {

    Optional<Venta> findByNumero(String numero);
}
