# SOLVIX Frontend — BLOQUE D.13
## Sección técnica sincronizada con workflow

**Fecha:** 2026-10-01  
**Alcance:** `servicio-detail` guardado de ficha técnica.  
**Sin cambios:** listado Servicios, cotizaciones UI, QR/token, PDF.

---

### 1. Bug / escenario

Desde **RECEPCIONADO**, guardar la sección técnica con diagnóstico usaba `PUT actualizar` y **no** avanzaba el workflow. La UI interna y el QR quedaban en recepción pese a tener diagnóstico guardado.

---

### 2. Causa

`guardarTextos()` solo delegaba a `completarDiagnostico` si `enDiagnostico` (`EN_DIAGNOSTICO`).

---

### 3. Cambio

| Condición | Acción |
|-----------|--------|
| `RECEPCIONADO` o `EN_DIAGNOSTICO` **y** diagnóstico no vacío | `POST …/diagnostico/completar` |
| Otros estados / sin diagnóstico | `PUT actualizar` (sin transición) |

Payload de completar incluye `trabajoRealizado` opcional (persistencia; el backend no salta a reparación).

Feedback D.1: **"Diagnóstico registrado."** (un solo snack)  
Reveal: abre Cotizaciones + `SolvixActionRevealService` (ya existente).

---

### 4. Consulta pública / QR

No se cambió texto de consulta. Al quedar la OT en **DIAGNOSTICADO**, el mapping público existente muestra etapa **Diagnóstico** / “Preparando tu cotización”.

---

### 5. Tests

`servicio-detail.spec.ts`:

- D.13 RECEPCIONADO + diagnóstico → `completarDiagnostico`, no `actualizar`  
- Guardado en COTIZADO (solo observaciones) → sigue `actualizar`  
- Error de guardado adaptado a estado post-diagnóstico  

---

### 6. Regresión

- Flujo EN_DIAGNOSTICO → Guardar diagnóstico intacto  
- CTA “Iniciar diagnóstico” (RECEPCIONADO → EN_DIAGNOSTICO) intacto  
- D.1 feedback / reveal sin sistema nuevo
