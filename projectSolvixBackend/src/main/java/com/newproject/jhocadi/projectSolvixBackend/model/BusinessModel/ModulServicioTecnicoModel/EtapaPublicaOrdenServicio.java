package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

/**
 * Agrupación de estados en etapas visibles para el cliente (FASE C.2).
 * Solo presentación: no altera la máquina de estados ni las transiciones.
 */
public enum EtapaPublicaOrdenServicio {

    RECEPCION(1),
    DIAGNOSTICO(2),
    COTIZACION(3),
    REPARACION(4),
    ENTREGA(5);

    public static final int TOTAL = 5;

    private final int numero;

    EtapaPublicaOrdenServicio(int numero) {
        this.numero = numero;
    }

    public int getNumero() {
        return numero;
    }

    /**
     * Etapa de un estado. {@code null} en CANCELADO: la orden no guarda en qué
     * etapa se detuvo y la consulta pública no debe inventarla.
     */
    public static EtapaPublicaOrdenServicio desde(EstadoOrdenServicio estado) {
        if (estado == null) {
            return null;
        }
        return switch (estado) {
            case RECEPCIONADO -> RECEPCION;
            case EN_DIAGNOSTICO, DIAGNOSTICADO -> DIAGNOSTICO;
            case COTIZADO, PENDIENTE_APROBACION -> COTIZACION;
            case APROBADO, EN_REPARACION, ESPERA_REPUESTO, REQUIERE_APROBACION_ADICIONAL -> REPARACION;
            case LISTO, ENTREGADO, CERRADO -> ENTREGA;
            case CANCELADO -> null;
        };
    }
}
