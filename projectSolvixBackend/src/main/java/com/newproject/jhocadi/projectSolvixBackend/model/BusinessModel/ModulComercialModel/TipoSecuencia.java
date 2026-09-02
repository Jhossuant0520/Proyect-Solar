package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Series de numeración legible de documentos de negocio
 * (V-{yyyy}-{seq}, C-{yyyy}-{seq}, D-{yyyy}-{seq}, DC-{yyyy}-{seq}).
 */
public enum TipoSecuencia {

    VENTA("V"),
    COMPRA("C"),
    DEVOLUCION_VENTA("D"),
    DEVOLUCION_COMPRA("DC");

    private final String prefijo;

    TipoSecuencia(String prefijo) {
        this.prefijo = prefijo;
    }

    public String getPrefijo() {
        return prefijo;
    }
}
