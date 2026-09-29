# SOLVIX Frontend — BLOQUE C.1
## UX unificada de generación de documentos

**Fecha:** 2026-09-28  
**Alcance:** solo feedback visual / estado UI. Sin cambios de arquitectura PDF, afterCommit, async, cache ni plantillas.

---

### Principio

Durante una operación lenta el usuario debe ver:

1. botón en **loading** real (`solvix-button`);
2. texto breve que explica la acción;
3. **disabled** (sin doble click);
4. al terminar: éxito o error y el control vuelve a estar disponible.

No se añaden spinners, shimmer ni animaciones decorativas nuevas.

---

### Patrón de estado

Conceptual (reutilizando flags existentes):

```
IDLE → PROCESSING → SUCCESS | ERROR → IDLE
```

| Señal | Uso |
|---|---|
| `procesando` | Cotización comercial detail |
| `accionEnCurso` + `accionTipo` | Paneles OT (documentos / cotizaciones) |
| `[loading]` / `[disabled]` | `solvix-button` (clase `is-loading`) |

Liberación garantizada con `finalize()` en las peticiones HTTP de generación.

---

### Acciones cubiertas

| Acción | Mensaje en PROCESSING |
|---|---|
| Presentar cotización comercial | Presentando y generando PDF… |
| Generar / regenerar PDF comercial | Generando PDF… |
| Presentar cotización de servicio | Presentando y generando PDF… |
| Generar PDF cotización OT | Generando PDF… |
| Generar / reintentar comprobante | Generando comprobante… |
| Regenerar documento OT | Generando PDF… |
| Esperar / generar acta | Generando acta de entrega… |

Polling de documentos OT: **conservado** sin cambios de lógica.

---

### Motion

- Spinner = icono Material con `.is-loading` (sistema existente).
- Respeta `prefers-reduced-motion`.
- Sin pulse, bounce, glow ni animaciones permanentes.

---

### Errores

- HTTP error → loading off, botón disponible, snackbar.
- No se cambia el contrato backend de fallos silenciosos en afterCommit (fuera de C.1).

---

### Archivos

- `cotizacion-comercial-detail.ts` / `.html` / `.spec.ts`
- `servicio-documentos-panel.ts` / `.html` / `.spec.ts`
- `servicio-cotizaciones-panel.ts` / `.html` / `.spec.ts`

### Fuera de alcance (posteriores)

- Cache de fuentes / OpenHTMLToPDF
- `@Async` / colas
- Cambio de afterCommit
- Polling nuevo en comercial como optimización
