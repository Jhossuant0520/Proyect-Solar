package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

/**
 * Estado derivado de una línea de repuesto. No se persiste:
 * se calcula desde cantidades + flag anulado.
 */
public enum EstadoRepuestoOrdenServicio {
    PLANIFICADO,
    PARCIAL,
    CONSUMIDO,
    DEVUELTO,
    ANULADO;

    public static EstadoRepuestoOrdenServicio derivar(
            boolean anulado,
            int cantidadPlanificada,
            int cantidadConsumida,
            int cantidadDevuelta) {
        if (anulado) {
            return ANULADO;
        }
        int neta = cantidadConsumida - cantidadDevuelta;
        if (cantidadConsumida == 0) {
            return PLANIFICADO;
        }
        if (neta == 0) {
            return DEVUELTO;
        }
        if (neta == cantidadPlanificada) {
            return CONSUMIDO;
        }
        return PARCIAL;
    }
}
