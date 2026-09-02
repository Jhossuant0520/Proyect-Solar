package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel.MetodoReembolso;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReembolsoRequestDTO {

    @NotNull(message = "El método de reembolso es obligatorio.")
    private MetodoReembolso metodoReembolso;
}
