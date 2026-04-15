package com.newproject.jhocadi.projectSolarFishBackend.service;

import com.newproject.jhocadi.projectSolarFishBackend.dtos.RequestDemandaRecibo;
import com.newproject.jhocadi.projectSolarFishBackend.dtos.ResponseDemandaRecibo;

public interface ServiceDemandaRecibo {
    ResponseDemandaRecibo calcularDemandaEnergetica(RequestDemandaRecibo request);
    ResponseDemandaRecibo calcularYGuardar(RequestDemandaRecibo request, String nombreUsuario);
}