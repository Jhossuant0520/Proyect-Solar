package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulComercialDtos;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CotizacionComercialRequestDTO {

    /** Si se omite la cotización queda a nombre del Consumidor final. */
    private Long clienteId;

    @Size(max = 1000, message = "Las observaciones no pueden superar 1000 caracteres.")
    private String observaciones;

    @Valid
    private List<DetalleCotizacionComercialRequestDTO> detalles = new ArrayList<>();
}
