package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulComercialService.costeo;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

/**
 * Política por defecto de FASE 1: el costo vigente es el de la última compra completada.
 */
@Component
@ConditionalOnProperty(
    name = "solvix.inventario.politica-costo",
    havingValue = "ULTIMO_COSTO",
    matchIfMissing = true)
public class UltimoCostoPolitica implements PoliticaCosteoInventario {

    @Override
    public String nombre() {
        return "ULTIMO_COSTO";
    }

    @Override
    public BigDecimal calcularCostoActual(
            Producto producto,
            BigDecimal costoCompraUnitario,
            int cantidadComprada,
            int stockAntesDeCompra) {

        if (costoCompraUnitario == null) {
            return producto.getCostoActual();
        }
        return costoCompraUnitario.setScale(2, RoundingMode.HALF_UP);
    }
}
