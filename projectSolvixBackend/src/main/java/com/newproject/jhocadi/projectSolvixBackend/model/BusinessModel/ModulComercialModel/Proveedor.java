package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

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
 * Maestro de proveedor (empresa a la que SOLVIX compra).
 * La columna {@code nombre} almacena la razón social (compatibilidad FASE 1).
 * La columna {@code documento} almacena el número de documento fiscal.
 */
@Entity
@Table(name = "proveedores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Razón social. Columna histórica {@code nombre}. */
    @Column(nullable = false, length = 150)
    private String nombre;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento", length = 20)
    private TipoDocumento tipoDocumento;

    /** Número de documento fiscal (NIT normalizado). Columna histórica {@code documento}. */
    @Column(length = 40, unique = true)
    private String documento;

    @Column(name = "nombre_comercial", length = 150)
    private String nombreComercial;

    @Column(length = 255)
    private String direccion;

    @Column(length = 100)
    private String ciudad;

    @Column(length = 100)
    private String departamento;

    @Column(length = 40)
    private String telefono;

    @Column(name = "telefono_alternativo", length = 40)
    private String telefonoAlternativo;

    @Column(length = 150)
    private String email;

    @Column(length = 200)
    private String web;

    @Enumerated(EnumType.STRING)
    @Column(name = "condicion_pago", length = 20)
    private CondicionPagoProveedor condicionPago;

    @Column(name = "dias_credito")
    private Integer diasCredito;

    /**
     * Campo legacy FASE 1 (persona en un string). Se migra a {@link ContactoProveedor}.
     * Se conserva para no perder datos; no es la fuente de verdad nueva.
     */
    @Column(length = 150)
    private String contacto;

    @Column(length = 500)
    private String notas;

    @Column(nullable = false)
    @Builder.Default
    private boolean activo = true;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ContactoProveedor> contactos = new ArrayList<>();

    /** Alias semántico: razón social = nombre histórico. */
    public String getRazonSocial() {
        return this.nombre;
    }

    public void setRazonSocial(String razonSocial) {
        this.nombre = razonSocial;
    }

    /** Alias semántico: número de documento = documento histórico. */
    public String getNumeroDocumento() {
        return this.documento;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.documento = numeroDocumento;
    }

    public void agregarContacto(ContactoProveedor contacto) {
        contacto.setProveedor(this);
        this.contactos.add(contacto);
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.fechaRegistro = now;
        this.fechaActualizacion = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.fechaActualizacion = LocalDateTime.now();
    }
}
