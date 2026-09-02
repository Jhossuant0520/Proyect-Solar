package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.AnalyticsDtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

/**
 * Producto de bajo desempeño. Deliberadamente no se juzga solo por unidades: un producto
 * puede vender poco y aportar mucho, y uno recién creado no vende poco, todavía no tuvo
 * tiempo de vender. Por eso viajan también el stock, la última venta y la antigüedad.
 */
@Data
@Builder
public class ProductoBajoRendimientoDTO {

    private Long productoId;
    private String nombre;
    private String categoriaCodigo;
    private String categoriaNombre;
    private long unidades;
    private BigDecimal ingresos;
    private Integer stockActual;
    private BigDecimal velocidadVenta;
    private LocalDateTime ultimaVenta;
    private Long diasSinVenta;
    private long diasEnCatalogo;

    /** SIN_HISTORIAL_SUFICIENTE cuando el producto es demasiado nuevo para ser juzgado. */
    private EstadoMetrica estado;
}
