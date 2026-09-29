package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

import java.time.LocalDateTime;

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

/** PDF generado de una cotización comercial. Cada presentación deja una versión nueva. */
@Entity
@Table(name = "documentos_cotizacion_comercial")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentoCotizacionComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cotizacion_id", nullable = false)
    private CotizacionComercial cotizacion;

    @Column(nullable = false)
    private int version;

    @Column(name = "nombre_archivo", nullable = false, length = 180)
    private String nombreArchivo;

    @Column(name = "storage_key", nullable = false, unique = true, length = 120)
    private String storageKey;

    @Column(name = "hash_sha256", length = 64)
    private String hashSha256;

    @Column(name = "fecha_generacion", nullable = false)
    private LocalDateTime fechaGeneracion;

    @Column(name = "usuario_generacion", nullable = false, length = 100)
    private String usuarioGeneracion;

    @PrePersist
    protected void onCreate() {
        if (this.fechaGeneracion == null) {
            this.fechaGeneracion = LocalDateTime.now();
        }
    }
}
