package com.newproject.jhocadi.projectSolarFishBackend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "finca")
public class fincaModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_finca",length = 200, nullable = false)   
    private String nombreFinca;

    @Column(name = "ubicacion_finca",length = 300, nullable = false)
    private String ubicacionFinca;

    @Column(name = "propietario_finca",length = 150, nullable = false)
    private String propietarioFinca;

    @Column(name = "superficie_finca", nullable = false)
    private Double superficieFinca;

    @Column(name = "actividad_principal", length = 100)
    private String actividadPrincipal;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombreFinca() {
        return nombreFinca;
    }

    public void setNombreFinca(String nombreFinca) {
        this.nombreFinca = nombreFinca;
    }

    public String getUbicacionFinca() {
        return ubicacionFinca;
    }

    public void setUbicacionFinca(String ubicacionFinca) {
        this.ubicacionFinca = ubicacionFinca;
    }

    public String getPropietarioFinca() {
        return propietarioFinca;
    }

    public void setPropietarioFinca(String propietarioFinca) {
        this.propietarioFinca = propietarioFinca;
    }

    public Double getSuperficieFinca() {
        return superficieFinca;
    }

    public void setSuperficieFinca(Double superficieFinca) {
        this.superficieFinca = superficieFinca;
    }

    public String getActividadPrincipal() {
        return actividadPrincipal;
    }

    public void setActividadPrincipal(String actividadPrincipal) {
        this.actividadPrincipal = actividadPrincipal;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }

   
    
}
