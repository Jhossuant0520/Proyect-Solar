package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CotizacionServicioRequestDTO {

    @Size(max = 1000, message = "Las observaciones no pueden superar 1000 caracteres.")
    private String observaciones;

    @Size(max = 500, message = "El motivo de ampliación no puede superar 500 caracteres.")
    private String motivoAmpliacion;

    @Valid
    private List<DetalleCotizacionServicioRequestDTO> detalles = new ArrayList<>();
}
