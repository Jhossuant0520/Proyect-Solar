package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.costeo;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * Estrategia de valorización del costo vigente de un producto.
 *
 * <p>El historial de compras y ventas es independiente de esta política: los costos
 * aplicados quedan congelados en los detalles y en los movimientos de inventario, por lo que
 * cambiar de política (por ejemplo a promedio ponderado) no exige reconstruir el historial.
 */
public interface PoliticaCosteoInventario {

    /** Identificador legible de la política activa. */
    String nombre();

    /**
     * Calcula el nuevo costo vigente del producto tras una entrada por compra.
     *
     * @param producto            producto afectado, con su costo vigente (puede ser {@code null} = desconocido)
     * @param costoCompraUnitario costo unitario de la compra que ingresa
     * @param cantidadComprada    unidades que ingresan
     * @param stockAntesDeCompra  stock existente antes de la entrada
     */
    BigDecimal calcularCostoActual(
        Producto producto,
        BigDecimal costoCompraUnitario,
        int cantidadComprada,
        int stockAntesDeCompra);
}
