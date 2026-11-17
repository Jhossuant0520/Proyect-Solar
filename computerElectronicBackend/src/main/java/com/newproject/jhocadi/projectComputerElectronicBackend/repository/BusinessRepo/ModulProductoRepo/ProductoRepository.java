package com.newproject.jhocadi.projectComputerElectronicBackend.repository.BusinessRepo.ModulProductoRepo;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.newproject.jhocadi.projectComputerElectronicBackend.model.BusinessModel.ModulProductoModel.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Long>, JpaSpecificationExecutor<Producto> {

    Optional<Producto> findByCodigoBarras(String codigoBarras);

    List<Producto> findByMarcaContainingIgnoreCase(String marca);

    List<Producto> findByCategoriaId(Long categoriaId);

    List<Producto> findByPrecioVentaActualBetween(BigDecimal precioMin, BigDecimal precioMax);

    List<Producto> findByStockActualGreaterThan(Integer stock);

    List<Producto> findByActivoTrue();

    /** Productos migrados o nunca comprados: costo desconocido, no costo cero. */
    List<Producto> findByCostoActualIsNull();

    boolean existsByCategoriaId(Long categoriaId);
}
