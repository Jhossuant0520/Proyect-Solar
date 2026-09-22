package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RechazarCotizacionRequestDTO {

    @Size(max = 1000, message = "La observación no puede superar 1000 caracteres.")
    private String observacion;
}
