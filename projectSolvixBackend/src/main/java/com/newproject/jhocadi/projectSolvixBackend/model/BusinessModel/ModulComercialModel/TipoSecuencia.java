package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulComercialModel;

/**
 * Series de numeración legible de documentos de negocio
 * (V / C / D / DC / OS / COT-{yyyy}-{seq}).
 */
public enum TipoSecuencia {

    VENTA("V"),
    COMPRA("C"),
    DEVOLUCION_VENTA("D"),
    DEVOLUCION_COMPRA("DC"),
    ORDEN_SERVICIO("OS"),
    COTIZACION_SERVICIO("COT");

    private final String prefijo;

    TipoSecuencia(String prefijo) {
        this.prefijo = prefijo;
    }

    public String getPrefijo() {
        return prefijo;
    }
}
