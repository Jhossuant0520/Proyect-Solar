package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.EstadoOrdenServicio;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CambiarEstadoOrdenServicioRequestDTO {

    /**
     * Estado destino. Acepta {@code nuevoEstado} (contrato 3.15.5.1)
     * y alias {@code estado} (compatibilidad 3.15.1).
     */
    @NotNull(message = "El estado destino es obligatorio.")
    @JsonProperty("nuevoEstado")
    @JsonAlias("estado")
    private EstadoOrdenServicio nuevoEstado;

    /**
     * Obligatorio solo para CANCELADO y REQUIERE_APROBACION_ADICIONAL.
     * En transiciones normales el backend genera el motivo automáticamente.
     */
    @Size(max = 500, message = "El motivo no puede superar 500 caracteres.")
    private String motivo;

    @Size(max = 1000, message = "La observación no puede superar 1000 caracteres.")
    private String observacion;

    /** Compatibilidad para código Java que aún usa {@code setEstado}/{@code getEstado}. */
    @JsonIgnore
    public EstadoOrdenServicio getEstado() {
        return nuevoEstado;
    }

    @JsonIgnore
    public void setEstado(EstadoOrdenServicio estado) {
        this.nuevoEstado = estado;
    }
}
