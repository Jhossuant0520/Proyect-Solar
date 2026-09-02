package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Por qué se corrigió manualmente el costo vigente de un producto.
 *
 * <p>Es una enumeración y no texto libre para que analytics pueda agrupar después: "cuántas
 * correcciones fueron errores de carga" es una pregunta distinta de "cuántas fueron cambios
 * reales de precio del proveedor". El detalle en prosa va en observaciones.
 */
public enum MotivoAjusteCosto {

    /** El costo cargado estaba equivocado. */
    CORRECCION_ERROR,

    /** El proveedor cambió su precio y no hay una compra que lo refleje todavía. */
    ACTUALIZACION_PROVEEDOR,

    /** Producto migrado o cargado sin costo conocido, al que ahora se le asigna uno. */
    CARGA_DE_COSTO_INICIAL,

    /** Revaluación del inventario por criterio del negocio. */
    REVALUACION,

    OTRO
}
