package com.newproject.jhocadi.projectSolvixBackend.model.BusinessModel.ModulServicioTecnicoModel;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Ciclo de vida de una orden de servicio técnico.
 * Matriz FASE 3.15.5.2: DIAGNOSTICADO + REQUIERE_APROBACION_ADICIONAL.
 * Cancelación solo hasta APROBADO inclusive.
 */
public enum EstadoOrdenServicio {

    RECEPCIONADO,
    EN_DIAGNOSTICO,
    DIAGNOSTICADO,
    COTIZADO,
    APROBADO,
    EN_REPARACION,
    ESPERA_REPUESTO,
    REQUIERE_APROBACION_ADICIONAL,
    LISTO,
    ENTREGADO,
    CERRADO,
    CANCELADO;

    private static final Map<EstadoOrdenServicio, Set<EstadoOrdenServicio>> TRANSICIONES = Map.ofEntries(
        Map.entry(RECEPCIONADO, EnumSet.of(EN_DIAGNOSTICO, CANCELADO)),
        Map.entry(EN_DIAGNOSTICO, EnumSet.of(DIAGNOSTICADO, CANCELADO)),
        Map.entry(DIAGNOSTICADO, EnumSet.of(COTIZADO, CANCELADO)),
        Map.entry(COTIZADO, EnumSet.of(APROBADO, CANCELADO)),
        Map.entry(APROBADO, EnumSet.of(EN_REPARACION, CANCELADO)),
        Map.entry(EN_REPARACION, EnumSet.of(ESPERA_REPUESTO, REQUIERE_APROBACION_ADICIONAL, LISTO)),
        Map.entry(ESPERA_REPUESTO, EnumSet.of(EN_REPARACION)),
        Map.entry(REQUIERE_APROBACION_ADICIONAL, EnumSet.of(EN_REPARACION)),
        Map.entry(LISTO, EnumSet.of(ENTREGADO)),
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

    /** Órdenes aún operativas (no cerradas ni canceladas). */
    public boolean esActiva() {
        return !esTerminal();
    }

    /**
     * Motivo automático de historial para transiciones normales.
     * Null si la transición exige texto del operador (cancelación / nueva falla).
     */
    public static String motivoAutomatico(EstadoOrdenServicio origen, EstadoOrdenServicio destino) {
        if (origen == null || destino == null) {
            return null;
        }
        if (destino == CANCELADO || destino == REQUIERE_APROBACION_ADICIONAL) {
            return null;
        }
        if (origen == RECEPCIONADO && destino == EN_DIAGNOSTICO) {
            return "Se inició el diagnóstico técnico.";
        }
        if (origen == EN_DIAGNOSTICO && destino == DIAGNOSTICADO) {
            return "Se completó la información de diagnóstico técnico.";
        }
        if (origen == DIAGNOSTICADO && destino == COTIZADO) {
            return "Se preparó la cotización inicial.";
        }
        if (origen == COTIZADO && destino == APROBADO) {
            return "El cliente aprobó la cotización vigente.";
        }
        if (origen == APROBADO && destino == EN_REPARACION) {
            return "Se inició la reparación tras la aprobación del cliente.";
        }
        if (origen == EN_REPARACION && destino == ESPERA_REPUESTO) {
            return "Orden puesta en espera por repuestos pendientes.";
        }
        if (origen == ESPERA_REPUESTO && destino == EN_REPARACION) {
            return "Se reanudó la reparación.";
        }
        if (origen == REQUIERE_APROBACION_ADICIONAL && destino == EN_REPARACION) {
            return "Se reanudó la reparación tras la aprobación adicional.";
        }
        if (origen == EN_REPARACION && destino == LISTO) {
            return "Se completó la reparación.";
        }
        if (origen == LISTO && destino == ENTREGADO) {
            return "Se registró la entrega del equipo.";
        }
        if (origen == ENTREGADO && destino == CERRADO) {
            return "Se cerró la orden de servicio.";
        }
        return "Cambio de estado: " + origen + " → " + destino + ".";
    }

    /** True si el destino exige motivo/descripción del operador. */
    public static boolean requiereMotivoManual(EstadoOrdenServicio destino) {
        return destino == CANCELADO || destino == REQUIERE_APROBACION_ADICIONAL;
    }
}
