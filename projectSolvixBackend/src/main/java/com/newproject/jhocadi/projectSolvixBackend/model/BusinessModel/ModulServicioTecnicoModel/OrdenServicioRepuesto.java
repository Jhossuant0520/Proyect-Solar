package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulProductoModel.Producto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Línea de repuesto planificado/consumido en una OT.
 * Planificar no mueve inventario; consumir/devolver sí (vía InventarioService).
 */
@Entity
@Table(name = "orden_servicio_repuestos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrdenServicioRepuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_servicio_id", nullable = false)
    private OrdenServicio ordenServicio;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "producto_nombre", nullable = false, length = 150)
    private String productoNombre;

    @Column(name = "cantidad_planificada", nullable = false)
    private int cantidadPlanificada;

    @Column(name = "cantidad_consumida", nullable = false)
    @Builder.Default
    private int cantidadConsumida = 0;

    @Column(name = "cantidad_devuelta", nullable = false)
    @Builder.Default
    private int cantidadDevuelta = 0;

    /**
     * Snapshot de {@code Producto.costoActual} en el primer consumo.
     * null = costo desconocido. Nunca se inventa 0.
     */
    @Column(name = "costo_unitario", precision = 14, scale = 2)
    private BigDecimal costoUnitario;

    @Column(name = "costo_conocido", nullable = false)
    @Builder.Default
    private boolean costoConocido = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean anulado = false;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_ultimo_consumo")
    private LocalDateTime fechaUltimoConsumo;

    @Column(name = "fecha_ultima_devolucion")
    private LocalDateTime fechaUltimaDevolucion;

    public int cantidadNetaConsumida() {
        return this.cantidadConsumida - this.cantidadDevuelta;
    }

    public EstadoRepuestoOrdenServicio estadoDerivado() {
        return EstadoRepuestoOrdenServicio.derivar(
            this.anulado,
            this.cantidadPlanificada,
            this.cantidadConsumida,
            this.cantidadDevuelta);
    }

    @PrePersist
    protected void onCreate() {
        if (this.fechaRegistro == null) {
            this.fechaRegistro = LocalDateTime.now();
        }
    }
}
