package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import lombok.Data;

/**
 * DTO para devolver los resultados del cálculo energético de demanda por recibo.
 */
@Data
public class ResponseDemandaRecibo {

	/**
	 * Modo de cálculo del consumo base ("RECIBOS" o "PROMEDIO_DIRECTO").
	 */
	private String modoCalculoConsumoBase;

	/**
	 * Consumo base mensual del usuario en kWh.
	 */
	private Double consumoBaseMensualKwhUsuario;

	/**
	 * Cantidad de recibos usados para el cálculo.
	 */
	private Integer cantidadRecibosUsados;

	/**
	 * Días totales del periodo calculado.
	 */
	private Integer diasPeriodoCalculados;

	/**
	 * Energía diaria base en Wh.
	 */
	private Double energiaDiariaWhBase;

	/**
	 * Energía mensual base en Wh.
	 */
	private Double energiaMensualWhBase;

	/**
	 * Energía anual base en Wh.
	 */
	private Double energiaAnualWhBase;

	/**
	 * Porcentaje de cobertura aplicado (0-100).
	 */
	private Double porcentajeCoberturaAplicado;

	/**
	 * Factor de cobertura en decimal (0.0-1.0).
	 */
	private Double factorCoberturaDecimal;

	/**
	 * Energía diaria cubierta en Wh.
	 */
	private Double energiaDiariaWhCubierta;

    private Double consumoPeriodoKwhTotalUsuario;
	
	private Double factorPerdidasDecimal;

	
	private Double energiaDiariaWhFinal;

	
	private Double energiaMensualWhFinal;

}
