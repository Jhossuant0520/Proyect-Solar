# SOLVIX — FASE 3.15.3 Diagnóstico y Trabajo Técnico (Frontend)

**Tipo:** IMPLEMENTACIÓN FRONTEND  
**Base:** Auditoría `FASE_3_15_3_AUDITORIA_DIAGNOSTICO.md`  
**Restricción:** No se modificó backend, DTOs ni endpoints.

---

## Objetivo

Convertir la sección técnica de `/servicios/:id` en una herramienta clara de trabajo para ADMIN:

1. Problema reportado  
2. Diagnóstico  
3. Trabajo realizado  
4. Observaciones  

Sin lógica de negocio nueva: solo presentación, edición y feedback sobre el contrato existente.

---

## Campos

| Campo | Max | Uso |
|-------|-----|-----|
| `problemaReportado` | 2000 | Qué indicó el cliente |
| `diagnostico` | 2000 | Qué encontró el técnico |
| `trabajoRealizado` | 2000 | Qué se reparó / hizo |
| `observaciones` | 1000 | Notas adicionales |

---

## Endpoint

```
PUT /api/v1/ordenes-servicio/{id}
```

Body: `clienteId` + `equipoId` (sin cambiar) + los cuatro textos.  
No cambia estado. Estado sigue con `POST .../{id}/estado`.

---

## Comportamiento por estado

| Estado | Edición | Destacado (UX) |
|--------|---------|----------------|
| RECEPCIONADO | Sí | Problema reportado |
| EN_DIAGNOSTICO / COTIZADO / APROBADO | Sí | Diagnóstico |
| EN_REPARACION / ESPERA_REPUESTO | Sí | Trabajo realizado |
| LISTO / ENTREGADO | Sí | Resumen completo (sin foco único) |
| CERRADO / CANCELADO | Solo lectura | Resumen completo |

Ningún campo se oculta por estado.

---

## Edición

Flujo: **Editar → Guardar / Cancelar**.

- Guardar solo si hay cambios reales (trim; vacío ≈ null).
- Sin cambios: cierra edición **sin** PUT.
- Tras PUT OK: refresca detalle, snack de confirmación, conserva estado/cliente/equipo.
- Error: mensaje humano (sin SQL/JPA).

---

## UX

- Cabecera: número + badge de estado + cliente + equipo.
- Bloque **Sección técnica** con labels, hints y resalte `En foco`.
- Acciones de estado separadas del formulario técnico.
- Tech-Minimal; un scroll vertical.

---

## Seguridad

Ruta bajo `authGuard` + `adminGuard`. Backend ADMIN. Sin cambios de SecurityConfig.

---

## Tests

| Spec | Cobertura |
|------|-----------|
| `servicio-detail.spec.ts` | 4 campos, editar, guardar, cancelar, sin PUT sin cambios, lectura CERRADO/CANCELADO, error, estado |
| `servicio-ui.spec.ts` | foco por estado, dirty-check de textos |

---

## Build

```bash
npm run build
npx ng test --watch=false --browsers=ChromeHeadless
```

- `npm run build`: OK  
- Specs de esta fase (detail + ui + orden-servicio service): **27/27 OK**

---

## Limitaciones

- Sin historial de ediciones.
- Sin exigir textos al cambiar de estado.
- Sin cotización, repuestos, costos, técnico, evidencias.
- Destacado por estado es solo presentación.
