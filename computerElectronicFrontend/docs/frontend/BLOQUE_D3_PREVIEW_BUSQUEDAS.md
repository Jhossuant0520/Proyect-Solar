# SOLVIX Frontend — BLOQUE D.3
## Preview inicial y UX unificada de búsquedas (autocomplete)

**Fecha:** 2026-09-29  
**Alcance:** patrón reutilizable preview ≤5 + búsqueda textual desde 2 caracteres en Clientes, Productos y Equipos.  
**Sin cambios** al listado/componente Servicios ni a reglas de dominio (duplicados, equipo activo, relación cliente–OT).

---

### 1. Problema UX

Al abrir un autocomplete el usuario veía un input vacío y un hint genérico (“escribe 2 caracteres”). No había contexto de qué registros existen ni si la app responde. La regla de mínimo 2 caracteres es correcta; faltaba un estado inicial con datos reales.

---

### 2. Comportamiento anterior

| Acción | Resultado |
|--------|-----------|
| Focus / campo vacío | Solo hint; sin lista |
| 1 carácter | Sin petición (correcto) |
| ≥2 caracteres | Debounce + `buscar(q, limite)` |
| Vacío / error | Mensajes existentes |

---

### 3. Nuevo patrón

```text
FOCUS / vacío / < 2 caracteres
  → PREVIEW (hasta 5 registros reales, sin q textual)
  → etiqueta según criterio real de la API

≥ 2 caracteres
  → SEARCH (debounce 250 ms, switchMap, cancelación)
  → resultados / vacío / error
```

Constantes compartidas: `src/app/shared/utils/solvix-busqueda.ts`

| Constante | Valor |
|-----------|-------|
| `SOLVIX_MIN_CARACTERES_BUSQUEDA` | 2 |
| `SOLVIX_DEBOUNCE_BUSQUEDA_MS` | 250 |
| `SOLVIX_PREVIEW_LIMITE` | 5 |

---

### 4. Entidades soportadas

| Entidad | Componente | Preview | Etiqueta | Adoptado |
|---------|------------|---------|----------|----------|
| Clientes | `cliente-buscador` | `buscar('', 5)` | Disponibles | Sí |
| Productos | `producto-buscador` | `buscar('', 5)` | Productos disponibles | Sí |
| Equipos | `equipo-buscador` | `buscar('', 5, clienteId, true)` | Últimos registros | Sí |
| Órdenes de servicio | — | — | — | No (próximo) |
| Cotizaciones | — | — | — | No (próximo) |
| Listado Servicios | — | — | — | **Excluido** |

---

### 5. Preview

- Máximo 5 elementos reales (nunca placeholders).
- No usa búsqueda textual con `q` de 1 carácter.
- Reutiliza el mismo endpoint de búsqueda/listado acotado con `q` vacío/`null` y `limite=5`.
- Cache en memoria por interacción (equipos: se invalida al cambiar `clienteId`).
- No se muestra “sin resultados” en preview vacío: se queda en `idle`.

---

### 6. Búsqueda desde 2 caracteres

- `length < 2` → no dispara búsqueda textual; mantiene/restaura preview.
- `length ≥ 2` → `debounceTime(250)` + `distinctUntilChanged` + `switchMap`.
- Límites de búsqueda actuales intactos (cliente 8, producto/equipo 10 por defecto).

---

### 7. Debounce y cancelación

- Debounce 250 ms (rango 250–300).
- `switchMap` cancela la petición anterior al cambiar el texto.
- Preview usa suscripción propia y no satura con polling.

---

### 8. Estados

| Estado | UI |
|--------|-----|
| `idle` | Hint “Escribe al menos 2 caracteres…” |
| `preview` | Etiqueta + lista ≤5 + hint de búsqueda |
| `buscando` | “Buscando…” discreto (sin spinner global) |
| `resultados` | Lista de búsqueda |
| `vacio` | No encontramos resultados para “…” |
| `error` | No fue posible cargar los resultados. |
| `sin-cliente` (solo equipos) | Primero elige un cliente |

Un solo mensaje/estado visible a la vez.

---

### 9. Accesibilidad

- `role="combobox"` + `listbox` / `option`.
- Flechas, Enter, Escape en preview y resultados.
- `aria-expanded`, `aria-selected`, `aria-labelledby` en bloque preview.
- Contraste heredado de estilos SOLVIX; sin overlay que capture foco.

---

### 10. Responsive

Panel de resultados contenido en el buscador (sin overflow horizontal nuevo). Touch: botones de opción; teclado en desktop sin cambios de contrato.

Breakpoints revisados conceptualmente: &lt;768 / 768–1023 / 1024–1279 / ≥1280 — el panel sigue el ancho del contenedor padre.

---

### 11. Performance

- Preview ≤5; búsqueda con límite existente.
- Sin listados masivos (`listar()` completo no se usa en estos selectores).
- Cache de preview evita repetir la misma petición al re-enfocar en la misma interacción.
- Sin polling.

---

### 12. Integración D.1

- Productos: `idsAgregados` → ✓ Agregado (estado real, no solo visual).
- Selección de producto sigue disparando feedback/reveal del padre cuando aplica.
- Cliente/equipo: sin scroll forzado al seleccionar.

No se duplican `FeedbackService`, `ScrollService` ni `ActionRevealService`.

---

### 13. Servicios excluido

**No se modificó** el listado/componente de Servicios (tabla/filtros de OT).

`equipo-buscador` vive bajo la carpeta `servicios/` porque se usa en el formulario de alta/edición de OT; es un autocomplete compartido, no el listado. Su UX se actualizó al patrón D.3 sin tocar el listado.

---

### 14. Tests

Frontend (specs de buscadores):

- focus → preview ≤5 / etiqueta
- 1 carácter → no búsqueda textual (`q` vacío solo para preview)
- ≥2 → búsqueda con debounce
- selección teclado
- producto ya agregado (existente)
- equipo sin cliente bloqueado

Backend (cobertura de límites, sin endpoints nuevos):

- `ClienteService.buscar("", 5)` ≤5
- `ProductoService.listar("", 5, …)` =5
- `EquipoService.buscar("", 5, clienteId, true)` =5

---

### 15. Build

Ejecutar:

```bash
# Frontend
npx ng test --include=**/cliente-buscador.spec.ts --include=**/producto-buscador.spec.ts --include=**/equipo-buscador.spec.ts --browsers=ChromeHeadless --watch=false
npx ng build

# Backend (desde projectSolvixBackend)
mvn -q -Dtest=ProductoBusquedaServiceTest,EquipoServiceTest,CotizacionComercialServiceTest#buscarClientes test
mvn -q -DskipTests compile
```

---

### 16. Antes / después

**Antes (cliente):**

```text
┌─────────────────────────────┐
│ Buscar cliente...           │
│ Escribe al menos 2 caracteres│
└─────────────────────────────┘
```

**Después:**

```text
┌─────────────────────────────┐
│ Buscar cliente...           │
├─────────────────────────────┤
│ Disponibles                 │
│ Juan Pérez …                │
│ … (hasta 5)                 │
│ Escribe 2 caracteres para   │
│ buscar                      │
└─────────────────────────────┘
```

---

### 17. Próximas adopciones

1. Autocompletes de órdenes de servicio / cotizaciones si aparecen selectores similares.
2. Unificar más selectores ad-hoc bajo las mismas constantes `solvix-busqueda`.
3. Evaluar endpoint explícito “recientes” solo si surge un campo de uso real (hoy equipos ya ordenan por `fechaRegistro`).

---

### 18. Archivos tocados (frontend)

- `src/app/shared/utils/solvix-busqueda.ts` (nuevo)
- `cliente-buscador` (.ts/.html/.scss/.spec.ts)
- `producto-buscador` (.ts/.html/.scss/.spec.ts)
- `equipo-buscador` (.ts/.html/.scss/.spec.ts)
- `docs/frontend/BLOQUE_D3_PREVIEW_BUSQUEDAS.md`
