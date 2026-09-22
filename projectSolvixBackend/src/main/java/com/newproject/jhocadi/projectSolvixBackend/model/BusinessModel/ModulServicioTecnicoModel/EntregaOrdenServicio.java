package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Registro de entrega digital de una OT (FASE 3.15.5.3).
 * Una sola entrega por orden ({@code orden_servicio_id} UNIQUE).
 */
@Entity
@Table(name = "entregas_orden_servicio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntregaOrdenServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_servicio_id", nullable = false, unique = true)
    private OrdenServicio ordenServicio;

    @Column(name = "fecha_entrega", nullable = false)
    private LocalDateTime fechaEntrega;

    @Column(name = "usuario_responsable", nullable = false, length = 100)
    private String usuarioResponsable;

    @Column(name = "cliente_confirmo", nullable = false)
    private boolean clienteConfirmo;

    @Column(name = "nombre_cliente", length = 150)
    private String nombreCliente;

    @Column(name = "documento_cliente", length = 50)
    private String documentoCliente;

    @Column(name = "firma_url", length = 500)
    private String firmaUrl;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime ahora = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = ahora;
        }
        if (this.fechaEntrega == null) {
            this.fechaEntrega = ahora;
        }
    }
}
