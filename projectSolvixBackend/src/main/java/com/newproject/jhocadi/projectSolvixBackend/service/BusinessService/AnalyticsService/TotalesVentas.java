package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.AnalyticsService;

import java.math.BigDecimal;

/**
 * Magnitudes base de venta de un período. Las tres cifras de venta viajan separadas
 * porque responden preguntas distintas y colapsarlas esconde información.
 *
 * @param margenBruto      {@code null} si no hay ventas netas: no se divide entre cero
 * @param ticketPromedio   TICKET PROMEDIO NETO: ventas netas / pedidos válidos.
 *                         {@code null} si no hay pedidos
 * @param unidadesVendidas unidades netas: las despachadas menos las que volvieron
 * @param costoCompleto    false si alguna línea vendida o devuelta no tenía costo conocido
 */
public record TotalesVentas(
        BigDecimal ventasBrutas,
        BigDecimal devoluciones,
        BigDecimal ventasNetas,
        BigDecimal costoVentas,
        BigDecimal gananciaBruta,
        BigDecimal margenBruto,
        long pedidos,
        BigDecimal ticketPromedio,
        long unidadesVendidas,
        long lineasSinCosto,
        boolean costoCompleto,
        boolean hayOperaciones) {
}
