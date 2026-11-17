# FASE 3.15.5.2 — UX workflow de servicios (Frontend)

## Decisiones UX

1. Acciones normales **no** abren modal de “¿Por qué?”.
2. Feedback con snackbar / hint contextual (no cards rojas de error).
3. Scroll + focus al bloque técnico cuando corresponde.
4. Confirmación simple solo para aprobación / entrega / cierre.
5. Formularios específicos solo para cancelación y nueva falla.
6. Espera de repuesto: confirmación contextual con líneas pendientes.

## Acciones contextuales

| Estado | CTA principal | Comportamiento |
|--------|---------------|----------------|
| RECEPCIONADO | Iniciar diagnóstico | Transición directa + scroll a diagnóstico |
| EN_DIAGNOSTICO | Ir al diagnóstico | Scroll/focus; Guardar diagnóstico → API atómica |
| DIAGNOSTICADO | Preparar cotización | Directa (hito; sin montos) |
| COTIZADO | Registrar aprobación | Confirmación simple |
| APROBADO | Iniciar reparación | Directa |
| EN_REPARACION | Marcar como listo | Completar reparación o guiar a trabajo |
| ESPERA_REPUESTO | Continuar reparación | Directa |
| REQUIERE_APROBACION_ADICIONAL | (sin salida FE) | Mensaje de fase posterior |
| LISTO | Registrar entrega | Confirmación |
| ENTREGADO | Cerrar orden | Confirmación |

Secundarias en reparación: Poner en espera · Registrar nueva falla · Cancelar (si aplica).

## Eliminación de modales innecesarios

Eliminado el modal genérico de motivo para iniciar/finalizar diagnóstico, iniciar reparación, marcar listo, etc.

## Scroll / focus

- Tras iniciar diagnóstico → panel técnico + focus en Diagnóstico.
- Si falta trabajo al marcar listo → focus en Trabajo realizado + hint.
- Continuar reparación → scroll al bloque de repuestos/reparación.

## Ficha técnica

Campos existentes reutilizados. En `EN_DIAGNOSTICO`, “Guardar diagnóstico” llama `completarDiagnostico` (no PUT + POST separados).

## Próxima acción / timeline / progreso

Actualizados labels, textos y pasos (`DIAGNOSTICADO` en la línea principal). `ESPERA_REPUESTO` y `REQUIERE_APROBACION_ADICIONAL` como estados especiales (ámbar informativo, no error crítico).

## Diseño visual

- Panel de próxima acción: estilo normal SOLVIX Tech-Minimal.
- Atención solo en espera / aprobación adicional.
- Cancelación: danger.

## Compatibilidad

Misma ruta `/servicios/:id`. Repuestos 3.15.6 sin cambios de reglas. Environments/API centralizados.
