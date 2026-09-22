package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

/**
 * Tipos de documento PDF generados para una orden de servicio (FASE 3.15.8).
 */
public enum TipoDocumentoOrdenServicio {
    COMPROBANTE_RECEPCION,
    COTIZACION,
    ACTA_ENTREGA;

    public String etiqueta() {
        return switch (this) {
            case COMPROBANTE_RECEPCION -> "Comprobante de recepción";
            case COTIZACION -> "Cotización";
            case ACTA_ENTREGA -> "Acta de entrega";
        };
    }
}
