package com.newproject.jhocadi.projectComputerElectronicBackend.model.AccesModel;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder 
public class modelUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name ="username", nullable = false, unique = true)
    private String nombreUsuario;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordUsuario;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "ultimo_login")
    private LocalDateTime ultimoLogin;

    @Column(name = "activo", nullable = false)
    private boolean activo;

    @Column(name = "email_verificado", nullable = false)
    @Builder.Default
    private boolean emailVerificado = false;

    @JsonIgnore
    @Column(name = "token_verificacion")
    private String tokenVerificacion;

    @JsonIgnore
    @Column(name = "token_verificacion_expiracion")
    private LocalDateTime tokenVerificacionExpiracion;

    @Column(name = "fecha_creacion", updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    @PrePersist
    protected void onCreate() {
        this.fechaCreacion = LocalDateTime.now();
    }

    @ManyToOne(fetch = FetchType.EAGER) // aseguras que siempre cargue el rol junto con el usuario
    @JoinColumn(name = "id_rol", nullable = false)
    private modelRolUsuario rol;
}
