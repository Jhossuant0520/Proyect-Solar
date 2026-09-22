package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EquipoRequestDTO {

    @NotNull(message = "El cliente es obligatorio.")
    private Long clienteId;

    @NotNull(message = "El tipo de equipo es obligatorio.")
    private TipoEquipo tipoEquipo;

    @Size(max = 80)
    private String marca;

    @Size(max = 80)
    private String modelo;

    @Size(max = 100)
    private String numeroSerie;

    /**
     * Referencia / alias del equipo en el contexto del cliente.
     * Acepta también {@code nombre} por compatibilidad.
     */
    @JsonProperty("referenciaInterna")
    @JsonAlias("nombre")
    @Size(max = 120)
    private String referenciaInterna;

    @Size(max = 1000)
    private String observaciones;

    private Boolean activo;
}
