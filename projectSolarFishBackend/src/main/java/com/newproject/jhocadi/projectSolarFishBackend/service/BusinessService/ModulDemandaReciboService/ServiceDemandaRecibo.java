package com.newproject.jhocadi.projectSolarFishBackend.service.BusinessService.ModulDemandaReciboService;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.ResponseDemandaRecibo;

public interface ServiceDemandaRecibo {
    ResponseDemandaRecibo calcularDemandaEnergetica(RequestDemandaRecibo request);
    ResponseDemandaRecibo calcularYGuardar(RequestDemandaRecibo request, String nombreUsuario);
}