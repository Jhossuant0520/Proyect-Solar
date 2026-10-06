package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.PagoCxP;

@Repository
public interface PagoCxPRepository extends JpaRepository<PagoCxP, Long> {

    List<PagoCxP> findByCuentaPorPagarIdAndAnuladoAtIsNullOrderByFechaAscIdAsc(Long cuentaPorPagarId);

    List<PagoCxP> findByCuentaPorPagarIdOrderByFechaAscIdAsc(Long cuentaPorPagarId);
}
