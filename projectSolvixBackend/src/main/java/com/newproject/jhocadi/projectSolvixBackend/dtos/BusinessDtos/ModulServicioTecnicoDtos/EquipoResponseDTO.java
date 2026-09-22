package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.Equipo;
import com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel.TipoEquipo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EquipoResponseDTO {

    private Long id;
    private Long clienteId;
    private String clienteNombre;
    private TipoEquipo tipoEquipo;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String referenciaInterna;
    private String observaciones;
    private boolean activo;
    private LocalDateTime fechaRegistro;

    /** Compatibilidad con clientes que aún leen {@code nombre}. */
    @JsonProperty("nombre")
    public String getNombre() {
        return referenciaInterna;
    }

    public static EquipoResponseDTO fromEntity(Equipo equipo) {
        return EquipoResponseDTO.builder()
            .id(equipo.getId())
            .clienteId(equipo.getCliente() != null ? equipo.getCliente().getId() : null)
            .clienteNombre(equipo.getCliente() != null ? equipo.getCliente().getNombre() : null)
            .tipoEquipo(equipo.getTipoEquipo())
            .marca(equipo.getMarca())
            .modelo(equipo.getModelo())
            .numeroSerie(equipo.getNumeroSerie())
            .referenciaInterna(equipo.getReferenciaInterna())
            .observaciones(equipo.getObservaciones())
            .activo(equipo.isActivo())
            .fechaRegistro(equipo.getFechaRegistro())
            .build();
    }
}
