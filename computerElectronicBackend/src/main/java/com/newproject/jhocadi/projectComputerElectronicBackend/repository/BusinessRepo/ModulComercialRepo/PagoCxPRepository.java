package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulComercialModel.PagoCxP;

public interface PagoCxPRepository extends JpaRepository<PagoCxP, Long> {

    List<PagoCxP> findByCuentaPorPagarIdAndAnuladoAtIsNullOrderByFechaAscIdAsc(Long cuentaPorPagarId);

    List<PagoCxP> findByCuentaPorPagarIdOrderByFechaAscIdAsc(Long cuentaPorPagarId);
}
