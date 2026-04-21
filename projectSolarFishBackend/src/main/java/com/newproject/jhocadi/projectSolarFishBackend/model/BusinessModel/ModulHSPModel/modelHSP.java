package com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulHSPModel;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.newproject.jhocadi.projectSolarFishBackend.model.AccesModel.modelUsuario;

@Entity
@Table(name = "hsp_resultados")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class modelHSP {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private modelUsuario usuario;

    private Double latitud;
    private Double longitud;
    private Integer anioConsultado;
    private Double slopeAngle;
    private Double azimuthAngle;

    private Double hspCritica;
    private Integer mesCritico;
    private Double hspFavorable;
    private Integer mesFavorable;
    private Double hspPromedio;
    private Double hspDiseno;

    // Guardamos los 12 valores mensuales como JSON plano
    @Column(columnDefinition = "TEXT")
    private String mesesJson;

    @Column(updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() { fechaRegistro = LocalDateTime.now(); }
}