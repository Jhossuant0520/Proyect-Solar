package com.newproject.jhocadi.projectSolvixBackend.service.BusinessService.ModulDemandaReciboService;

import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulDemandaReciboDtos.ResponseDemandaRecibo;

public interface ServiceDemandaRecibo {
    ResponseDemandaRecibo calcularDemandaEnergetica(RequestDemandaRecibo request);
    ResponseDemandaRecibo calcularYGuardar(RequestDemandaRecibo request, String nombreUsuario);
}