package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

import java.math.BigDecimal;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Línea de venta con el contexto económico CONGELADO en el momento de la operación.
 * Nunca debe recalcularse con los valores actuales del producto.
 */
@Entity
@Table(name = "detalle_venta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    /** Snapshot descriptivo: mantiene estable el reporte si el producto se renombra. */
    @Column(name = "producto_nombre", nullable = false, length = 150)
    private String productoNombre;

    @Column(name = "categoria_codigo", length = 40)
    private String categoriaCodigo;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 14, scale = 2)
    private BigDecimal precioUnitario;

    /** Costo aplicado al completar la venta. {@code null} = costo desconocido. */
    @Column(name = "costo_unitario", precision = 14, scale = 2)
    private BigDecimal costoUnitario;

    /**
     * Marca explícita para analytics: evita interpretar un costo desconocido
     * como costo cero (margen 100% falso).
     */
    @Column(name = "costo_conocido", nullable = false)
    @Builder.Default
    private boolean costoConocido = false;

    @Column(name = "descuento_linea", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal descuentoLinea = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "cantidad_devuelta", nullable = false)
    @Builder.Default
    private Integer cantidadDevuelta = 0;

    public int getCantidadPendienteDevolucion() {
        return this.cantidad - this.cantidadDevuelta;
    }
}
