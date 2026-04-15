package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import lombok.Data;
import jakarta.validation.constraints.*;
import java.util.List;


@Data
public class RequestDemandaRecibo {

    @NotNull(message = "El modo de cálculo es obligatorio.")
    private String modoCalculoConsumoBase; // "RECIBOS" o "PROMEDIO_DIRECTO"

    private List<@NotNull Double> recibosKwh;

    private Double consumoPromedioDirectoKwh;

    @NotNull(message = "El precio del kWh es obligatorio.")
    @Positive(message = "El precio del kWh debe ser positivo.")
    private Double precioKwhCop;

    @NotNull(message = "El porcentaje de cobertura es obligatorio.")
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "100.0")
    private Double porcentajeCobertura;

    // --- CAMBIO CLAVE AQUÍ ---
    @NotNull(message = "El año de inicio es obligatorio.")
    private Integer anioInicio;

    @NotNull(message = "El mes de inicio es obligatorio.")
    @Min(1) @Max(12)
    private Integer mesInicio;

    @NotNull(message = "El año de fin es obligatorio.")
    private Integer anioFin;

    @NotNull(message = "El mes de fin es obligatorio.")
    @Min(1) @Max(12)
    private Integer mesFin;
}