package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Libro mayor del inventario: toda variación de stock deja aquí una fila inmutable
 * con el estado anterior y posterior, para auditoría y analytics.
 */
@Entity
@Table(name = "movimientos_inventario")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoMovimientoInventario tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DireccionMovimiento direccion;

    /** Siempre positiva; el signo lo aporta la dirección. */
    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "stock_anterior", nullable = false)
    private Integer stockAnterior;

    @Column(name = "stock_nuevo", nullable = false)
    private Integer stockNuevo;

    /**
     * Costo económico específico de este movimiento: lo que costó esta operación en concreto.
     * Es NULL cuando se desconoce, por ejemplo en ajustes manuales y mermas. Nunca se inventa.
     */
    @Column(name = "costo_unitario", precision = 14, scale = 2)
    private BigDecimal costoUnitario;

    /**
     * Costo vigente del producto inmediatamente después de aplicar este movimiento y la
     * política de costeo correspondiente. Es lo que permite valorar el inventario en una
     * fecha pasada sin recurrir a {@code Producto.costoActual} de hoy.
     *
     * <p>No sustituye a {@link #costoUnitario}: aquel es el costo de la operación, este es el
     * costo del producto tras ella. En un ajuste manual sin costo conocido, el primero queda
     * NULL y el segundo conserva el costo vigente del producto, que sí se conoce.
     *
     * <p>NULL en los movimientos anteriores a la migración V4: no se reconstruyen inventando
     * valores, y analytics los declara como valuación no disponible.
     */
    @Column(name = "costo_producto_resultante", precision = 14, scale = 2)
    private BigDecimal costoProductoResultante;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Enumerated(EnumType.STRING)
    @Column(name = "referencia_tipo", nullable = false, length = 30)
    private ReferenciaMovimiento referenciaTipo;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(name = "usuario_registro", length = 100)
    private String usuarioRegistro;

    @Column(length = 500)
    private String observaciones;
}
