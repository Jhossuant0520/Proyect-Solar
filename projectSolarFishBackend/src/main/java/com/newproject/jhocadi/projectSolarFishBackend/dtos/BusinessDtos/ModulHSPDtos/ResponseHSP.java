package com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulHSPDtos;

import lombok.Data;
import java.util.List;

@Data
public class ResponseHSP {
    private double latitud;
    private double longitud;
    private int    anioConsultado;
    private double slopeAngle;
    private double azimuthAngle;

    private List<ResponseHSPMes> meses;

    private double hspCritica;
    private int    mesCritico;
    private String nombreMesCritico;

    private double hspFavorable;
    private int    mesFavorable;
    private String nombreMesFavorable;

    private double hspPromedio;
    private double hspDiseno;   // hspCritica × 0.85
}