# SOLVIX Frontend — BLOQUE D.1
## Sistema global de feedback contextual, selección y scroll

**Fecha:** 2026-09-28  
**Alcance:** patrón transversal reutilizable (feedback + scroll condicional + highlight) e integración demostrativa en Cotización Comercial, Diagnóstico (detalle OT) y Documentos.  
**Sin cambios** a listado/componente Servicios, preview de clientes, firma digital, backend, endpoints, validaciones de negocio ni contrato C.2/C.3 PDF.

---

### 1. Problema UX detectado

Tras acciones mutativas (agregar producto, guardar diagnóstico, generar documento, etc.) el usuario a menudo no sabe:

- si la acción se ejecutó;
- qué cambió;
- dónde apareció el resultado;
- hacia dónde debe mirar a continuación.

Ejemplo típico en Cotización Comercial: buscar producto → click → la card se crea más abajo → el ítem desaparece de la selección → sin feedback suficiente → scroll manual de búsqueda.

---

### 2. Objetivo

Establecer un patrón transversal:

```text
ACCIÓN
  → feedback inmediato
  → estado visible (selección real)
  → revelar resultado si está fuera de viewport
  → scroll contextual solo cuando aporta valor
  → highlight breve del elemento afectado
```

Funcional, sobrio y consistente. Sin animaciones decorativas, sin scroll en cada click, sin toasts duplicados.

---

### 3. Auditoría de componentes existentes

| Recurso | Hallazgo | Decisión D.1 |
|---|---|---|
| `showSolvixSnack` + `_solvix-snackbar.scss` | Toast visual oficial (tones info/success/warning/error) | **Reutilizar** vía `SolvixFeedbackService` |
| `MatSnackBar` directo en pantallas | Configuración repetida | Centralizar nuevos flujos en FeedbackService; no segundo sistema |
| `prefersReducedMotion()` en `count-up.ts` | Fuente única de reduced-motion | **Reutilizar** en ScrollService |
| Tokens `--motion-fast/normal/slow/highlight` + `solvix-highlight-pulse` | Motion existente | Highlight usa `--motion-highlight` + pulse existente |
| `solvix-button [loading][disabled]` | Loading de presentar/generar | **Conservar**; no sustituir |
| Scroll utilities / directivas | No había servicio de scroll contextual | **Crear** `SolvixScrollService` |
| IntersectionObserver util | No existía compartido | Bounding rect con ratio ≥ 0.55 (síncrono, sin polling) |
| Listado Servicios | Fuera de alcance | **No modificar** |

---

### 4. Arquitectura elegida

Tres capas + orquestador:

```text
SolvixFeedbackService     → snack genérico (success/info/warning/error)
SolvixScrollService       → visibilidad + scroll condicional + highlight
SolvixActionRevealService → feedback → (paint) → reveal(target)
.solvix-context-highlight → clase CSS (motion tokens)
```

Responsabilidades separadas. Los componentes no implementan scroll/highlight ad hoc.

API conceptual de orquestación:

```ts
actionReveal.success({
  message: 'Producto agregado',
  target: `[data-linea-index="${index}"]`
});
```

---

### 5. FeedbackService

**Archivo:** `src/app/shared/services/solvix-feedback.service.ts`

- `success` / `info` / `warning` / `error` / `show`
- Delega a `showSolvixSnack(MatSnackBar, …)`
- Ignora mensajes vacíos
- Sin reglas de negocio

Duraciones por defecto: success/info 3500 · warning 4500 · error 5000.

---

### 6. ScrollService

**Archivo:** `src/app/shared/services/solvix-scroll.service.ts`

| Método | Rol |
|---|---|
| `resolve(target)` | `HTMLElement` \| `ElementRef` \| selector CSS \| null |
| `isReasonablyVisible(el, minRatio=0.55)` | Área visible vs viewport (margen 24px) |
| `scrollToElement(target, options?)` | `scrollIntoView`; behavior `smooth` o `auto` |
| `highlight(target, durationMs?)` | Clase temporal `.solvix-context-highlight` |
| `reveal(target, options?)` | Scroll **solo si no visible** + highlight opcional |

No hace scroll al top por defecto. Target inexistente → `false`, sin throw.

---

### 7. Detección de viewport

Implementación síncrona con `getBoundingClientRect`:

- calcula intersección con viewport (margen 24px);
- ratio área visible / área total ≥ `0.55` → visible;
- sin polling;
- sin IntersectionObserver asíncrono (evita race tras paint inmediato).

Si el elemento ya es visible → `reveal` **no** llama `scrollIntoView`.

---

### 8. Highlight contextual

**Clase:** `.solvix-context-highlight` en `_solvix-motion.scss`

- Animación `solvix-highlight-pulse` con `--motion-highlight` (560ms / tokens fast140·normal200·slow280 del sistema);
- borde/fondo suave primary;
- se remueve por timeout (no queda permanente);
- con `prefers-reduced-motion: reduce` → tokens a 1ms + highlight casi instantáneo.

No es un toast: solo ayuda a localizar el resultado.

---

### 9. Estado de selección

En `producto-buscador`:

- `@Input() idsAgregados` desde el estado real del formulario (`productoIdsAgregados`);
- UI: badge `✓ Agregado` + clase `is-agregado`;
- click en ya agregado → emite `yaAgregado` (no vuelve a seleccionar);
- el form bloquea duplicados y llama `onProductoYaAgregado` → feedback info + reveal de la línea existente.

No es simulación visual: refleja IDs reales de líneas PRODUCTO.

---

### 10. Integración Cotización Comercial

**Form** (`cotizacion-comercial-form`):

| Acción | Comportamiento D.1 |
|---|---|
| Agregar producto | Feedback «Producto agregado» + reveal línea (`data-linea-index`) |
| Producto ya agregado | Badge ✓ Agregado + «Producto ya agregado» + reveal línea |
| Agregar mano de obra / otro | Feedback + reveal bloque |
| Eliminar línea | Feedback «Producto eliminado» / «Línea eliminada» **sin** scroll |
| Guardar | Feedback éxito + navegación a detalle (sin scroll arbitrario) |

**Detail** (`cotizacion-comercial-detail`):

| Acción | Comportamiento |
|---|---|
| Presentar | Loading `solvix-button` intacto; success + reveal `#panel-documentos-cotizacion` si hay PDF |
| Regenerar PDF | Feedback «Documento generado» + reveal panel documentos |
| Errores | `feedback.error` |

---

### 11. Integración Diagnóstico

En `servicio-detail.guardarDiagnosticoCompleto`:

1. Workflow / endpoints / validaciones **sin cambios**.
2. Feedback: «Diagnóstico registrado.» vía `onTransicionOk` → `SolvixFeedbackService`.
3. Abre sección cotizaciones.
4. `actionReveal.reveal(panelCotizaciones, { highlight: true })` — scroll solo si el panel está fuera de viewport.

---

### 12. Integración Documentos

En `servicio-documentos-panel.destacarDocumentoReciente`:

- sustituye scroll incondicional previo;
- `actionReveal.success({ message, target: [data-doc-id="…"] })`;
- loading / errores / regenerar con snack de error o «Documento regenerado.» se mantienen;
- contrato C.2 y comportamiento C.3 PDF **sin cambios de backend**.

---

### 13. Clasificación de acciones (A/B/C/D)

Leyenda:

- **A** Feedback solamente  
- **B** Feedback + highlight  
- **C** Feedback + scroll condicional + highlight  
- **D** Ya correcto / sin cambio en D.1  

#### Cotización Comercial (integrado)

| Acción | Clase |
|---|---|
| Agregar producto / MO / otro | **C** |
| Producto ya agregado | **C** (info) |
| Eliminar línea | **A** |
| Guardar cotización | **A** (+ navegación) |
| Presentar / regenerar PDF | **C** (panel documentos) |
| Ver/descargar PDF | **D**/A info si no hay doc |

#### Diagnóstico / OT detail (parcial)

| Acción | Clase |
|---|---|
| Guardar diagnóstico completo | **C** (reveal cotizaciones) |
| Guardar info técnica | **A** |
| Transiciones workflow (reparar, cerrar, …) | **A** (feedback existente vía FeedbackService) |
| Registrar entrega | **A** (+ abre documentos; panel hace C al llegar el acta) |

#### Documentos OT (integrado)

| Acción | Clase |
|---|---|
| Generación / auto-comprobante / acta | **C** |
| Regenerar | **A** (snack; lista se refresca) |
| Errores generación | **A** |

#### Otras pantallas (inspección; no migradas en D.1)

| Módulo / acción | Clase | Nota |
|---|---|---|
| Cliente crear/activar/desactivar | **D** | `showSolvixSnack` ya correcto |
| Producto registrar/actualizar/imagen | **D** | snack existente |
| Cotizaciones panel OT (aprobar/rechazar/eliminar/generar) | **D** | snack existente; candidato futuro C al panel docs |
| Repuestos planificar/anular | **D** | snack existente |
| Servicio form (cliente/equipo/orden) | **D** | snack existente |
| Equipos cliente | **D** | snack existente |
| Listado Servicios | — | **Fuera de alcance** (Regla 10) |

---

### 14. Responsive

El reveal usa viewport del documento (`innerHeight/Width`). Válido en:

| Rango | Notas |
|---|---|
| Mobile &lt; 768 | Cards/listas largas: scroll condicional más frecuente; highlight breve |
| Tablet 768–1023 | Igual |
| Laptop 1024–1279 | Panel documentos / líneas suelen estar más cerca |
| Desktop ≥ 1280 | Menos scroll; highlight sigue útil |

Dialogs: el target de D.1 está en la página, no dentro del overlay. Contenedores con scroll propio no se cubren aún con un scroll-parent resolver (limitación §19).

---

### 15. Reduced motion

`prefers-reduced-motion: reduce`:

- scroll `behavior: 'auto'`;
- highlight ~1ms + tokens motion globales a 1ms en `_solvix-motion.scss`;
- sin movimiento decorativo adicional.

---

### 16. Tests

Specs nuevos/actualizados:

- `solvix-feedback.service.spec.ts` — success/error/info/vacío (vía `MatSnackBar.open`)
- `solvix-scroll.service.spec.ts` — visible→no scroll, fuera→scroll, reduced motion→auto, highlight add/remove, null-safe
- `solvix-action-reveal.service.spec.ts` — orquestación feedback + reveal
- `producto-buscador.spec.ts` — ✓ Agregado / `yaAgregado`
- `cotizacion-comercial-form.spec.ts` / `detail.spec.ts`
- `servicio-documentos-panel.spec.ts` / `servicio-detail.spec.ts`

**Resultado:** `74 SUCCESS` (suite D.1 + regresiones incluidas en el include).  
Tests existentes no eliminados.

Nota técnica: no se hace `spyOn` sobre exports ESM no writable; se mockea `matchMedia` / `MatSnackBar.open` (mismo patrón que `count-up.spec.ts`).

---

### 17. Build

```text
npx ng build
→ Application bundle generation complete
→ exit 0
```

(Advertencia de presupuesto de bundle preexistente; no introducida por D.1.)

---

### 18. Reglas UX oficiales

1. Toda acción relevante debe comunicar su resultado.  
2. El feedback debe ser breve y accionable.  
3. Nunca usar scroll automático si el resultado ya está visible.  
4. Cuando una acción crea/modifica contenido fuera de viewport, revelar el resultado.  
5. Después del scroll, el elemento afectado puede recibir un highlight contextual breve.  
6. El estado de selección debe reflejar el estado real de la aplicación.  
7. No duplicar feedback existente.  
8. No convertir feedback en animación decorativa.  
9. Respetar reduced motion.  
10. Servicios (listado) **no** forma parte de este bloque.

---

### 19. Limitaciones

- No se resolvió scroll al ancestro scrollable (solo `scrollIntoView` del documento).  
- Contenedores internos con overflow no tienen detección de “visible en el scroll parent”.  
- Regenerar documento OT: feedback A sin highlight de la nueva versión (lista se refresca).  
- **Listado Servicios** permanece fuera de alcance (D.1 / D.4).

---

### 20. Adopción progresiva D.4

Bloque D.4 migró los snacks residuales (`showSolvixSnack` / `snackBar.open`) a `SolvixFeedbackService` / `SolvixActionRevealService` en:

| Módulo | Tipo predominante | Notas |
|--------|-------------------|--------|
| Clientes (form/list/detail) | A | Crear/editar/activar-desactivar |
| Equipos (panel cliente) | A | Registrar/actualizar/activar-desactivar |
| Productos / Inventario | A | Crear/editar/costo/ajuste stock |
| Ventas (+ compras gemelas) | A / C | Agregar línea en venta → reveal; completar/cancelar → A |
| OT detalle / documentos / cotizaciones / repuestos | A / C | Ya parcial en D.1; snacks residuales migrados |
| Cotización comercial | D | Ya en D.1 |

**Excluido:** `servicio-list` (listado Servicios).

Detalle operativo: `docs/frontend/BLOQUE_D4_ADOPCION_GLOBAL_FEEDBACK.md`.

---

### 21. Próximos puntos de adopción

1. Reveal en paneles OT cuando el resultado quede fuera de viewport tras recargas async.  
2. Scroll-parent aware si aparecen contenedores overflow reales.  
3. **No** Servicios list hasta un bloque explícito.

---

### Archivos D.1 (referencia)

**Nuevos**

- `src/app/shared/services/solvix-feedback.service.ts` (+ spec)
- `src/app/shared/services/solvix-scroll.service.ts` (+ spec)
- `src/app/shared/services/solvix-action-reveal.service.ts` (+ spec)
- `docs/frontend/BLOQUE_D1_FEEDBACK_SCROLL_GLOBAL.md`

**Modificados (integración D.1)**

- `src/styles/_solvix-motion.scss` — `.solvix-context-highlight`
- `producto-buscador` (ts/html/scss/spec) — `idsAgregados`, ✓ Agregado, `yaAgregado`
- `cotizacion-comercial-form` (+ html/spec)
- `cotizacion-comercial-detail` (+ spec)
- `servicio-detail` (+ spec) — diagnóstico
- `servicio-documentos-panel` (+ spec) — highlight/reveal condicional

**Adopción D.4:** ver documento D.4 (migración global de snacks).

---

### Antes / después (ejemplo)

**Antes — agregar producto**

```text
click → card abajo → ítem desaparece de resultados → silencio → usuario busca con scroll
```

**Después**

```text
click → «Producto agregado» → si la card está fuera de viewport, scroll + highlight breve
     → en resultados: «✓ Agregado» (estado real) → click posterior: «Producto ya agregado» + reveal línea
```
