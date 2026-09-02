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
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Registro económico de una devolución de venta.
 *
 * <p>Existe como documento propio para no alterar retroactivamente el importe de la venta
 * original: la venta conserva su total histórico y la devolución se resta aparte.
 * Analytics obtiene la venta neta como ventas brutas menos devoluciones.
 */
@Entity
@Table(name = "devoluciones_venta")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DevolucionVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador de negocio legible: D-{yyyy}-{seq}. */
    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private MotivoDevolucion motivo = MotivoDevolucion.OTRO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EstadoDevolucionVenta estado = EstadoDevolucionVenta.REGISTRADA;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_reembolso", length = 30)
    private MetodoReembolso metodoReembolso;

    @Column(name = "fecha_reembolso")
    private LocalDateTime fechaReembolso;

    /** Importe devuelto al cliente, calculado sobre el precio real que pagó. */
    @Column(name = "monto_total_devuelto", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal montoTotalDevuelto = BigDecimal.ZERO;

    /** Costo de las unidades que regresaron. Solo suma las líneas con costo conocido. */
    @Column(name = "costo_total_devuelto", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal costoTotalDevuelto = BigDecimal.ZERO;

    /**
     * false cuando alguna línea devuelta tenía costo desconocido: avisa a analytics
     * de que la reversión del costo de ventas está incompleta.
     */
    @Column(name = "costo_completo_conocido", nullable = false)
    @Builder.Default
    private boolean costoCompletoConocido = true;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @OneToMany(mappedBy = "devolucion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DetalleDevolucionVenta> detalles = new ArrayList<>();

    public void agregarDetalle(DetalleDevolucionVenta detalle) {
        detalle.setDevolucion(this);
        this.detalles.add(detalle);
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        if (this.fecha == null) {
            this.fecha = now;
        }
    }
}
