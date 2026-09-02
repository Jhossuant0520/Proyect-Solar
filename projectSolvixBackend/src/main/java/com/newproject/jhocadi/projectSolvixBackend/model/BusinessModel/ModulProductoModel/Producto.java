package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Producto del catálogo. Los valores económicos aquí son SIEMPRE los vigentes;
 * el historial económico vive congelado en DetalleVenta / DetalleCompra.
 */
@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String marca;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaProducto categoria;

    /** Precio de venta vigente. No se usa para reconstruir ventas pasadas. */
    @Column(name = "precio_venta_actual", nullable = false, precision = 14, scale = 2)
    private BigDecimal precioVentaActual;

    /**
     * Costo unitario vigente segun la politica de costeo configurada.
     * {@code null} significa COSTO DESCONOCIDO (no equivale a costo cero).
     */
    @Column(name = "costo_actual", precision = 14, scale = 2)
    private BigDecimal costoActual;

    /** Stock vigente. Solo InventarioService puede modificarlo. */
    @Column(name = "stock_actual", nullable = false)
    @Builder.Default
    private Integer stockActual = 0;

    @Column(length = 2000)
    private String descripcion;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    /** Distingue costo conocido de costo desconocido para analytics. */
    public boolean tieneCostoConocido() {
        return this.costoActual != null;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.fechaCreacion = now;
        this.fechaActualizacion = now;
        if (this.stockActual == null) {
            this.stockActual = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
