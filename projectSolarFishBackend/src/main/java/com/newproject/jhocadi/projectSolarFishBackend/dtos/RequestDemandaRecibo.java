package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import lombok.Data;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;


@Data
public class RequestDemandaRecibo {

	/**
	 * Modo de cálculo del consumo base.
	 * Valores posibles: "RECIBOS", "PROMEDIO_DIRECTO"
	 */
	@NotNull(message = "El modo de cálculo es obligatorio.")
	private String modoCalculoConsumoBase;

	
	private List<@NotNull Double> recibosKwh;

	
	private Double consumoPromedioDirectoKwh;

	/**
	 * Precio del kWh en COP.
	 */
	@NotNull(message = "El precio del kWh es obligatorio.")
	@Positive(message = "El precio del kWh debe ser positivo.")
	private Double precioKwhCop;

	/**
	 * Porcentaje de cobertura deseado (0-100).
	 */
	@NotNull(message = "El porcentaje de cobertura es obligatorio.")
	@DecimalMin(value = "0.0", inclusive = true, message = "El porcentaje de cobertura no puede ser menor que 0.")
	@DecimalMax(value = "100.0", inclusive = true, message = "El porcentaje de cobertura no puede ser mayor que 100.")
	private Double porcentajeCobertura;

	/**
	 * Fecha de inicio del periodo de cálculo.
	 */
	@NotNull(message = "La fecha de inicio del periodo es obligatoria.")
	private LocalDate fechaInicioPeriodo;

	
	@NotNull(message = "La fecha de fin del periodo es obligatoria.")
	private LocalDate fechaFinPeriodo;

	// Validaciones condicionales pueden implementarse con un validador personalizado
}
