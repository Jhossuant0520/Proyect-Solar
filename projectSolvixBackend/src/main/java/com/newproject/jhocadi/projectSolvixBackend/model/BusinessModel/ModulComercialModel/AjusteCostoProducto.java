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
 * Historial de correcciones manuales del costo vigente de un producto.
 *
 * <p>El costo no es un campo más del catálogo: lo determina la política de costeo a partir de
 * las compras. Cuando hace falta corregirlo a mano —un error de carga, un producto migrado sin
 * costo— la corrección es una operación explícita y auditable, no una edición del producto.
 *
 * <p>Junto con {@code MovimientoInventario.costoProductoResultante}, esta tabla forma la línea
 * de tiempo del costo de cada producto: entre las dos se puede saber qué costo regía en
 * cualquier fecha. Por eso guarda {@code costoProductoResultante} y no solo el costo pedido:
 * si mañana la política deja de ser último costo, lo que vale para valorar es el costo que
 * efectivamente quedó vigente.
 *
 * <p>Un ajuste de costo <b>no mueve stock</b> y por eso no genera movimiento de inventario:
 * el libro de inventario registra unidades, no precios.
 */
@Entity
@Table(name = "ajustes_costo_producto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AjusteCostoProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    /** Costo vigente antes de la corrección. NULL si el producto no tenía costo conocido. */
    @Column(name = "costo_anterior", precision = 14, scale = 2)
    private BigDecimal costoAnterior;

    @Column(name = "costo_nuevo", precision = 14, scale = 2, nullable = false)
    private BigDecimal costoNuevo;

    /**
     * Costo que quedó vigente en el producto tras aplicar el ajuste. Hoy coincide con
     * {@link #costoNuevo} bajo la política de último costo; se guarda aparte porque es el
     * valor que lee la valuación histórica y debe seguir siendo correcto si la política cambia.
     */
    @Column(name = "costo_producto_resultante", precision = 14, scale = 2)
    private BigDecimal costoProductoResultante;

    /** Stock del producto al momento del ajuste. Sirve para probar que el ajuste no lo movió. */
    @Column(name = "stock_al_ajustar", nullable = false)
    private Integer stockAlAjustar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MotivoAjusteCosto motivo;

    @Column(length = 500)
    private String observaciones;

    @Column(name = "usuario_registro", length = 100)
    private String usuarioRegistro;

    @Column(nullable = false)
    private LocalDateTime fecha;
}
