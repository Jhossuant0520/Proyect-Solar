package com.newproject.jhocadi.projectSolvixBackend.repository.BusinessRepo.ModulComercialRepo;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.DevolucionVenta;

@Repository
public interface DevolucionVentaRepository
        extends JpaRepository<DevolucionVenta, Long>, JpaSpecificationExecutor<DevolucionVenta> {

    Optional<DevolucionVenta> findByNumero(String numero);

    List<DevolucionVenta> findByVentaIdOrderByFechaAscIdAsc(Long ventaId);

    /** Importe ya devuelto de una venta, para cuadrar el residuo en la devolución final. */
    @Query("SELECT COALESCE(SUM(d.montoTotalDevuelto), 0) FROM DevolucionVenta d WHERE d.venta.id = :ventaId")
    BigDecimal sumarMontoDevueltoPorVenta(@Param("ventaId") Long ventaId);
}
