package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OrdenServicioRequestDTO {

    @NotNull(message = "El cliente es obligatorio.")
    private Long clienteId;

    @NotNull(message = "El equipo es obligatorio.")
    private Long equipoId;

    @Size(max = 2000)
    private String problemaReportado;

    @Size(max = 2000)
    private String diagnostico;

    @Size(max = 2000)
    private String trabajoRealizado;

    @Size(max = 1000)
    private String observaciones;

    /**
     * BLOQUE D.2 — firma de recepción al crear la OT.
     * Obligatorios solo en {@code crear}; se ignoran en {@code actualizar}.
     */
    private Boolean clienteConfirmoRecepcion;

    @Size(max = 150, message = "El nombre del firmante no puede superar 150 caracteres.")
    private String nombreFirmanteRecepcion;

    @Size(max = 50, message = "El documento del firmante no puede superar 50 caracteres.")
    private String documentoFirmanteRecepcion;

    /** PNG Base64 o data URL. Obligatorio al crear. */
    private String firmaBase64Recepcion;
}
