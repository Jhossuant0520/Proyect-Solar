# SOLVIX Frontend — BLOQUE D.4
## Adopción global del sistema D.1 (feedback, reveal, highlight)

**Fecha:** 2026-09-29  
**Alcance:** migrar acciones mutativas restantes a `SolvixFeedbackService` / `SolvixActionRevealService` sin rediseño visual ni cambios de negocio.  
**Excluido:** listado/componente Servicios (`servicio-list`), workflow OT, endpoints, PDFs, firma, búsqueda D.3.

---

### 1. Problema

Tras D.1, varias pantallas seguían usando:

- `showSolvixSnack(this.snackBar, …)` directo
- `MatSnackBar.open(…)` con estilos Material por defecto

Resultado: feedback inconsistente entre módulos (posición, tono, copy).

---

### 2. Regla aplicada

| Código | Significado |
|--------|-------------|
| **A** | Feedback solamente |
| **B** | Feedback + highlight |
| **C** | Feedback + scroll condicional + highlight |
| **D** | Ya correcto (D.1 u otro bloque) |

Scroll solo si el resultado está fuera de viewport y aporta continuidad. Sin animaciones decorativas.

---

### 3. Módulos revisados

#### 3.1 Clientes

| Acción | Tipo | Mensaje |
|--------|------|---------|
| Crear | A | Cliente creado |
| Editar | A | Cliente actualizado |
| Activar / desactivar (list/detail) | A | Cliente actualizado |
| Errores negocio | A | Mensaje mapeado existente |

#### 3.2 Equipos (panel en detalle cliente)

| Acción | Tipo | Mensaje |
|--------|------|---------|
| Registrar | A | Equipo registrado |
| Editar | A | Equipo actualizado |
| Activar / desactivar | A | Equipo actualizado |

Sin scroll: el panel permanece en contexto del detalle.

#### 3.3 Productos / Inventario

| Acción | Tipo | Mensaje |
|--------|------|---------|
| Crear producto | A | Producto creado |
| Actualizar producto | A | Producto actualizado |
| Imagen / validaciones | A | Copy existente |
| Ajuste de costo (detalle) | A | Costo actualizado… |
| Ajuste de unidades (inventario) | A | Inventario actualizado |
| Error lookup código | A | Mensaje de negocio |

#### 3.4 Ventas (+ compras, consistencia comercial)

| Acción | Tipo | Mensaje |
|--------|------|---------|
| Agregar línea (venta) | **C** | Producto agregado + reveal `data-linea-index` |
| Producto ya en venta | **C**/info | Reveal línea existente |
| Quitar línea | A | Producto eliminado |
| Registrar venta | A | Venta {n} registrada |
| Completar / cancelar | A | Copy breve |
| Devoluciones / reembolso | A | Copy migrado |
| Compra (gemela) | A | Mismos patrones (sin reveal HTML aún) |

#### 3.5 Órdenes de servicio (detalle y paneles)

| Área | Tipo | Notas |
|------|------|-------|
| Diagnóstico / info técnica | D → A | Ya D.1 |
| Documentos (generar) | D → C | Ya D.1 + snacks residuales → FeedbackService |
| Cotizaciones OT | A | Migrado `showSolvixSnack` → feedback |
| Repuestos | A | Migrado |
| Entrega | A | Migrado |
| **Listado Servicios** | — | **Excluido** |

#### 3.6 Cotizaciones

| Área | Tipo |
|------|------|
| Cotización comercial form/detail | **D** (D.1) |
| Cotizaciones de servicio (panel OT) | A (migrado) |
| Dialog crear producto rápido | A |

---

### 4. Servicios excluido

No se modificó:

- `servicio-list.ts` / html / scss / spec  
- filtros, cards, diseño ni feedback del listado  

Los paneles del **detalle** OT sí adoptaron FeedbackService porque no son el listado.

---

### 5. Infraestructura

Sin servicios nuevos. Reutilizado:

- `SolvixFeedbackService`
- `SolvixScrollService`
- `SolvixActionRevealService`
- `.solvix-context-highlight`
- `prefers-reduced-motion`

Eliminada la dependencia directa de `showSolvixSnack` / `snackBar.open` en los módulos adoptados.

---

### 6. Loading / errores

- `solvix-button [loading]` sin cambios.
- Errores de `BusinessException` / `mapHttpError` / `mensajeError*` preservados.
- No se sustituyeron mensajes específicos por genéricos.

---

### 7. Responsive

Sin cambios de layout. Reveal usa el mismo `scrollIntoView` de D.1 (documento). No se introdujo overflow horizontal.

---

### 8. Tests

- `venta-form.spec.ts` — feedback / actionReveal D.4  
- `cliente-equipos-panel.spec.ts` — provider FeedbackService  
- Specs OT que override `MatSnackBar` siguen válidos (FeedbackService usa MatSnackBar internamente)

---

### 9. Build

```bash
npx ng test --include=**/venta-form.spec.ts --include=**/cliente-equipos-panel.spec.ts --include=**/solvix-*.spec.ts --browsers=ChromeHeadless --watch=false
npx ng build
```

---

### 10. Limitaciones

1. Reveal tras recargas HTTP async (equipos/inventario) no se fuerza: evita scroll fantasma.  
2. Compra-form: feedback al agregar línea sin `data-linea-index` (adopción A; venta sí es C).  
3. Listado Servicios fuera de alcance.  
4. Sin rediseño de copy largo en OT cotizaciones (se preservó el texto de negocio).

---

### 11. Archivos principales

**Clientes / equipos:** `cliente-form`, `cliente-list`, `cliente-detail`, `cliente-equipos-panel`  
**Productos:** `producto.ts`, `producto-detail`  
**Inventario:** `inventario.ts`  
**Ventas:** `venta-form` (+ html), `venta-detail`, devoluciones  
**Compras:** `compra-form`, `compra-detail`, devoluciones  
**OT:** `servicio-detail`, `servicio-documentos-panel`, `servicio-cotizaciones-panel`, `servicio-repuestos-panel`, `cotizacion-form-dialog`  
**Docs:** este archivo + sección D.4 en `BLOQUE_D1_FEEDBACK_SCROLL_GLOBAL.md`
