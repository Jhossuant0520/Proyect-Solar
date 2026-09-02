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
 * Línea devuelta. No repite el nombre ni la categoría del producto porque ya viven
 * congelados en {@link DetalleVenta}, al que apunta directamente; aquí solo se guarda
 * lo que la línea de venta no puede responder: cuánto se devolvió y qué costo se revierte.
 */
@Entity
@Table(name = "detalle_devolucion_venta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleDevolucionVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "devolucion_id", nullable = false)
    private DevolucionVenta devolucion;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "detalle_venta_id", nullable = false)
    private DetalleVenta detalleVenta;

    /** Relación directa al producto para consultas de inventario sin doble join. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    private Integer cantidad;

    /**
     * Importe devuelto por esta línea, con la parte proporcional del descuento de
     * cabecera ya aplicada. Es directamente restable a la venta bruta.
     */
    @Column(name = "monto_devuelto", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal montoDevuelto = BigDecimal.ZERO;

    /** Costo congelado en la venta original. {@code null} = costo desconocido. */
    @Column(name = "costo_unitario", precision = 14, scale = 2)
    private BigDecimal costoUnitario;

    @Column(name = "costo_conocido", nullable = false)
    @Builder.Default
    private boolean costoConocido = false;
}
