# SOLVIX — FASE 3.15.3 Auditoría Diagnóstico y Trabajo Técnico

**Tipo:** AUDITORÍA (base) + implementación frontend en `FASE_3_15_3_DIAGNOSTICO_TRABAJO.md`  
**Base:** Backend 3.15.1 + Frontend 3.15.2  
**Alcance:** diagnóstico, trabajo realizado, observaciones técnicas, edición controlada  
**Fuera de alcance:** repuestos, inventario, costos, mano de obra, cobro, ventas, rol TÉCNICO, garantías, evidencias, analytics, historial de cambios

**Estado:** Contratos auditados. Frontend de sección técnica implementado **sin** cambios de backend.

---

## Respuestas rápidas

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Qué información técnica ya puede almacenarse? | `problemaReportado`, `diagnostico`, `trabajoRealizado`, `observaciones` |
| 2 | ¿Qué endpoint la modifica? | `PUT /api/v1/ordenes-servicio/{id}` |
| 3 | ¿Qué estados deberían mostrarla? | **Todos** la muestran. El backend no oculta campos por estado. La UX puede destacar por fase (solo presentación). |
| 4 | ¿Qué puede editar el ADMIN? | Los 4 textos, en cualquier estado **no terminal**. No cliente, no equipo, no estado vía PUT. |
| 5 | ¿Qué no soporta todavía el backend? | Historial de ediciones; campos por estado; cotización estructurada; repuestos/costos; técnico; validación “diagnóstico obligatorio para pasar a COTIZADO”, etc. |
| 6 | ¿Qué frontend se puede hacer sin tocar backend? | Mejorar sección técnica del detalle: jerarquía, hints por estado, edición guiada, feedback. Reutilizar `servicio-detail` + PUT existente. |

**Conclusión:** el contrato actual **ya soporta completamente** almacenar y editar diagnóstico/trabajo. **No hace falta cambiar backend** para esta fase funcional.

---

## 1. Campos existentes (contrato real)

### Entidad `OrdenServicio`

| Campo Java | Columna | Longitud | Notas |
|------------|---------|----------|-------|
| `problemaReportado` | `problema_reportado` | 2000 | Texto libre |
| `diagnostico` | `diagnostico` | 2000 | Texto libre |
| `trabajoRealizado` | `trabajo_realizado` | 2000 | Texto libre |
| `observaciones` | `observaciones` | 1000 | Texto libre |

No hay otros campos de texto técnico (ni `notasInternas`, ni `avance`, ni `cotizacionTexto`, etc.).

Campos relacionados **no** son “diagnóstico”:

| Campo | Rol |
|-------|-----|
| `estado` | Ciclo de vida (enum) |
| `fechaRecepcion` / `fechaActualizacion` / `fechaCierre` | Tiempos |
| `createdBy` | Username ADMIN al crear |
| `cliente` / `equipo` / `numero` | Identidad documental |

### `OrdenServicioRequestDTO` (crear y PUT)

| Campo | Obligatorio | Max |
|-------|-------------|-----|
| `clienteId` | Sí | — |
| `equipoId` | Sí | — |
| `problemaReportado` | No | 2000 |
| `diagnostico` | No | 2000 |
| `trabajoRealizado` | No | 2000 |
| `observaciones` | No | 1000 |

En **crear**, los cuatro textos son opcionales. El número y el estado inicial (`RECEPCIONADO`) los pone el backend.

### `OrdenServicioResponseDTO`

Expone los mismos cuatro textos + estado + fechas + denormalizados de cliente/equipo + `createdBy`.

**No inventar campos:** estos cuatro son el contrato equivalente completo para diagnóstico y trabajo.

---

## 2. Endpoint de edición

```
PUT /api/v1/ordenes-servicio/{id}
Body: OrdenServicioRequestDTO
Respuesta: 200 OrdenServicioResponseDTO
Permiso: ADMIN
```

### Qué modifica (código real de `OrdenServicioService.actualizar`)

1. `problemaReportado`
2. `diagnostico`
3. `trabajoRealizado`
4. `observaciones`

Vacío → `null` (trim). Actualiza `fechaActualizacion` vía `@PreUpdate`.

### Qué **no** modifica el PUT

| Prohibido | Comportamiento |
|-----------|----------------|
| Cambiar `clienteId` / `equipoId` | `BusinessException` si difieren de la orden |
| Cambiar `estado` | El PUT no toca estado |
| Editar si `CERRADO` o `CANCELADO` | `BusinessException` (`esTerminal()`) |

Cambio de estado sigue siendo:

```
POST /api/v1/ordenes-servicio/{id}/estado
Body: { "estado": "EN_DIAGNOSTICO" }
```

Ese endpoint **no** acepta textos. Diagnóstico y transición son operaciones separadas.

---

## 3. Restricciones por estado (reales vs presentación)

### Reglas **reales** del backend

| Regla | Existe |
|-------|--------|
| No editar textos si `CERRADO` / `CANCELADO` | **Sí** |
| Exigir `diagnostico` no vacío para pasar a `COTIZADO` | **No** |
| Exigir `trabajoRealizado` para pasar a `LISTO` | **No** |
| Bloquear edición de `problemaReportado` tras salir de `RECEPCIONADO` | **No** |
| Campos distintos editables según estado | **No** |
| Cotización con montos/líneas | **No** (no hay campos) |

Cualquier estado no terminal permite editar **los cuatro** textos con el mismo PUT.

### Propuesta conceptual (solo UX / no backend)

| Estado | Enfoque de presentación sugerido |
|--------|-----------------------------------|
| RECEPCIONADO | Destacar **problema reportado** |
| EN_DIAGNOSTICO | Destacar **diagnóstico** |
| COTIZADO / APROBADO | Mostrar diagnóstico; hint de que la cotización económica aún no existe |
| EN_REPARACION / ESPERA_REPUESTO | Destacar **trabajo realizado** |
| LISTO | Trabajo como resultado final |
| ENTREGADO | Solo lectura operativa (aún editable hasta CERRADO) |
| CERRADO / CANCELADO | Solo lectura (regla real) |

Esto es **presentación**, no reglas de negocio. Si más adelante se quiere exigir textos al transicionar, sería un cambio de backend explícito (fuera de 3.15.3 auditoría).

---

## 4. Estados y transiciones

Máquina real (`EstadoOrdenServicio`):

| Actual | Siguientes |
|--------|------------|
| RECEPCIONADO | EN_DIAGNOSTICO, CANCELADO |
| EN_DIAGNOSTICO | COTIZADO, CANCELADO |
| COTIZADO | APROBADO, CANCELADO |
| APROBADO | EN_REPARACION, CANCELADO |
| EN_REPARACION | ESPERA_REPUESTO, LISTO, CANCELADO |
| ESPERA_REPUESTO | EN_REPARACION, CANCELADO |
| LISTO | ENTREGADO, CANCELADO |
| ENTREGADO | CERRADO |
| CERRADO / CANCELADO | — |

Angular (3.15.2) ya espeja esta tabla en `servicio-ui.ts` (`transicionesDesde`).  
**No hay** endpoint que liste transiciones. La UI muestra destinos conocidos; el backend valida al ejecutar.

`ESPERA_REPUESTO` existe en la máquina aunque esta fase no implemente repuestos: es un estado válido hoy.

---

## 5. Historial

| Capacidad | ¿Existe? |
|-----------|----------|
| Tabla/entidad de historial de diagnóstico o trabajo | **No** |
| Log de quién cambió cada texto | **No** (solo `createdBy` al crear) |
| Versiones / diff de textos | **No** |
| `fechaActualizacion` como “hubo algún cambio” | **Sí** (timestamp agregado, no por campo) |

**Documentado:** no hay historial de cambios.  
**No crear** auditoría histórica en esta fase. Cada PUT sobrescribe el valor actual.

---

## 6. Backend: ¿hace falta cambiar algo?

Para **diagnóstico + trabajo + observaciones + edición controlada**:

| Necesidad | Soporte actual |
|-----------|----------------|
| Guardar diagnóstico | Sí |
| Guardar trabajo realizado | Sí |
| Guardar observaciones | Sí |
| Editar sin cambiar estado | Sí (PUT) |
| Bloquear edición terminal | Sí |
| Separar cambio de estado | Sí (POST estado) |

**Cambios backend necesarios para 3.15.3 (funcional mínimo): ninguno.**

Faltaría backend solo si se pidiera (futuro):

- historial de ediciones
- validaciones texto↔transición
- campos de cotización / costos / mano de obra
- rol TÉCNICO distinto de ADMIN
- adjuntos / evidencias

---

## 7. Frontend existente (`/servicios/:id`)

### Ya implementado (3.15.2)

| Pieza | Qué hace |
|-------|----------|
| `ServicioDetailComponent` | GET detalle; muestra los 4 textos; modo edición; PUT; botones de transición |
| `OrdenServicioService.actualizar` | Encapsula PUT |
| `aRequestActualizacionTextos` | Conserva `clienteId`/`equipoId`; solo textos |
| `puedeEditarTextos` | `!esTerminal` (alineado al backend) |
| `transicionesDesde` | Acciones de estado |

### Limitaciones UX actuales (mejorables sin backend)

> **Actualizado en implementación 3.15.3:** sección técnica unificada, hints, foco por estado, dirty-check (no PUT sin cambios), lectura en terminales. Pendiente a futuro: historial, validación texto↔transición.

- ~~Edición “todo o nada”~~ → edición guiada con hints (sigue siendo un PUT de los cuatro textos).
- ~~No hay énfasis por estado~~ → `campoTecnicoDestacado` (solo UX).
- ~~No hay hint~~ → hints por campo.
- Historial de ediciones: sigue sin existir.
- Validación texto↔estado: sigue sin existir en backend.

### Reutilizar

- Misma ruta `/servicios/:id` (sin `/editar`).
- Mismos servicios, mapper, badges, snack, `mapHttpError`.
- No crear pantallas nuevas ni endpoints nuevos.

---

## 8. Propuesta UX (sección técnica)

Jerarquía clara en el detalle:

```
┌ OS-2026-######  [ESTADO] ┐
│ Cliente / Equipo         │
└──────────────────────────┘

Problema reportado
  [texto | editar según contexto]

Diagnóstico
  [texto | destacar si EN_DIAGNOSTICO…]

Trabajo realizado
  [texto | destacar si EN_REPARACION / LISTO…]

Observaciones
  [texto auxiliar]

Acciones
  [Editar información técnica]
  [Cambiar estado → destinos válidos]
```

### Qué debería ser editable y cuándo

| Campo | Backend | UX recomendada (presentación) |
|-------|---------|--------------------------------|
| `problemaReportado` | Editable si no terminal | Editable siempre (no terminal); hint más fuerte en RECEPCIONADO |
| `diagnostico` | Idem | Destacar desde EN_DIAGNOSTICO en adelante |
| `trabajoRealizado` | Idem | Destacar desde EN_REPARACION / LISTO |
| `observaciones` | Idem | Siempre disponible como notas de taller |

**Editable real:** ADMIN, estado ∉ {CERRADO, CANCELADO}.  
**No editable real:** terminal; nunca cliente/equipo vía esta pantalla.

Opcional UX (sin reglas backend): sugerir completar diagnóstico antes de ofrecer mentalmente “pasar a Cotizado”, pero el botón de transición no debe bloquearse en frontend si el backend no lo exige.

---

## 9. Limitaciones del contrato actual

- Textos planos: un string por concepto; sin secciones estructuradas.
- Sin historial / auditoría de ediciones.
- Sin vínculo forzado texto ↔ estado.
- Sin cotización económica (COTIZADO es solo un estado).
- Sin repuestos, costos, técnico, evidencias.
- PUT exige reenviar `clienteId` + `equipoId` sin cambiarlos.
- Cambio de estado no actualiza textos en el mismo request.

---

## 10. Alcance de implementación frontend (siguiente paso, no esta auditoría)

Sin tocar backend se puede:

1. Reorganizar la sección técnica del detalle (jerarquía + copy).
2. Hints / énfasis por estado (solo UI).
3. Mejorar el flujo de edición (mismo PUT).
4. Tests de edición por campo y bloqueo en terminal.
5. Documentar en `FASE_3_15_3_*.md` de implementación cuando se haga.

No se debe:

- inventar endpoints
- inventar campos
- duplicar máquina de estados como autoridad
- crear historial
- añadir costos/repuestos/técnico

---

## Dependencias

- Backend 3.15.1 desplegado
- Frontend 3.15.2 (`/servicios/:id` operativo)
- JWT ADMIN

---

## Checklist de auditoría

- [x] Campos de texto técnicos inventariados  
- [x] Endpoint PUT confirmado  
- [x] Restricción terminal confirmada  
- [x] Sin reglas texto↔estado en backend  
- [x] Transiciones documentadas; Angular ya las espeja  
- [x] Historial: no existe  
- [x] Backend suficiente para la fase  
- [x] Frontend reutilizable; mejoras UX posibles sin API nueva  
- [x] Sin modificación de código en esta fase  
