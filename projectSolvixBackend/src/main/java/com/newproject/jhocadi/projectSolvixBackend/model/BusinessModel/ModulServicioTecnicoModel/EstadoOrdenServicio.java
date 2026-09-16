package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Ciclo de vida de una orden de servicio técnico (FASE 3.15.1).
 * Transiciones controladas en {@link #puedeTransicionarA(EstadoOrdenServicio)}.
 */
public enum EstadoOrdenServicio {

    RECEPCIONADO,
    EN_DIAGNOSTICO,
    COTIZADO,
    APROBADO,
    EN_REPARACION,
    ESPERA_REPUESTO,
    LISTO,
    ENTREGADO,
    CERRADO,
    CANCELADO;

    private static final Map<EstadoOrdenServicio, Set<EstadoOrdenServicio>> TRANSICIONES = Map.ofEntries(
        Map.entry(RECEPCIONADO, EnumSet.of(EN_DIAGNOSTICO, CANCELADO)),
        Map.entry(EN_DIAGNOSTICO, EnumSet.of(COTIZADO, CANCELADO)),
        Map.entry(COTIZADO, EnumSet.of(APROBADO, CANCELADO)),
        Map.entry(APROBADO, EnumSet.of(EN_REPARACION, CANCELADO)),
        Map.entry(EN_REPARACION, EnumSet.of(ESPERA_REPUESTO, LISTO, CANCELADO)),
        Map.entry(ESPERA_REPUESTO, EnumSet.of(EN_REPARACION, CANCELADO)),
        Map.entry(LISTO, EnumSet.of(ENTREGADO, CANCELADO)),
        Map.entry(ENTREGADO, EnumSet.of(CERRADO)),
        Map.entry(CERRADO, EnumSet.noneOf(EstadoOrdenServicio.class)),
        Map.entry(CANCELADO, EnumSet.noneOf(EstadoOrdenServicio.class))
    );

    public boolean puedeTransicionarA(EstadoOrdenServicio destino) {
        if (destino == null || destino == this) {
            return false;
        }
        return TRANSICIONES.getOrDefault(this, Set.of()).contains(destino);
    }

    public boolean esTerminal() {
        return this == CERRADO || this == CANCELADO;
    }
}
