package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Registro económico de una devolución a proveedor.
 *
 * <p>Existe como documento propio para no alterar retroactivamente el importe de la compra
 * original: la compra conserva su total histórico y la devolución se resta aparte.
 * Analytics obtiene la compra neta como compras brutas menos devoluciones de compra.
 */
@Entity
@Table(name = "devoluciones_compra")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevolucionCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador de negocio legible: DC-{yyyy}-{seq}. */
    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "compra_id", nullable = false)
    private Compra compra;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private MotivoDevolucionCompra motivo = MotivoDevolucionCompra.OTRO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EstadoDevolucionCompra estado = EstadoDevolucionCompra.REGISTRADA;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_reembolso", length = 30)
    private MetodoReembolso metodoReembolso;

    /** Momento en que el proveedor compensó el importe (reintegro, nota de crédito o cambio). */
    @Column(name = "fecha_reembolso")
    private LocalDateTime fechaReembolso;

    /**
     * Importe económico devuelto, con la parte proporcional del descuento de cabecera
     * ya aplicada. Es directamente restable a la compra bruta.
     */
    @Column(name = "monto_total_devuelto", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal montoTotalDevuelto = BigDecimal.ZERO;

    /**
     * Costo de inventario revertido: precio de compra histórico por unidades devueltas,
     * sin prorrateo de descuentos. Difiere de montoTotalDevuelto cuando hubo descuento
     * de cabecera, porque una cosa es lo que sale del inventario y otra lo que se recupera.
     */
    @Column(name = "costo_total_devuelto", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal costoTotalDevuelto = BigDecimal.ZERO;

    @Column(name = "costo_completo_conocido", nullable = false)
    @Builder.Default
    private boolean costoCompletoConocido = true;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @OneToMany(mappedBy = "devolucion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DetalleDevolucionCompra> detalles = new ArrayList<>();

    public void agregarDetalle(DetalleDevolucionCompra detalle) {
        detalle.setDevolucion(this);
        this.detalles.add(detalle);
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.fecha == null) {
            this.fecha = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
