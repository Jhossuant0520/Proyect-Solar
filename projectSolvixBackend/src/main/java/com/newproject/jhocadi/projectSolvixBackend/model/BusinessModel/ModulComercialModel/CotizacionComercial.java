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
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Propuesta comercial a un cliente, sin Orden de Servicio.
 * No mueve inventario: las líneas son snapshot de producto, cantidad y precio.
 */
@Entity
@Table(name = "cotizaciones_comerciales")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CotizacionComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Column(name = "cliente_nombre_snapshot", nullable = false, length = 150)
    private String clienteNombreSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoCotizacionComercial estado;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(name = "fecha_presentacion")
    private LocalDateTime fechaPresentacion;

    @Column(name = "fecha_aprobacion")
    private LocalDateTime fechaAprobacion;

    @Column(name = "fecha_rechazo")
    private LocalDateTime fechaRechazo;

    @Column(name = "fecha_anulacion")
    private LocalDateTime fechaAnulacion;

    @Column(name = "usuario_creacion", nullable = false, length = 100)
    private String usuarioCreacion;

    @Column(name = "usuario_presentacion", length = 100)
    private String usuarioPresentacion;

    @Column(name = "usuario_aprobacion", length = 100)
    private String usuarioAprobacion;

    @Column(name = "usuario_rechazo", length = 100)
    private String usuarioRechazo;

    @Column(name = "usuario_anulacion", length = 100)
    private String usuarioAnulacion;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "motivo_rechazo", length = 1000)
    private String motivoRechazo;

    /** Token opaco para el QR de consulta pública. */
    @Column(name = "token_consulta", nullable = false, unique = true, length = 64)
    private String tokenConsulta;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @OneToMany(mappedBy = "cotizacion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<DetalleCotizacionComercial> detalles = new ArrayList<>();

    public void agregarDetalle(DetalleCotizacionComercial detalle) {
        detalle.setCotizacion(this);
        this.detalles.add(detalle);
    }

    @PrePersist
    protected void onCreate() {
        if (this.fecha == null) {
            this.fecha = LocalDateTime.now();
        }
        if (this.estado == null) {
            this.estado = EstadoCotizacionComercial.BORRADOR;
        }
        if (this.subtotal == null) {
            this.subtotal = BigDecimal.ZERO;
        }
        if (this.total == null) {
            this.total = BigDecimal.ZERO;
        }
        this.fechaActualizacion = this.fecha;
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
