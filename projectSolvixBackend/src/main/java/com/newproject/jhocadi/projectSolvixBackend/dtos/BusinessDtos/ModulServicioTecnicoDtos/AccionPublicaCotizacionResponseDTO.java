package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoCotizacionServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoCotizacionServicio;

import lombok.Builder;
import lombok.Data;

/**
 * Respuesta pública mínima tras aprobar/rechazar (sin PII ni IDs internos innecesarios).
 */
@Data
@Builder
public class AccionPublicaCotizacionResponseDTO {

    private String ordenNumero;
    private EstadoOrdenServicio ordenEstado;
    private String cotizacionNumero;
    private TipoCotizacionServicio cotizacionTipo;
    private EstadoCotizacionServicio cotizacionEstado;
    private String mensaje;
}
