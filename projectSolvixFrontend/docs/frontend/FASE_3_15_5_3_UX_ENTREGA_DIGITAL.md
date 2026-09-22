# FASE 3.15.5.3 — UX entrega digital y correcciones (Frontend)

## Referencia / alias

El campo de equipo deja de llamarse “Nombre”.

- Label: **Referencia / alias**
- Concepto: identificador contextual del cliente/técnico
- API: `referenciaInterna` (compatibilidad lectura `nombre`)
- Columna DB: `nombre` (sin rename físico)

## Wizard

Al abrir “Registrar equipo”:

- Se ocultan Atrás / Continuar del wizard
- Solo Cancelar / Guardar equipo
- Al guardar: cierra subformulario, selecciona equipo, restaura footer

## Dialogs — causa y solución

**Causa:** `.solvix-dialog-panel` forzaba `background: transparent` en el surface de Material.

**Solución:** superficie sólida `#0f172A` + borde/sombra + backdrop oscuro. Dialogs de servicios usan `backdropClass: 'solvix-dialog-backdrop'`.

## Workflow UI

- LISTO → CTA **Gestionar entrega** (no “Cerrar orden”)
- ENTREGADO / CERRADO → sin CTA manual de cierre
- Cierre ocurre vía entrega válida

## Entrega

Diálogo guiado:

1. Revisar información
2. Confirmación (checkbox obligatorio)
3. Firma manuscrita (canvas)
4. Registrar entrega → API atómica → CERRADO

## Documentos (preparado)

Sección “Documentos” en detalle OT: lista roadmap (recepción PDF, cotización, acta). Constancia digital ya se registra.

## Pendiente

- 3.15.7 cotización formal
- Fase documental PDF
- Notificaciones WhatsApp/correo (`ORDEN_SERVICIO_LISTA`)
