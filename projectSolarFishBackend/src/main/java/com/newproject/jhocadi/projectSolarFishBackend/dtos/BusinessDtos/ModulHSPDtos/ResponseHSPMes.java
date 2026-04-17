package com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ResponseHSPMes {
    private int    mes;
    private String nombreMes;
    private int    diasMes;
    private double hOptM;      // H(i_opt)_m  kWh/m²/mes  (de PVGIS)
    private double hspDiaria;  // hOptM / diasMes
}