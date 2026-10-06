package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Completar diagnóstico de forma atómica.
 * Origen permitido: EN_DIAGNOSTICO → DIAGNOSTICADO.
 * RECEPCIONADO se rechaza: primero debe ejecutarse "Iniciar diagnóstico" (RECEPCIONADO → EN_DIAGNOSTICO).
 * El trabajo realizado no se acepta en esta operación (pertenece a EN_REPARACION); si llega con texto se rechaza.
 */
@Data
public class CompletarDiagnosticoRequestDTO {

    @Size(max = 2000, message = "El problema reportado no puede superar 2000 caracteres.")
    private String problemaReportado;

    @NotBlank(message = "El diagnóstico técnico es obligatorio.")
    @Size(max = 2000, message = "El diagnóstico no puede superar 2000 caracteres.")
    private String diagnostico;

    @Size(max = 2000, message = "El trabajo realizado no puede superar 2000 caracteres.")
    private String trabajoRealizado;

    @Size(max = 1000, message = "Las observaciones no pueden superar 1000 caracteres.")
    private String observaciones;
}
