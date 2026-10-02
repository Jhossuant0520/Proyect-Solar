# SOLVIX — FASE 3.15.10-A
## Auditoría del dominio de Proveedores

**Tipo:** AUDITORÍA Y DISEÑO (sin implementación en esta fase)  
**Fecha de referencia:** código backend + frontend actual (FASE 1 comercial estable, Compras + Analytics FASE 2, UI Compras operativa)  
**Restricción cumplida:** no se crearon entidades, migraciones, endpoints nuevos, DTOs nuevos, frontend de maestro, ni cambios de base de datos en esta fase.

---

## Leyenda

| Etiqueta | Significado |
|----------|-------------|
| **HECHO** | Evidencia directa en repositorio (código, SQL, rutas, tests, docs). |
| **INFERENCIA** | Conclusión razonable a partir de HECHOS; no está escrito explícitamente como regla de negocio. |
| **PROPUESTA** | Diseño recomendado para fases posteriores; aún no implementado o incompleto. |
| **DECISIÓN** | Regla cerrada en este documento o en brief de fase (p. ej. no fusionar Cliente/Proveedor). |
| **DECISIÓN PENDIENTE** | Requiere definición de negocio; no inventar en implementación. |
| **INCERTIDUMBRE** | Falta evidencia en repo o en operación real. |

---

## Informe ejecutivo

| Campo | Valor |
|-------|--------|
| **Estado** | **READY** |
| **Dominio actual** | **Parcialmente implementado** desde FASE 1: maestro `Proveedor` + API CRUD + integración con `Compra`, devoluciones y analytics. **No** es greenfield. |
| **Proveedor** | Entidad + tabla + servicio + controller; modelo **mínimo** (nombre, documento único opcional, un campo `contacto`, email, teléfono, notas, activo). |
| **Contacto** | **Un solo string** `Proveedor.contacto`; **no** existe `ContactoProveedor`. |
| **Compras** | Dominio **`Compra`** completo (cabecera, detalle, estados, completar → inventario + costo, devoluciones); **no** existen `Pedido`, `FacturaCompra`, `OrdenCompra`, `CuentaPorPagar` como entidades separadas. |
| **Datos maestros** | Hoy: identidad reducida + contacto genérico; faltan campos del documento real de negocio (razón social/NIT estructurado, dirección, condiciones habituales). |
| **Datos transaccionales** | En `Compra`/`DetalleCompra`: número, fecha, totales, costos congelados por línea; **no** IVA, moneda, OC externa, cotización proveedor, condición de pago, contacto comercial por operación. |
| **Costos** | `DetalleCompra.costoUnitario` congelado; `CompraService.completar` aplica `PoliticaCosteoInventario` → `Producto.costoActual`; ventas usan costo congelado en `DetalleVenta`. |
| **Inventario** | Solo `InventarioService` muta stock; entrada vía `TipoMovimientoInventario.COMPRA` al completar compra. Proveedor **no** toca stock directamente. |
| **Siguiente fase** | **3.15.10-B** — enriquecer maestro + UX admin (hoy `comingSoon`) + reglas (activo, duplicados, snapshots) **sin** duplicar dominio Compras. |

**BLOCKED:** no aplica; la auditoría puede cerrarse. Riesgos y decisiones pendientes se listan abajo y no impiden planificar 10-B.

---

## 1. Estado actual

### 1.1 Existencia del dominio Proveedor

**HECHO**

| Capa | Artefacto |
|------|-----------|
| DB | `proveedores` en `V1__fase1_gestion_comercial.sql` |
| Entity | `ModulComercialModel/Proveedor.java` |
| Repository | `ProveedorRepository` (`findByDocumento`, `findByActivoTrueOrderByNombreAsc`, `findByNombreContainingIgnoreCase` **sin uso en service**) |
| Service | `ProveedorService` (crear, listar, obtener, actualizar, desactivar lógica, unicidad documento, normalización trim) |
| Controller | `ProveedorController` — `/api/v1/proveedores`, rol `ADMIN` |
| DTOs | `ProveedorRequestDTO`, `ProveedorResponseDTO` |
| Tests | Uso en `ComercialTestSupport`, `CompraServiceTest`, `DevolucionCompraServiceTest`, analytics compras |

Documentación **HECHO:** `FASE1_GESTION_COMERCIAL.md` lista `Proveedor` como entidad FASE 1.

### 1.2 Compras, pedidos y facturas

**HECHO**

- **`Compra`** es el documento de compra interno SOLVIX (`numero` tipo `C-{yyyy}-{seq}`).
- **`DetalleCompra`**: producto, snapshots `productoNombre` / `categoriaCodigo`, cantidad, `costoUnitario`, subtotal, devoluciones parciales.
- **`DevolucionCompra`**: documento económico aparte (FASE 1 ampliada + `V3__devoluciones_compra.sql`).
- **`CompraController`**, **`CompraService`**, specifications por `proveedorId`, estado, fechas.
- Frontend: rutas `compras`, formulario, listado con filtro proveedor y panel analytics gasto por proveedor.

**HECHO (ausencia)**

Búsqueda en Java/SQL/TS no encontró entidades o módulos nombrados:

`Pedido`, `FacturaCompra`, `FacturaProveedor`, `OrdenCompra`, `CuentaPorPagar`, `EntradaCompra`, `RecepcionCompra`, `ContactoProveedor`.

**INFERENCIA:** “Pedido del proveedor” en el documento real de negocio **no** tiene homólogo 1:1 hoy; equivalencia funcional parcial = **`Compra`** (+ número externo futuro en cabecera, no en maestro Proveedor).

### 1.3 Inventario y costos

**HECHO** (`FASE1_GESTION_COMERCIAL.md`, `CompraService`, `DetalleCompra`, `DetalleVenta`, `Producto`)

- Inventario: único escritor `InventarioService`; compra completada registra movimiento `COMPRA` con costo de entrada.
- Costo actual: `Producto.costoActual` (nullable = desconocido); política `UltimoCostoPolitica` implementada.
- Costo histórico de operaciones: líneas de compra/venta y movimientos; **no** se recalcula desde producto actual.
- Analytics: `ComprasAnalyticsService`, `ProveedorGastoDTO`, filtros `proveedorId`; KPIs devoluciones a proveedor.

### 1.4 Frontend Proveedores

**HECHO**

- `ProveedorService` (FE): solo `listar`, `obtenerPorId` — **sin** crear/editar/desactivar.
- `app.routes.ts`: rutas `proveedores`, `proveedores/nuevo`, `proveedores/:id` → **`comingSoon`**.
- Compras consumen `listar(true)` para `<select>` de proveedor activo.

**INFERENCIA:** El “módulo Proveedores” para el usuario admin **pendiente de UI**; backend CRUD **sí existe**.

### 1.5 Colisión de nombres

**HECHO:** `Notificacion.proveedorMensajeId` / migración `V16` = identificador del **proveedor de mensajería** (WhatsApp adapter), **no** del tercero comercial `Proveedor`.

---

## 2. Archivos auditados (muestra representativa)

### Backend

- Modelo: `Proveedor.java`, `Cliente.java`, `Compra.java`, `DetalleCompra.java`, `Producto.java`, `DetalleVenta.java`, `TipoDocumento.java`
- Servicios: `ProveedorService.java`, `CompraService.java`, `ClienteService.java`, `InventarioService.java`, `PoliticaCosteoInventario.java`, `UltimoCostoPolitica.java`, `ComprasAnalyticsService.java`, `DevolucionCompraService.java`
- API: `ProveedorController.java`, `CompraController.java`, `AnalyticsController.java`
- Repos: `ProveedorRepository.java`, `CompraSpecifications.java`, `CompraAnalyticsRepository.java`
- SQL: `V1__fase1_gestion_comercial.sql`, `V3__devoluciones_compra.sql`, `V16__notificaciones_dispatch.sql`
- Docs: `FASE1_GESTION_COMERCIAL.md`, `FASE2_ANALYTICS_ENGINE.md` (referencias gasto por proveedor)
- Tests: `CompraServiceTest`, `DevolucionCompraServiceTest`, `InventarioComprasAnalyticsServiceTest`, `AjusteCostoInventarioTest`, `ComercialTestSupport`

### Frontend

- `core/services/proveedor.service.ts`, `core/models/proveedor.models.ts`
- `features/panelAdmin/compra/*` (form, list, detail, gasto proveedor, mapper)
- `features/panelAdmin/cliente/cliente-list/*` (patrón lista/filtros)
- `app.routes.ts` (compras + proveedores comingSoon)

### Búsqueda de conceptos (repo)

Términos del brief buscados en entities, DTOs, services, controllers, migrations, FE, tests: **Proveedor/proveedorId** abundante en comercial/analytics; **Compra** implementada; **Pedido** solo como métrica de ventas en analytics (“pedidos” = ventas); **precioCompra/costoCompra** en analytics DTOs y política de costeo, no como entidad maestro.

---

## 3. Existencia o ausencia del dominio (resumen)

| Concepto | Estado |
|----------|--------|
| Maestro Proveedor | **HECHO** — implementado (mínimo) |
| ContactoProveedor | **HECHO** — no existe |
| Compra + detalle | **HECHO** — implementado |
| Devolución compra | **HECHO** — implementado |
| Factura / OC / CxP | **HECHO** — no existe |
| Producto ↔ proveedor FK | **HECHO** — no existe |
| UI CRUD proveedores | **HECHO** — no (placeholder) |
| API CRUD proveedores | **HECHO** — sí |

**DECISIÓN:** FASE 3.15.10-B debe **extender y alinear** lo existente, **no** crear un segundo stack de Proveedores/Compras.

---

## 4. Relación con Cliente

### 4.1 Separación conceptual

**DECISIÓN (brief de fase, alineada con código)**

- **Cliente:** tercero al que SOLVIX vende/presta servicios (`clientes`, ventas, OT, cotizaciones).
- **Proveedor:** tercero del que SOLVIX compra (`proveedores`, compras).

**HECHO**

- Entidades **distintas**, tablas **distintas**, FKs **distintas** (`Venta.cliente`, `Compra.proveedor`).
- **No** hay `esProveedor` en `Cliente` ni reutilización de `Cliente` como proveedor.
- **No** hay vínculo formal Cliente↔Proveedor (misma empresa dual).

### 4.2 Comparación de modelos

| Aspecto | Cliente | Proveedor |
|---------|---------|-----------|
| Identificación | `tipoDocumento` + `numeroDocumento` (UK compuesto) | `documento` único (string, nullable en práctica API) |
| Nombre | `nombre` | `nombre` (rol similar a razón social informal) |
| Tipo persona/empresa | `TipoCliente` | **No** |
| Contacto persona | **No** (solo tel/email empresa) | Campo **`contacto`** (persona mezclada en maestro) |
| Dirección | **No** en entidad | **No** |
| Activo / desactivar | Sí; reglas Consumidor final | Sí; `DELETE` HTTP = desactivar |
| Búsqueda server-side | `ClienteService.buscar` + repo | **No** expuesto en `ProveedorService` (repo tiene método parcial) |

### 4.3 Misma empresa Cliente y Proveedor

**INCERTIDUMBRE / DECISIÓN PENDIENTE**

El repositorio **no** documenta si en operación real una misma razón social puede ser cliente y proveedor a la vez.

**PROPUESTA (sin implementar ahora):** mantener registros **independientes**; si negocio confirma dualidad frecuente, valorar en fase futura solo **vínculo opcional** o **validación de aviso** (mismo NIT en tablas distintas), **sin** fusionar entidades.

---

## 5. Datos maestros vs transaccionales vs contacto

Referencia de negocio (documento real de compra/pedido): razón social, NIT, dirección, ciudad, teléfono, fax **del proveedor**; vs número pedido, fechas, condición pago, vendedor/asesora, líneas, IVA, totales **de la operación**.

### 5.1 Clasificación

| Dato (documento real) | Clasificación | Hoy en SOLVIX |
|----------------------|---------------|---------------|
| Razón social / nombre empresa | **Maestro Proveedor** | `Proveedor.nombre` |
| NIT | **Maestro** (identificación) | `Proveedor.documento` (sin tipo) |
| Dirección, ciudad | **Maestro** (ubicación) | **Ausente** |
| Teléfono, fax empresa | **Maestro** (contacto general) | `telefono`; fax **ausente** |
| Asesora / vendedor del proveedor | **Contacto** (persona) | Mezclado en `contacto` o **ausente** en compra |
| Nº pedido / factura proveedor | **Transaccional** | Parcial: `Compra.numero` es interno SOLVIX |
| Condición pago, días crédito | **Habitual → maestro**; **aplicada → Compra** | **Ausente** ambos |
| Moneda, cotización, OC | **Transaccional** | **Ausente** |
| Precios, descuentos, IVA, totales | **Transaccional** (línea/cabecera) | Subtotal/descuento/total sin IVA; costos en línea |
| Cliente comprador (SOLVIX) | **No es Proveedor** | N/A |
| “Contacto” en pedido (comprador interno) | **Usuario / área SOLVIX** o observación | **No modelado** |

**DECISIÓN:** No promover campos transaccionales al maestro Proveedor en 10-B salvo “condiciones habituales” explícitamente acordadas.

---

## 6. Propuesta de maestro Proveedor (evolución sobre lo existente)

Evaluación campo a campo respecto al brief y al código actual.

| Campo propuesto | Clasificación | Evidencia / necesidad | Recomendación 10-B |
|-----------------|---------------|------------------------|---------------------|
| `id` | OBLIGATORIO | **HECHO** | Mantener |
| `tipoDocumento` | OBLIGATORIO (Colombia) | Cliente ya usa `TipoDocumento` enum | **PROPUESTA:** reutilizar enum; migración + UK `(tipo, numero)` alinear con Cliente |
| `numeroDocumento` / NIT | OBLIGATORIO negocio real | Doc real muestra NIT; hoy `documento` | **PROPUESTA:** separar o renombrar con plan migración desde `documento` |
| `razonSocial` | OBLIGATORIO | Doc real; hoy `nombre` | **PROPUESTA:** alias semántico o rename `nombre` → documentar en API |
| `nombreComercial` | OPCIONAL | No en repo; no en doc mínimo FASE 1 | **DECISIÓN PENDIENTE** si aporta en facturas impresas |
| `activo` | OBLIGATORIO | **HECHO** | Mantener + reglas uso |
| `direccion` | OPCIONAL | Doc real | **PROPUESTA** texto simple |
| `ciudad` / `departamento` | OPCIONAL | Doc real | **PROPUESTA** texto; no jerarquía geo hasta que exista catálogo |
| `telefono` / alternativo | OPCIONAL | Doc real | Mantener + opcional 2º |
| `email`, `web` | OPCIONAL | Patrón Cliente email | **PROPUESTA** web opcional |
| `condicionPago`, `diasCredito` | OPCIONAL maestro | Doc “30D CREDITO…” | **PROPUESTA** defaults habituales; **no** sustituyen compra |
| `monedaPreferida` | OPCIONAL / NO NECESARIO | Compras actuales sin moneda | **DECISIÓN PENDIENTE** (multi-moneda) |
| `notas` | OPCIONAL | **HECHO** | Mantener |
| `fechaRegistro` / actualización | Control | **HECHO** registro; sin `updatedAt` en entity | **PROPUESTA** `updatedAt` coherente con `Compra` |
| `contacto` (string) | PERTENECE A CONTACTO | **HECHO** campo único | **PROPUESTA:** migrar a `ContactoProveedor` o deprecar gradualmente |
| IVA, totales, OC, cotización | TRANSACCIONAL | — | **No** en Proveedor |
| Fax | OPCIONAL baja prioridad | Doc real | **DECISIÓN PENDIENTE** (uso actual) |

---

## 7. Propuesta de ContactoProveedor

**HECHO:** no existe entidad ni tabla.

**INFERENCIA:** El documento real distingue empresa proveedora vs “vendedor/asesora”; el campo `Proveedor.contacto` **no** modela roles, vigencia ni múltiples personas.

**PROPUESTA:** `Proveedor 1:N ContactoProveedor` **solo si** 10-B o Compras futuras necesitan:

- registrar asesor en compra (FK o snapshot a contacto),
- facturación/logística con personas distintas,
- contacto principal rotativo sin editar razón social.

Atributos sugeridos (no implementados): `nombre`, `cargo`, `telefono`, `celular`, `email`, `tipoContacto` (COMERCIAL, FACTURACION, SOPORTE, LOGISTICA, OTRO), `principal`, `activo`.

| Criterio | Valoración |
|----------|------------|
| Complejidad | Media (CRUD anidado + migración desde `contacto`) |
| Utilidad Compras | Alta si se congela “vendedor” por operación |
| Riesgo sobre-modelar | Medio si solo hay 0–1 contacto por proveedor |

**PROPUESTA mínima 10-B:** enriquecer maestro + UI; **ContactoProveedor** en 10-B **opcional** según decisión negocio. Si se pospone: mantener un contacto principal en maestro **temporalmente** documentado como deuda técnica.

**DECISIÓN (brief):** “Vendedor” en documento del proveedor = **contacto comercial externo**, **no** usuario SOLVIX ni identidad del Proveedor.

---

## 8. Condiciones comerciales e histórico

**HECHO:** ni `Proveedor` ni `Compra` persisten condición de pago ni días de crédito.

**PROPUESTA (Compras futuras / extensión Compra)**

| Concepto | Maestro (habitual) | Transaccional (congelado) |
|----------|-------------------|---------------------------|
| Condición de pago | `Proveedor.condicionPago` (texto o catálogo) | `Compra.condicionPagoAplicada` al crear |
| Días crédito | `Proveedor.diasCredito` | `Compra.diasCreditoAplicados` |
| Moneda | preferida opcional | `Compra.moneda` + tasa si aplica |

**PROPUESTA:** al **crear** compra, copiar defaults del proveedor a campos snapshot en cabecera (patrón análogo a `CotizacionComercial.clienteNombreSnapshot`, `DetalleCompra.productoNombre`). Cambios posteriores al proveedor **no** alteran compras cerradas.

**HECHO (gap histórico proveedor):** `CompraResponseDTO.proveedorNombre` se lee del **join vivo** a `Proveedor`, **no** snapshot en tabla `compras`. Renombrar proveedor **cambia** etiqueta en listados históricos (IDs FK siguen válidos).

**PROPUESTA 10-B o fase Compras-hardening:** `proveedorNombreSnapshot` (+ opcional documento) en `Compra` al crear/completar.

**HECHO (costos/impuestos ya congelados en línea):** `DetalleCompra.costoUnitario`; ventas con `costoConocido`. IVA **no** modelado en compras actuales → **DECISIÓN PENDIENTE** régimen fiscal.

---

## 9. Estado activo / inactivo

**HECHO**

- `Proveedor.activo`, índice `idx_proveedores_activo`.
- Desactivación vía `DELETE /api/v1/proveedores/{id}` → `activo=false` (no borrado físico).
- `ProveedorService.listar(soloActivos)`; FE compras usa `listar(true)`.

**HECHO (gap)**

- `CompraService.crear` **no** valida `proveedor.activo` (solo `buscarOFallar`).

**PROPUESTA**

| Operación | Proveedor inactivo |
|-----------|-------------------|
| Nueva compra | **Bloquear** |
| Completar compra pendiente vieja | **DECISIÓN PENDIENTE** (permitir vs bloquear) |
| Ver compras/devoluciones históricas | **Permitir** |
| Editar maestro | Permitir reactivación |
| Eliminar físico | **No** si hay FK `compras.proveedor_id` |

**PROPUESTA:** motivo de inactivación opcional (como productos/clientes si se adopta patrón uniforme) — **DECISIÓN PENDIENTE**.

---

## 10. Identificación fiscal y duplicados

### 10.1 Cliente (referencia)

**HECHO:** `TipoDocumento`: CC, NIT, CE, PASAPORTE, NINGUNO; UK `(tipo_documento, numero_documento)`; normalización trim en service; unicidad solo si tipo y número presentes.

### 10.2 Proveedor (actual)

**HECHO:** un campo `documento` unique nullable; validación trim; mensaje “Ya existe un proveedor con ese documento.”; **sin** normalización NIT (guiones, DV, mayúsculas).

**PROPUESTA (documentar para 10-B)**

| Regla | Detalle |
|-------|---------|
| Unicidad | `(tipoDocumento, numeroDocumento)` al alinear con Cliente; mientras tanto UK en `documento` |
| Normalización | Trim; **DECISIÓN PENDIENTE** quitar puntos/guiones en NIT y tratamiento dígito verificación |
| Duplicado cross-tabla | Cliente vs Proveedor mismo NIT: **DECISIÓN PENDIENTE** (permitido vs advertir) |
| Documento vacío | Hoy permitido si no se envía; **DECISIÓN PENDIENTE** obligatoriedad NIT para proveedores formales |

---

## 11. Dirección

**HECHO:** Cliente y Proveedor **sin** campos de dirección en entidad.

**PROPUESTA:** `direccion` + `ciudad` + `departamento` como **texto** (sin entidad `Direccion` ni geocoding) hasta requisito de envíos/logística avanzada.

---

## 12. Relación con productos

**HECHO:** `Producto` **no** tiene `proveedorId` ni tabla intermedia.

**INFERENCIA:** proveedor por producto se infiere del **historial de compras** (analytics ya agrega por compra/línea).

| Opción | Evaluación |
|--------|------------|
| A. Proveedor principal en producto | Conveniente UX; riesgo desactualización vs última compra |
| B. Múltiples proveedores por producto | Útil abastecimiento; requiere tabla `ProductoProveedor` |
| C. Solo vía compras | **HECHO** — coherente con costo por entrada |

**PROPUESTA:** mantener **C** en 10-B; **no** agregar `Producto.proveedorId` sin decisión negocio. Si se necesita “último proveedor” en UI, **INFERENCIA:** derivar por query analytics/última compra completada.

---

## 13. Relación con inventario

**HECHO** (flujo)

```
Proveedor (maestro)
  → Compra (PENDIENTE)
  → CompraService.completar
       → PoliticaCosteoInventario → Producto.costoActual
       → InventarioService.registrarMovimiento(COMPRA, ...)
  → stock actualizado
```

**DECISIÓN:** Proveedor **nunca** muta stock directamente; autoridad = `InventarioService`.

**PROPUESTA futura:** recepciones parciales / múltiples entradas por OC = extensión de **Compra**, no de Proveedor.

---

## 14. Relación con costos

**HECHO**

- Regla documentada: costo histórico en líneas ≠ `Producto.costoActual`.
- Compra completada actualiza costo vigente según política.
- Devoluciones compra ajustan stock y analytics de gasto neto.

**INFERENCIA:** analytics “evolución precios por proveedor” puede construirse desde `detalle_compra` + `compras.proveedor_id` sin campo extra en Proveedor.

**PROPUESTA:** nuevas compras siguen congelando `costoUnitario` en línea; cambios de política de costeo **no** reescriben líneas históricas (ya alineado con comentarios en código).

---

## 15. Impacto en Compras (conceptual)

Lo que **pertenece a Compra** (existente + extensiones futuras), no a Proveedor:

- `proveedor_id` (FK) — **HECHO**
- Documento: número interno — **HECHO**; número factura/OC proveedor — **PROPUESTA** campos opcionales en cabecera
- Fechas: negocio, entrega, vencimiento pago — parcial (**solo fecha** hoy)
- Condición pago aplicada, moneda — **PROPUESTA**
- Cotización referencia proveedor — **PROPUESTA**
- Subtotal, descuento, impuestos, total — parcial (sin impuestos)
- Detalles: producto, cantidad, costo — **HECHO**
- Contacto comercial en operación — **PROPUESTA** snapshot o FK ContactoProveedor

**No implementar** en 10-A; listado guía alcance de fases “Compras enriquecidas” posteriores.

---

## 16. Impacto en Analytics

**HECHO**

- Gasto por proveedor, participación, devoluciones (`InventarioComprasAnalyticsServiceTest`, DTOs).
- Filtro `proveedorId` en API analytics compras.

**PROPUESTA**

- Concentración proveedores, evolución precios: queries sobre `detalle_compra` + proveedor.
- Enriquecer dimensiones si maestro gana ciudad/tipo documento (segmentación geográfica/fiscal).

---

## 17. UX futura (sin implementar)

Organización de formulario admin (espejo **Cliente** + compras):

1. **Información básica:** razón social/nombre, tipo y número documento, nombre comercial (si aplica).
2. **Contacto empresa:** teléfono(s), email, web.
3. **Ubicación:** dirección, ciudad, departamento.
4. **Condiciones habituales:** condición pago, días crédito.
5. **Contactos:** lista (si ContactoProveedor).
6. **Estado:** activo/inactivo + confirmación desactivar.

### Patrones Search/UX existentes

**HECHO**

- **Cliente:** lista carga completa + **filtro client-side** (`filtrarClientes`); búsqueda server `ClienteService.buscar` para selectores.
- **Compras:** filtro server `proveedorId` + búsqueda local número/nombre proveedor en lista; estados loading/empty/error (`SeccionEstado`, `solvix-loading-state`).
- **Proveedores:** rutas placeholder; API list sin paginación.

**PROPUESTA 10-B**

- Lista proveedores: mismo patrón **cliente-list** (header, badge activo, empty, confirm desactivar).
- Selector en compra: exponer **`buscar`** server-side (repo ya tiene `findByNombreContainingIgnoreCase`; alinear con `ClienteController` `/buscar`).
- **No** inventar paginación nueva hasta volumen lo exija; reutilizar límite 50 como Cliente.

---

## 18. Impact surface (futuro)

| Área | Impacto |
|------|---------|
| **BACKEND** | Migración campos proveedor; opcional `ContactoProveedor`; validaciones activo; endpoint buscar; snapshots en Compra; tests unicidad/NIT |
| **DATABASE** | ALTER `proveedores`; nueva tabla contactos; UK compuesto; índices búsqueda |
| **FRONTEND** | Reemplazar `comingSoon`; form/detail; extender `ProveedorService` POST/PUT/DELETE; modelos request |
| **COMPRAS** | Defaults condición pago; bloqueo inactivo; snapshot nombres |
| **INVENTARIO** | Sin cambio en autoridad; solo flujo vía compra |
| **COSTOS** | Sin cambio de regla; datos enriquecidos alimentan reportes |
| **ANALYTICS** | Dimensiones opcionales; mismos joins por `proveedor_id` |
| **DOCUMENTACIÓN** | API OpenAPI/contratos; reglas duplicados |

---

## 19. Decisiones pendientes

1. ¿Obligatorio NIT/tipo documento para todo proveedor?
2. ¿Normalización NIT (DV, guiones) y reglas de unicidad cross Cliente/Proveedor?
3. ¿Nombre comercial y fax?
4. ¿Moneda preferida / multi-moneda en compras?
5. ¿Misma empresa cliente y proveedor — aviso, vínculo o independencia total?
6. ¿ContactoProveedor en 10-B o fase posterior?
7. ¿IVA y desglose fiscal en compras?
8. ¿Snapshot proveedor en cabecera compra en 10-B vs fase Compras?
9. ¿Completar compras pendientes con proveedor ya inactivo?
10. ¿Motivo obligatorio al desactivar proveedor?

---

## 20. Propuesta FASE 3.15.10-B

**Objetivo:** cerrar el gap **maestro + administración**, respetando dominio Compras existente.

**Alcance sugerido (PROPUESTA)**

1. **Inventario de brechas** vs documento negocio: campos maestro acordados con negocio (mínimo: identificación fiscal alineada a `TipoDocumento`, dirección/ciudad opcional, condiciones habituales opcionales).
2. **Migración Flyway** evolutiva desde `documento`/`nombre`/`contacto` (sin segunda entidad Proveedor).
3. **Reglas:** unicidad documento, bloqueo compra nueva con proveedor inactivo, normalización documentada.
4. **API:** `GET /proveedores/buscar` (paridad Cliente); opcional paginación diferida.
5. **Frontend:** implementar rutas `proveedores/*` (list, form, detail) con patrones Cliente + feedback Solvix.
6. **ContactoProveedor:** solo si decisión negocio #6 = sí; si no, documentar deuda y uso temporal de un contacto en maestro.
7. **Snapshots compra:** evaluar ticket separado si 10-B crece; mínimo documentar gap `proveedorNombre` vivo.
8. **Tests:** ProveedorService unicidad/activo; integración compra + proveedor inactivo.
9. **Docs:** contrato API + reglas duplicados para operación.

**Fuera de alcance 10-B (mantener NO-GOALS del brief):** CxP, factura electrónica proveedor, import masiva, ERP, pagos bancarios, nueva entidad Compra paralela.

---

## 21. Criterios de aceptación (FASE 3.15.10-A)

| Criterio | Estado |
|----------|--------|
| Se verificó si Proveedor ya existe | ✅ **Sí** — FASE 1 |
| Se verificó si Compras ya existe | ✅ **Sí** — `Compra` + devoluciones |
| Se verificó Pedido/FacturaCompra | ✅ **No existen** como dominios separados |
| Cliente y Proveedor separados | ✅ Entidades distintas; sin fusión |
| Múltiples contactos auditado | ✅ Propuesta 1:N; hoy 1 string |
| Maestros vs transaccionales | ✅ Tabla §5 |
| Condición de pago | ✅ Analizada; ausente en código |
| Histórico costos | ✅ Alineado FASE 1 |
| InventoryService | ✅ Flujo Compra → inventario |
| Relación productos | ✅ Sin FK; opción C recomendada |
| Activos/inactivos | ✅ + gap validación compra |
| Duplicados | ✅ Reglas propuestas |
| Impact surface | ✅ §18 |
| Sin código funcional en 10-A | ✅ Solo este documento |
| Documentación creada | ✅ Este archivo |

---

## 22. Informe final (plantilla brief)

**Estado:** READY  

**Dominio actual:** Maestro Proveedor + Compras + Analytics integrados desde FASE 1–2; UI maestro proveedor pendiente; modelo maestro más pobre que Cliente y que documento real de negocio.  

**Proveedor:** Implementado (CRUD backend, desactivación lógica, unicidad `documento`).  

**Contacto:** Campo único `contacto`; ContactoProveedor no existe.  

**Compras:** `Compra`/`DetalleCompra` operativos; sin factura/OC/CxP; sin condición pago/IVA/moneda.  

**Datos maestros:** nombre, documento, tel/email, notas, activo (+ gaps dirección, fiscal estructurado, condiciones).  

**Datos transaccionales:** en Compra; costos congelados en línea; nombre proveedor en DTO no congelado en DB.  

**Costos:** Política + líneas; coherente con regla histórico vs actual.  

**Inventario:** Entrada solo al completar compra vía InventarioService.  

**Campos propuestos:** Ver §6 y §7.  

**Reglas:** No fusionar con Cliente; no atributos transaccionales en Proveedor; inactivo bloquea altas nuevas (propuesto); no delete físico con historial.  

**Impact Surface:** §18.  

**Decisiones pendientes:** §19.  

**Siguiente fase:** **3.15.10-B** — extensión maestro, UX admin, reglas y alineación fiscal/contacto sin reimplementar Compras.

---

*Fin FASE 3.15.10-A — auditoría y diseño únicamente.*
