# SOLVIX — FASE 3.15 Auditoría del dominio de Servicios Técnicos

**Tipo:** AUDITORÍA Y DISEÑO  
**Fecha:** 2026-09-16  
**Alcance:** Backend + Frontend  
**Restricción:** No se modificó código, entidades, tablas, endpoints, componentes, Ventas, Clientes ni Inventario.

Leyenda de estados en este documento:

| Etiqueta | Significado |
|----------|-------------|
| **IMPLEMENTADO** | Existe y es usable para el dominio comercial actual |
| **EXISTE PERO INCOMPLETO** | Hay un rastro o pieza adyacente, no un módulo de servicios técnicos |
| **NO EXISTE** | Ausente en código y esquema |
| **PROPUESTA** | Diseño recomendado; no implementado |

---

## 1. Estado actual del dominio

El backend y el frontend de SOLVIX cubren el **dominio comercial**:

```
Producto → Inventario → Compras → Ventas → Clientes → Devoluciones → Analytics
```

El **dominio de servicios técnicos** (taller / reparación / OT):

```
Cliente → Equipo → Orden de servicio → Diagnóstico → Trabajo → Repuestos → Cobro
```

está **casi completamente ausente**.

| Hallazgo | Estado |
|----------|--------|
| Módulo Orden de Servicio | **NO EXISTE** |
| Equipo del cliente | **NO EXISTE** |
| Técnico como rol/asignación | **NO EXISTE** |
| Diagnóstico / trabajo / mano de obra | **NO EXISTE** |
| UI / rutas / Stitch de taller | **NO EXISTE** |
| Categoría de producto `SERVICIO` | **EXISTE PERO INCOMPLETO** (seed; no desactiva stock) |
| Motivo devolución `GARANTIA` | **EXISTE PERO INCOMPLETO** (solo devoluciones, no garantías de taller) |
| Cliente comercial reutilizable | **IMPLEMENTADO** |
| Inventario / Venta como base de cobro y repuestos | **IMPLEMENTADO** (comercial; requiere diseño de vínculo) |

**Veredicto:** construir Servicios Técnicos es **greenfield**, reutilizando Cliente, Producto (repuestos), InventarioService y, con cuidado, Venta para cobro.

---

## 2. Entidades existentes

### Relacionadas o adyacentes (IMPLEMENTADO / INCOMPLETO)

| Entidad | Rol respecto a servicios | Estado |
|---------|--------------------------|--------|
| `Cliente` | Parte / dueño del equipo | **IMPLEMENTADO** |
| `Producto` | Catálogo físico; podría ser repuesto | **IMPLEMENTADO** |
| `CategoriaProducto` | Incluye seed `SERVICIO` | **EXISTE PERO INCOMPLETO** |
| `Venta` / `DetalleVenta` | Cobro comercial por `productoId` | **IMPLEMENTADO** (solo líneas de producto) |
| `MovimientoInventario` | Stock comercial | **IMPLEMENTADO** |
| `modelUsuario` / `modelRolUsuario` | Auth `ADMIN` / `USUARIO` | **IMPLEMENTADO** |
| Motivo devolución `GARANTIA` | Devoluciones venta/compra | **EXISTE PERO INCOMPLETO** |

### Dominio de taller (NO EXISTE)

No hay entidades para:

- `OrdenServicio` / `OrdenTrabajo`
- `EquipoCliente` / `Dispositivo`
- `Diagnostico`
- `TrabajoRealizado` / `ManoObra`
- `RepuestoOrden` (línea de OT)
- `Tecnico` (perfil o asignación)
- `GarantiaServicio` / cobertura temporal
- Evidencias / adjuntos de OT

`modelPanelSolares` y módulos HSP/demanda son **ingeniería solar**, no equipos de taller.

---

## 3. DTOs existentes

| DTO | Estado respecto a servicios |
|-----|-----------------------------|
| `ClienteRequestDTO` / `ClienteResponseDTO` | **IMPLEMENTADO** — reutilizables como cliente de OT |
| `Producto*` / `Catalogo*` | **IMPLEMENTADO** — catálogo/repuestos; no OT |
| `VentaRequestDTO` / `DetalleVentaRequestDTO` | **IMPLEMENTADO** — `productoId` + cantidad; sin mano de obra ni tipo de línea |
| DTOs de orden de servicio / equipo / diagnóstico | **NO EXISTE** |

---

## 4. Endpoints existentes

| Área | Endpoints | Estado |
|------|-----------|--------|
| Clientes | `/api/v1/clientes` (ADMIN) | **IMPLEMENTADO** |
| Productos / catálogo / imágenes | `/api/v1/productos`, `/api/v1/catalogo`, imágenes | **IMPLEMENTADO** |
| Inventario | `/api/v1/inventario` | **IMPLEMENTADO** |
| Ventas / devoluciones | `/api/v1/ventas`, `/api/v1/devoluciones-venta` | **IMPLEMENTADO** |
| Órdenes de servicio / equipos / técnicos | — | **NO EXISTE** |

No hay `TipoSecuencia` para OT (solo VENTA, COMPRA, DEVOLUCION_*).

---

## 5. Relación con Clientes

**IMPLEMENTADO** el maestro comercial. Campos actuales:

- `tipoCliente`, `tipoDocumento`, `numeroDocumento`
- `nombre`, `email`, `telefono`, `notas`
- `activo`, `fechaRegistro`

**Conclusión:** Cliente **ya puede usarse** como titular de una orden de servicio **sin modificarlo en la primera versión**.

**PROPUESTA (futuro, no ahora):** dirección/sitio, contacto técnico, SLA — solo si el negocio lo exige.

**CONSUMIDOR_FINAL:** cliente genérico de mostrador en ventas. Una OT de taller debería usar un Cliente real (`PERSONA` / `EMPRESA`), no el consumidor genérico, salvo casos excepcionales de mostrador sin datos.

---

## 6. Relación con Productos

### Definición clara (PROPUESTA + hechos)

| | **Producto comercial** | **Servicio técnico** |
|--|------------------------|----------------------|
| Qué es | Ítem vendible / stockeable | Caso de taller sobre un equipo |
| Stock | Sí (hoy siempre) | No es un SKU con stock |
| Costo | `costoActual` + historial | Mano de obra + repuestos |
| Flujo | Compra → stock → Venta | Recepción → diagnóstico → trabajo → entrega → cobro |
| Entidad | `Producto` | **Nueva** `OrdenServicio` (+ equipo) |

**EXISTE PERO INCOMPLETO:** categoría seed `SERVICIO`. Hoy un producto en esa categoría **sigue descontando stock** al completar una venta. **No** convierte Producto en Orden de Servicio.

**PROPUESTA:**

- **Repuestos** = productos comerciales normales (con stock).
- **Mano de obra / cargo de reparación** = línea de OT (o producto no stockeable con flag futuro), **no** una OrdenServicio disfrazada de Producto.
- **No** mezclar: una OT no “es” un Producto.

---

## 7. Relación con Inventario

**IMPLEMENTADO:** `InventarioService` es dueño del stock.

Tipos actuales: `COMPRA`, `VENTA`, `DEVOLUCION_*`, `AJUSTE_*`, `MERMA`, `CARGA_INICIAL`.  
Referencias: `VENTA`, `COMPRA`, `DEVOLUCION_*`, `AJUSTE_MANUAL`, `CARGA_INICIAL`.

**NO EXISTE:** `ORDEN_SERVICIO` / consumo de repuesto por OT.

**PROPUESTA (sin implementar):**

```
OrdenServicio (repuesto confirmado)
  → InventarioService.registrarMovimiento(
        tipo = SALIDA dedicada o AJUSTE_SALIDA tipificado,
        referencia = ORDEN_SERVICIO,
        referenciaId = id OT
    )
```

- Conservar `costoUnitario` / historial como en ventas.
- **No** duplicar lógica de stock fuera de `InventarioService`.
- Evitar usar `VENTA` como salida de repuesto si aún no hay cobro, o definir una sola regla clara (salida al usar vs salida al facturar).

---

## 8. Relación con Ventas

**IMPLEMENTADO:** `Venta` + `DetalleVenta` solo con `producto` obligatorio.

Puede representar hoy:

- producto físico — sí  
- “servicio” como SKU de categoría SERVICIO — débil (sigue stock)  
- mano de obra descriptiva sin producto — **no**  
- producto + instalación en la misma venta — solo si ambos son productos  

**PROPUESTA:**

1. **Corto plazo:** al cerrar OT, generar `Venta` con líneas = repuestos (`Producto`) + (opcional) SKU de mano de obra sin stock o con flag futuro.  
2. **Mediano plazo:** ampliar detalle con `tipoLinea` (PRODUCTO / SERVICIO_MANO_OBRA) **o** documento de cobro de OT separado vinculado a `ventaId`.  
3. Mantener OT como fuente de verdad del taller; Venta como documento de cobro/inventario.

**NO modificar Venta en esta fase.**

---

## 9. Equipos

**NO EXISTE** modelo de equipo entregado por el cliente.

**PROPUESTA — información candidata (no modelo definitivo):**

| Campo | Uso |
|-------|-----|
| Tipo (PC, portátil, impresora, monitor, servidor, celular, otro) | Clasificación |
| Marca / modelo | Identificación |
| Serial / identificador interno | Trazabilidad |
| Accesorios entregados | Checklist recepción |
| Estado físico / observaciones | Evidencia |
| Problema reportado | Entrada a diagnóstico |
| Credenciales de acceso | **Evitar** guardar contraseñas en claro; si hace falta, cifrado y política explícita o nota “el cliente la aporta al técnico” |

---

## 10. Técnicos

Roles actuales (**IMPLEMENTADO**): `ADMIN`, `USUARIO`.  
Rol `TECNICO`: **NO EXISTE**.

**PROPUESTA — dos caminos (elegir en implementación):**

| Opción | Pros | Contras |
|--------|------|---------|
| A) Rol auth `TECNICO` | Guards y menú claros | Mezcla auth con puesto laboral |
| B) Campo `tecnicoId` → `Usuario` (ADMIN o USUARIO) en la OT | Sin nuevo rol al inicio | Menos segregación de permisos |

**No asumir ADMIN = TÉCNICO.** Un admin puede asignar; el técnico ejecuta.

---

## 11. Flujo actual

**NO EXISTE** flujo de taller en el sistema.

Flujos cercanos existentes:

- Venta mostrador / consumidor final  
- Devolución por motivo `GARANTIA`  
- Homepage “Servicios” = marketing de análisis solar (no reparación)

---

## 12. Flujo recomendado

**PROPUESTA:**

```
RECEPCIÓN
  → DIAGNÓSTICO
  → COTIZACIÓN / ESPERA_APROBACIÓN
  → EN_REPARACIÓN
  → LISTO_PARA_ENTREGA
  → ENTREGADO
  → CERRADO (cobrado / archivado)
```

Ramas posibles:

- `RECHAZADO` / `CANCELADO` (cliente no aprueba o abandona)  
- `EN_ESPERA_REPUESTO`

---

## 13. Estados propuestos

No hay enum de estados de OT hoy. **PROPUESTA** de candidatos:

| Estado | Por qué |
|--------|---------|
| `RECEPCIONADO` | Equipo ingresó; OT abierta |
| `EN_DIAGNOSTICO` | Técnico evaluando |
| `COTIZADO` | Precio/mano de obra/repuestos informados |
| `APROBADO` | Cliente aceptó |
| `EN_REPARACION` | Trabajo en curso |
| `ESPERA_REPUESTO` | Bloqueo por partes |
| `LISTO` | Terminado, pendiente entrega |
| `ENTREGADO` | Cliente retira equipo |
| `CERRADO` | Cobro conciliado / OT archivada |
| `CANCELADO` | Cierre sin reparación |

Ajustar nombres al lenguaje del negocio en la fase de implementación.

---

## 14. Información faltante

| Pieza | Estado |
|-------|--------|
| Numeración OT | **NO EXISTE** |
| Equipo + recepción | **NO EXISTE** |
| Diagnóstico / trabajo | **NO EXISTE** |
| Líneas cobrables OT | **NO EXISTE** |
| Vínculo OT → Inventario | **NO EXISTE** |
| Vínculo OT → Venta | **NO EXISTE** |
| Técnico asignado | **NO EXISTE** |
| Evidencias (fotos) | **NO EXISTE** (solo avatar/producto) |
| Garantía post-entrega | **NO EXISTE** |
| Analytics de taller | **NO EXISTE** |
| UI / nav / Stitch taller | **NO EXISTE** |
| Flag producto no-stock / mano de obra | **NO EXISTE** |

---

## 15. Riesgos

1. Tratar OT como Producto con categoría `SERVICIO` → stock incorrecto y sin flujo de taller.  
2. Usar `CONSUMIDOR_FINAL` para todas las OT → pierde historial por cliente.  
3. Descontar repuestos con `VENTA` sin documento de cobro claro → doble facturación o stock desalineado.  
4. Guardar contraseñas de equipos en texto plano.  
5. Igualar ADMIN = técnico → sin trazabilidad de quién reparó.  
6. Ampliar Venta sin diseño → romper reglas de inventario/costeo ya estabilizadas.  
7. Confundir homepage “Servicios” (solar) con módulo de taller.

---

## 16. Dependencias

| Dependencia | Uso en servicios técnicos |
|-------------|---------------------------|
| Cliente | Titular de la OT — **lista** |
| Producto + InventarioService | Repuestos — **lista** (falta tipo de movimiento/referencia) |
| Venta | Cobro — **lista** con límites de línea |
| Auth / roles | Acceso admin; técnico opcional |
| ProductoImagen / FotoPerfil | Patrón de archivos; **nuevo** store para evidencias |
| Secuencias (`TipoSecuencia`) | Extender para número de OT |
| Analytics | Greenfield KPIs de taller |

**No depende** de: carrito web, portal cliente (FASE 3.11), proveedores (coming-soon UI).

---

## 17. Diseño conceptual recomendado

```
CLIENTE (existente)
   ↓
EQUIPO_CLIENTE (nuevo)
   ↓
ORDEN_SERVICIO (nuevo)
   ├── estados + fechas + técnico (Usuario)
   ├── problema reportado / diagnóstico / trabajo
   ├── LINEA_REPUESTO → Producto + cantidad
   │         ↓
   │    InventarioService (salida tipificada)
   ├── LINEA_MANO_OBRA (importe / descripción)
   ↓
COBRO → Venta (existente o ampliada)  [opcional ventaId en OT]
```

Principio: **InventarioService dueño del stock; OrdenServicio dueña del taller; Venta dueña del cobro comercial.**

---

## 18. Propuesta de FASE 3.15

Esta fase (**3.15**) queda como **auditoría y diseño** (este documento).

**Alcance cumplido:**

- Inventario de lo existente vs faltante  
- Separación Producto comercial vs Servicio técnico  
- Flujo y estados candidatos  
- Riesgos y dependencias  
- Diseño conceptual sin código  

**Fuera de alcance (correcto):** entidades, tablas, endpoints, UI, cambios a Ventas/Clientes/Inventario.

---

## 19. Fases posteriores sugeridas

| Fase sugerida | Contenido |
|---------------|-----------|
| **3.15.1 Modelo** | Entidades `EquipoCliente`, `OrdenServicio`, estados, secuencias; FK a Cliente; sin cobro aún |
| **3.15.2 API + Admin UI** | CRUD recepción/diagnóstico/estados; listado OT; sin inventario de repuestos |
| **3.15.3 Repuestos** | Líneas de producto + movimiento vía InventarioService |
| **3.15.4 Cobro** | Generar/vincular Venta; política mano de obra (SKU o tipo de línea) |
| **3.15.5 Técnico + evidencias** | Asignación; fotos de equipo; rol o permiso TECNICO |
| **3.15.6 Garantía + analytics** | Ventana post-entrega; KPIs pendientes/completados/tiempo/ingresos |

---

## Frontend actual (detalle)

| Elemento | Estado |
|----------|--------|
| Rutas `/servicios`, OT, reparación | **NO EXISTE** |
| `admin-nav` ítem Servicios | **NO EXISTE** |
| Coming-soon (proveedores, reportes) | **IMPLEMENTADO** — no incluye taller |
| Stitch OT / reparación | **NO EXISTE** |
| Homepage `#services` | **IMPLEMENTADO** — análisis solar (marketing) |
| Motivo `GARANTIA` en UI devoluciones | **IMPLEMENTADO** — no es módulo de garantía de taller |

---

## Stitch

**NO EXISTE** referencia visual Stitch para servicios técnicos / orden de trabajo / diagnóstico.

Existen Stitch comerciales (dashboard, producto, venta, compra, inventario, cliente). **No confundir** “Orden de Compra” en Stitch de compras con Orden de Servicio de taller.

---

## Analytics de servicios

**NO EXISTE.** Métricas actuales = ventas, productos, categorías, inventario, compras, dashboard comercial.

**PROPUESTA futura (no inventar datos hoy):**

- OT pendientes / completadas  
- Tiempo promedio recepción → entrega  
- Ingresos por servicios  
- OT por técnico  
- Equipos reparados  
- Clientes con OT  
- Margen (mano de obra + repuestos − costo)

---

## Garantía

| Concepto | Estado |
|----------|--------|
| Motivo devolución `GARANTIA` | **EXISTE PERO INCOMPLETO** |
| Fecha entrega / vencimiento de garantía de servicio | **NO EXISTE** |
| OT de garantía vinculada a venta | **NO EXISTE** |

---

## Documentos / evidencias

| Capacidad | Estado |
|-----------|--------|
| Fotos de producto / avatar | **IMPLEMENTADO** (otros dominios) |
| Fotos de equipo en recepción | **NO EXISTE** |
| Firmas / PDFs de OT | **NO EXISTE** |

**PROPUESTA:** reutilizar patrón multipart + filesystem (como imágenes de producto), directorio propio `uploads/ordenes-servicio/`.

---

## Resumen ejecutivo

```
IMPLEMENTADO:     Cliente, Producto, Inventario, Venta (cobro producto)
INCOMPLETO:       Categoría SERVICIO, motivo GARANTIA
NO EXISTE:        Equipo, OT, Diagnóstico, Técnico, Mano de obra OT,
                  Repuesto↔Inventario tipificado, UI/Stitch/Analytics taller
PROPUESTA:        Flujo RECEPCIÓN→…→CERRADO + diseño conceptual arriba
```

**Cadena objetivo (todavía por construir):**

```
CLIENTE → EQUIPO → ORDEN DE SERVICIO → DIAGNÓSTICO → TRABAJO
       → REPUESTOS → INVENTARIO → COBRO / VENTA
```
