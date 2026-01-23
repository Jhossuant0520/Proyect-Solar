package com.newproject.jhocadi.projectSolarFishBackend.model;


import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "componente_energetico")
public class componenteEnergeticoModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "finca_id", nullable = false)
    private fincaModel finca;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(nullable = false)
    private Double potencia;

    @Column(name = "horas_operacion", nullable = false)
    private Double horasOperacion;

    @Column(name = "coeficiente_arranque")
    private Double coeficienteArranque = 1.0;

    @Column(name = "horas_reales_periodo")
    private Double horasRealesPeriodo = 24.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_energia", nullable = false)
    private TipoEnergia tipoEnergia;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro = LocalDateTime.now();

    public enum TipoEnergia {
        AC, DC
    }

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

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public Double getPotencia() {
        return potencia;
    }

    public void setPotencia(Double potencia) {
        this.potencia = potencia;
    }

    public Double getHorasOperacion() {
        return horasOperacion;
    }

    public void setHorasOperacion(Double horasOperacion) {
        this.horasOperacion = horasOperacion;
    }

    public Double getCoeficienteArranque() {
        return coeficienteArranque;
    }

    public void setCoeficienteArranque(Double coeficienteArranque) {
        this.coeficienteArranque = coeficienteArranque;
    }

    public Double getHorasRealesPeriodo() {
        return horasRealesPeriodo;
    }

    public void setHorasRealesPeriodo(Double horasRealesPeriodo) {
        this.horasRealesPeriodo = horasRealesPeriodo;
    }

    public TipoEnergia getTipoEnergia() {
        return tipoEnergia;
    }

    public void setTipoEnergia(TipoEnergia tipoEnergia) {
        this.tipoEnergia = tipoEnergia;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
    
    
}
