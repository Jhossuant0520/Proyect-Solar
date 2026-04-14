package com.newproject.jhocadi.projectSolarFishBackend.service;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.ResponseDemandaRecibo;

/**
 * Servicio para el cálculo energético basado en consumo eléctrico.
 */
public interface ServiceDemandaRecibo {

	/**
	 * Calcula los resultados energéticos a partir de los datos de entrada del usuario.
	 * @param request DTO con los datos de entrada
	 * @return DTO con los resultados del cálculo energético
	 */
	ResponseDemandaRecibo calcularDemandaEnergetica(RequestDemandaRecibo request);

}
