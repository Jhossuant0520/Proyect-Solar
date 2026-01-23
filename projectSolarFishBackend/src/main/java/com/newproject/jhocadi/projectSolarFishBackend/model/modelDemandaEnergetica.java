package com.newproject.jhocadi.projectSolarFishBackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "demanda_energetica")
public class modelDemandaEnergetica {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "finca_id", nullable = false)
    private fincaModel finca;

    @Column(name = "demanda_diaria", nullable = false)
    private Double demandaDiaria;

    @Column(name = "demanda_mensual", nullable = false)
    private Double demandaMensual;

    @Column(name = "demanda_anual", nullable = false)
    private Double demandaAnual;

    @Column(name = "demanda_ac", nullable = false)
    private Double demandaAC;

    @Column(name = "demanda_dc", nullable = false)
    private Double demandaDC;

    @Column(name = "fecha_registro", updatable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public fincaModel getFinca() {
        return finca;
    }

    public void setFinca(fincaModel finca) {
        this.finca = finca;
    }

    public Double getDemandaDiaria() {
        return demandaDiaria;
    }

    public void setDemandaDiaria(Double demandaDiaria) {
        this.demandaDiaria = demandaDiaria;
    }

    public Double getDemandaMensual() {
        return demandaMensual;
    }

    public void setDemandaMensual(Double demandaMensual) {
        this.demandaMensual = demandaMensual;
    }

    public Double getDemandaAnual() {
        return demandaAnual;
    }

    public void setDemandaAnual(Double demandaAnual) {
        this.demandaAnual = demandaAnual;
    }

    public Double getDemandaAC() {
        return demandaAC;
    }

    public void setDemandaAC(Double demandaAC) {
        this.demandaAC = demandaAC;
    }

    public Double getDemandaDC() {
        return demandaDC;
    }

    public void setDemandaDC(Double demandaDC) {
        this.demandaDC = demandaDC;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
    
    
    
}
