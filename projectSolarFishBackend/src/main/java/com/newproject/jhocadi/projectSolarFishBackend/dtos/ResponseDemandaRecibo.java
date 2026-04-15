package com.newproject.jhocadi.projectSolarFishBackend.dtos;

import lombok.Data;

/**
 * DTO para devolver los resultados del cálculo energético de demanda por recibo.
 */
@Data
public class ResponseDemandaRecibo {


	private String modoCalculoConsumoBase;

	private Double consumoBaseMensualKwhUsuario;

	private Integer cantidadRecibosUsados;

	private Integer diasPeriodoCalculados;

	private Double energiaDiariaWhBase;

	private Double energiaMensualWhBase;

	private Double energiaAnualWhBase;
	
	private Double porcentajeCoberturaAplicado;

	private Double factorCoberturaDecimal;
	
	private Double energiaDiariaWhCubierta;
	
	private Double factorSeguridad;
	
	private Double energiaDiariaWhFinal;
	
	private Double energiaMensualWhFinal;

	private Double energiaAnualWhFinal;

}
