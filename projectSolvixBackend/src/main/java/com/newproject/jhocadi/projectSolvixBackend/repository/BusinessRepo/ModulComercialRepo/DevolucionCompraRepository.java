package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionCompra;

@Repository
public interface DevolucionCompraRepository
        extends JpaRepository<DevolucionCompra, Long>, JpaSpecificationExecutor<DevolucionCompra> {

    Optional<DevolucionCompra> findByNumero(String numero);

    List<DevolucionCompra> findByCompraIdOrderByFechaAscIdAsc(Long compraId);

    /** Importe ya devuelto de una compra, para cuadrar el residuo en la devolución final. */
    @Query("SELECT COALESCE(SUM(d.montoTotalDevuelto), 0) FROM DevolucionCompra d WHERE d.compra.id = :compraId")
    BigDecimal sumarMontoDevueltoPorCompra(@Param("compraId") Long compraId);
}
