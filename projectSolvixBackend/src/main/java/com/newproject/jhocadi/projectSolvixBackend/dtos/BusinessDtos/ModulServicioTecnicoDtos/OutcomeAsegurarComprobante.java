package com.newproject.jhocadi.projectSolvixBackend.dtos.BusinessDtos.ModulServicioTecnicoDtos;

/**
 * Resultado de asegurar el comprobante de recepción (POST idempotente).
 * No es un estado persistido: solo informa al cliente si se creó o ya existía.
 */
public enum OutcomeAsegurarComprobante {
    /** Se generó un PDF nuevo en esta llamada. */
    GENERATED,
    /** Ya existía; se devolvió el vigente sin duplicar. */
    EXISTING
}
