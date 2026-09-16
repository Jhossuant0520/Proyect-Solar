package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.Cliente;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Orden de servicio técnico. Documento de taller, independiente de Venta y Producto.
 * Número legible: OS-{yyyy}-{seq} vía {@code TipoSecuencia.ORDEN_SERVICIO}.
 */
@Entity
@Table(name = "ordenes_servicio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrdenServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipo_id", nullable = false)
    private Equipo equipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EstadoOrdenServicio estado = EstadoOrdenServicio.RECEPCIONADO;

    @Column(name = "problema_reportado", length = 2000)
    private String problemaReportado;

    @Column(length = 2000)
    private String diagnostico;

    @Column(name = "trabajo_realizado", length = 2000)
    private String trabajoRealizado;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "fecha_recepcion", nullable = false, updatable = false)
    private LocalDateTime fechaRecepcion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    /** Se completa al pasar a ENTREGADO, CERRADO o CANCELADO. */
    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        LocalDateTime ahora = LocalDateTime.now();
        this.fechaRecepcion = ahora;
        this.fechaActualizacion = ahora;
        if (this.estado == null) {
            this.estado = EstadoOrdenServicio.RECEPCIONADO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
