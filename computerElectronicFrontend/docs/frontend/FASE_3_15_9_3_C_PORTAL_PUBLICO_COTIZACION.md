# SOLVIX Frontend — FASE 3.15.9.3-C
## Portal público — acciones de cotización

**Fecha:** 2026-10-01  
**Backend:** 3.15.9.3-B

| Etiqueta | Uso |
|----------|-----|
| **HECHO** | Existía antes |
| **IMPLEMENTADO** | Esta fase |
| **DECISION** | Elección de diseño |
| **NO IMPLEMENTADO** | Fuera de alcance |

---

### Auditoría previa (HECHO)

| Pieza | Ubicación |
|-------|-----------|
| Componente | `ConsultaOtPublicaComponent` |
| Servicio | `DocumentoOrdenServicioService` |
| Models | `documento-orden-servicio.models.ts` |
| Feedback | `SolvixFeedbackService` / `SolvixActionRevealService` |
| Patrón UI | Sección expandible (sin MatDialog en portal) |
| Ruta | `/consulta/ot/:token` sin auth |

---

### 1. Flujo UX — IMPLEMENTADO

```text
Consulta OT
 → Ver cotización (si pendiente)
 → Aprobar | Rechazar
 → Panel identidad (documento + teléfono)
 → Confirmar
 → POST backend
 → Feedback + refresh GET OT
```

### 2. Componentes afectados

- `consulta-ot-publica` (ts/html/scss/spec)
- `documento-orden-servicio.service` (+ models)
- util `consulta-ot-publica-accion.util.ts`

### 3. Contrato utilizado

- `POST .../consulta/ot/{token}/cotizacion/aprobar`
- `POST .../consulta/ot/{token}/cotizacion/rechazar`
- Body: `{ numeroDocumento, telefono }`
- Response: `AccionPublicaCotizacionResponseDTO`

### 4. Estados de UI

| Estado | Significado |
|--------|-------------|
| `panelAccion: cerrado\|aprobar\|rechazar` | Panel identidad |
| `enviandoAccion` | Bloqueo doble submit |
| `resultadoAccion` | Banner post-éxito |
| Acciones visibles | Solo si `cotizacionDisponible` + `PENDIENTE_APROBACION` + cotización cargada |

### 5. Errores

| HTTP | Mensaje UX |
|------|------------|
| 403 | Validación genérica (sin filtrar campo) |
| 429 | Límite de intentos |
| 404 | Sin cotización / enlace inválido |
| 400 | Negocio genérico |

### 6–8. Responsive / a11y / reutilización

- Mobile-first: botones full-width ≤480px, inputs 44px
- Labels nativos, `role="alert"`, `aria-live`
- `prefers-reduced-motion`
- Reutiliza feedback/reveal SOLVIX; botones del portal (no nuevo design system)

### 9. Tests

- Visibilidad acciones / no acciones
- Panel aprobar-rechazar / validación vacía
- Éxito + refresh
- 403 / 429
- Doble submit
- Service POST paths

### 10. Decisiones

**DECISION:** panel inline expandible (coherente con “Ver cotización”), no MatDialog.  
**DECISION:** no normalizar teléfono/documento en FE.  
**DECISION:** sincronizar siempre con GET OT tras éxito.

### 11. Limitaciones / NO IMPLEMENTADO

- Observación de rechazo (opcional en BE; no pedida en UI)
- WhatsApp/OTP/PIN/login cliente
- Cambios QR/PDF/backend

---

### Criterios

Portal permite aprobar/rechazar con identidad; backend sigue siendo autoridad; consulta pública previa intacta.
