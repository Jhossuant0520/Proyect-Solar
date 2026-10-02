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

@Entity
@Table(name = "compras")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Compra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Identificador de negocio legible: C-{yyyy}-{seq}. */
    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "proveedor_id", nullable = false)
    private Proveedor proveedor;

    /** Nombre/razón social congelada al crear la compra. */
    @Column(name = "proveedor_nombre_snapshot", length = 150)
    private String proveedorNombreSnapshot;

    /** Documento fiscal congelado al crear la compra. */
    @Column(name = "proveedor_documento_snapshot", length = 40)
    private String proveedorDocumentoSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento_externo", length = 20)
    private TipoDocumentoExternoCompra tipoDocumentoExterno;

    @Column(name = "numero_documento_externo", length = 80)
    private String numeroDocumentoExterno;

    @Column(name = "numero_orden_compra", length = 80)
    private String numeroOrdenCompra;

    @Column(name = "numero_cotizacion_proveedor", length = 80)
    private String numeroCotizacionProveedor;

    @Column(name = "fecha_documento_proveedor")
    private LocalDateTime fechaDocumentoProveedor;

    @Column(name = "fecha_entrega")
    private LocalDateTime fechaEntrega;

    @Column(name = "fecha_vencimiento")
    private LocalDateTime fechaVencimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "condicion_pago_aplicada", length = 20)
    private CondicionPagoProveedor condicionPagoAplicada;

    @Column(name = "dias_credito_aplicados")
    private Integer diasCreditoAplicados;

    /** Moneda funcional de compras. FASE 3.15.11-B: siempre COP. */
    @Column(length = 3, nullable = false)
    @Builder.Default
    private String moneda = "COP";

    @Column(name = "contacto_proveedor_id")
    private Long contactoProveedorId;

    @Column(name = "contacto_nombre_snapshot", length = 150)
    private String contactoNombreSnapshot;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal descuento = BigDecimal.ZERO;

    /** Impuesto total de la compra. 0 en compras sin IVA / legacy. */
    @Column(name = "impuesto_total", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal impuestoTotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EstadoCompra estado = EstadoCompra.PENDIENTE;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "fecha_completada")
    private LocalDateTime fechaCompletada;

    @Column(name = "fecha_anulada")
    private LocalDateTime fechaAnulada;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DetalleCompra> detalles = new ArrayList<>();

    public void agregarDetalle(DetalleCompra detalle) {
        detalle.setCompra(this);
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
