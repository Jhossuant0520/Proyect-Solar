package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulNotificacion;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Notificación persistente derivada de un evento de negocio.
 * Estado propio del canal; no altera el workflow de OT.
 */
@Entity
@Table(
    name = "notificaciones",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_notificaciones_idempotency",
        columnNames = "idempotency_key"
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_evento", nullable = false, length = 60)
    private TipoEventoNotificacion tipoEvento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CanalNotificacion canal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private EstadoNotificacion estado = EstadoNotificacion.PENDIENTE;

    @Column(name = "plantilla_codigo", nullable = false, length = 80)
    private String plantillaCodigo;

    @Column(name = "orden_servicio_id")
    private Long ordenServicioId;

    @Column(name = "cliente_id")
    private Long clienteId;

    @Column(name = "cotizacion_id")
    private Long cotizacionId;

    /** Referencia no sensible (p. ej. teléfono/email enmascarado o crudo según canal). */
    @Column(name = "destinatario_ref", length = 120)
    private String destinatarioRef;

    @Column(length = 255)
    private String asunto;

    @Column(name = "cuerpo_renderizado", columnDefinition = "TEXT")
    private String cuerpoRenderizado;

    @Column(name = "url_consulta_publica", length = 500)
    private String urlConsultaPublica;

    @Column(name = "idempotency_key", nullable = false, length = 160)
    private String idempotencyKey;

    @Column(name = "error_resumen", length = 500)
    private String errorResumen;

    /** Código del adapter que procesó el envío (auditoría; no es un secreto). */
    @Column(name = "adapter_codigo", length = 80)
    private String adapterCodigo;

    /** Identificador externo del proveedor cuando exista (WhatsApp message id, etc.). */
    @Column(name = "proveedor_mensaje_id", length = 120)
    private String proveedorMensajeId;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @Column(name = "fecha_envio")
    private LocalDateTime fechaEnvio;

    @PrePersist
    void onCreate() {
        LocalDateTime ahora = LocalDateTime.now();
        fechaCreacion = ahora;
        fechaActualizacion = ahora;
        if (estado == null) {
            estado = EstadoNotificacion.PENDIENTE;
        }
    }

    @PreUpdate
    void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
