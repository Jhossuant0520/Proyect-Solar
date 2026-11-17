# SOLVIX Backend — BLOQUE D.3
## Preview de búsquedas (sin endpoints nuevos)

**Fecha:** 2026-09-29  
**Alcance:** confirmar que los endpoints existentes de cliente / producto / equipo cubren el preview FE (≤5) sin inventar “recientes” ni ampliar límites de búsqueda.

---

### 1. Decisión

No se crearon endpoints nuevos. El frontend solicita preview con:

- `q` vacío o ausente
- `limite=5` (o `PageRequest` equivalente)

La búsqueda textual sigue siendo responsabilidad exclusiva del FE cuando `length ≥ 2`.

---

### 2. Endpoints reutilizados

| Entidad | Operación | Preview | Orden / criterio | Etiqueta FE |
|---------|-----------|---------|------------------|-------------|
| Cliente | `GET /v1/clientes?limite=&q=` / `ClienteService.buscar` | `q` vacío + `limite=5` | `nombre` ASC | Disponibles |
| Producto | `GET` listado / `ProductoService.listar` | `q` vacío/null + `limite=5` | criterio existente del listado | Productos disponibles |
| Equipo | `EquipoService.buscar` | `q` vacío + `limite=5` + `clienteId` + activos | `fechaRegistro` DESC (API) | Últimos registros |

No se atribuye “recientes” a clientes/productos: no hay campo de uso reciente confiable en esos flujos.

---

### 3. Límites

- Preview: máximo 5 (aplicado por el FE; BE respeta el `limite` pedido).
- Búsqueda textual: límites actuales del FE (8/10) sin cambio de tope servidor salvo el cap ya existente (p. ej. equipos ≤50).

---

### 4. Tests añadidos / reforzados

- `CotizacionComercialServiceTest#buscarClientes`: `buscar("", 5)` / `null` ≤5.
- `ProductoBusquedaServiceTest`: `listar("", 5, …)` y `listar(null, 5, …)` =5.
- `EquipoServiceTest#previewSinQMaximoCinco`: 8 equipos → preview de 5.

---

### 5. Build

```bash
mvn -q -Dtest=ProductoBusquedaServiceTest,EquipoServiceTest,CotizacionComercialServiceTest test
mvn -q -DskipTests compile
```

---

### 6. Exclusiones

- Sin cambios de dominio (activo/inactivo, stock, relación cliente–equipo).
- Sin endpoint “recientes” genérico.
- Listado Servicios (OT) no tocado.
