package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;
import java.util.List;

import lombok.Builder;
import lombok.Data;

/**
 * Analytics de abastecimiento. La devolución al proveedor reduce las compras netas
 * sin tocar el histórico de la compra original, igual que en ventas.
 */
@Data
@Builder
public class CompraAnalyticsDTO {

    private PeriodoDTO periodo;
    private BigDecimal comprasBrutas;
    private BigDecimal devolucionesCompra;
    private BigDecimal comprasNetas;
    private long ordenes;
    private List<ProveedorGastoDTO> gastoPorProveedor;
    private List<ProductoCompradoDTO> productosComprados;
    private List<VentasSerieDTO> serie;
    private EstadoMetrica estado;
}
