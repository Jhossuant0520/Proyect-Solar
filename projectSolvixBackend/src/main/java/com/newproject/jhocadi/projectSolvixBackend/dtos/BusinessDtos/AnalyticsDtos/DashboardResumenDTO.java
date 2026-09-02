package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

/**
 * Foto del negocio en un período, con su comparación contra el período anterior.
 *
 * <p>Las tres magnitudes de venta viajan separadas a propósito: ventas brutas, devoluciones
 * y ventas netas responden preguntas distintas y colapsarlas en un solo número esconde
 * información. La venta original nunca se recalcula; la devolución se resta aquí.
 */
@Data
@Builder
public class DashboardResumenDTO {

    private PeriodoDTO periodo;

    /** Importe de las ventas realizadas, sin descontar devoluciones. */
    private BigDecimal ventasBrutas;

    /** Importe devuelto a clientes por devoluciones registradas en el período. */
    private BigDecimal devoluciones;

    /** ventasBrutas - devoluciones. */
    private BigDecimal ventasNetas;

    /** Costo histórico de las unidades vendidas, ya revertido lo devuelto. */
    private BigDecimal costoVentas;

    /** ventasNetas - costoVentas. */
    private BigDecimal gananciaBruta;

    /** gananciaBruta / ventasNetas × 100. */
    private BigDecimal margenBruto;

    /** Operaciones de venta realizadas. Una devolución no es un pedido nuevo. */
    private long pedidos;

    /**
     * TICKET PROMEDIO NETO: ventasNetas / pedidos.
     *
     * <p>El numerador va neto de devoluciones y el denominador cuenta operaciones de venta
     * realizadas, sin descontar las que luego se devolvieron. Responde "cuánto dinero terminó
     * dejando en promedio cada pedido". En la interfaz se muestra simplemente como
     * "Ticket promedio".
     */
    private BigDecimal ticketPromedio;

    private EstadoMetrica estadoVentas;
    private EstadoMetrica estadoGanancia;
    private EstadoMetrica estadoMargen;
    private EstadoMetrica estadoTicket;

    /** Cuántas líneas vendidas no tenían costo conocido. Si es > 0 el margen está subestimado. */
    private long lineasSinCosto;

    private ComparativaResumenDTO comparativa;
}
