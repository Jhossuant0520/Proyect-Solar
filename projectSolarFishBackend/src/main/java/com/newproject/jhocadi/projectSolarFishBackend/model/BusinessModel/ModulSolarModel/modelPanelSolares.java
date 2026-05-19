package com.newproject.jhocadi.projectSolarFishBackend.model.BusinessModel.ModulSolarModel;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "paneles_solares")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class modelPanelSolares {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String marca;  
    private String modelo;

    @Column(name = "tipo_celda")
    private String tipoCelda;

    @Column(name = "potencia_pico_wp")
    private Double potenciaPicoWp;

    private Double voc;
    private Double isc;
    private Double vmp;
    private Double imp;
    private Double kv;
    private Double ki;
    private Double kp;

    @Column(name = "t_noct")
    private Double tNoct;

    private Double eficiencia;

    @Column(name = "precio_referencia_cop")
    private Double precioReferenciaCop;

    private Boolean activo;
    
}
