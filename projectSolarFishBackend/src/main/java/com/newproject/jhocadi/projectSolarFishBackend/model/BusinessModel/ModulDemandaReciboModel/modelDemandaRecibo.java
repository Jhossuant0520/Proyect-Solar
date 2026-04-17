package com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulDemandaReciboModel;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.newproject.jhocadi.projectSolarFishBackend.model.AccesModel.modelUsuario;

@Entity
@Table(name = "demandas_recibos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class modelDemandaRecibo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Relación con usuario ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private modelUsuario usuario;

    @Column(name = "modo_calculo")
    private String modoCalculoConsumoBase;

    private Double consumoBaseMensualKwh;
    private Integer cantidadRecibosUsados;
    private Integer diasPeriodoCalculados;

    // Base
    private Double energiaDiariaWhBase;
    private Double energiaMensualWhBase;
    private Double energiaAnualWhBase;

    // Cobertura
    private Double porcentajeCobertura;
    private Double energiaDiariaWhCubierta;

    // Final
    private Double energiaDiariaWhFinal;
    private Double energiaMensualWhFinal;
    private Double energiaAnualWhFinal;

    @Column(name = "consumo_total_periodo_kwh")
    private Double consumoTotalPeriodoKwh;

    @Column(name = "fecha_registro", updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() {
        fechaRegistro = LocalDateTime.now();
    }
}