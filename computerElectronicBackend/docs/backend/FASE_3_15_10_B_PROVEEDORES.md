# SOLVIX — FASE 3.15.10-B
## Maestro de Proveedores + Administración

**Tipo:** IMPLEMENTACIÓN (enriquecimiento del dominio existente)  
**Base:** `docs/backend/FASE_3_15_10_A_AUDITORIA_PROVEEDORES.md`  
**Fecha de referencia:** código backend + frontend post 3.15.10-B

---

## 1. Modelo final

### Proveedor (empresa)

| Campo Java | Columna | Obligatorio | Notas |
|------------|---------|-------------|-------|
| `id` | `id` | sí | |
| `nombre` | `nombre` | sí | **Razón social** (compat FASE 1; DTO expone `razonSocial` + alias `nombre`) |
| `tipoDocumento` | `tipo_documento` | sí en altas nuevas | Fijo funcional **NIT** |
| `documento` | `documento` | sí en altas nuevas | **Número NIT** normalizado; UK histórico |
| `nombreComercial` | `nombre_comercial` | no | |
| `direccion` / `ciudad` / `departamento` | texto | no | Sin entidad geográfica |
| `telefono` / `telefonoAlternativo` | | no | |
| `email` / `web` | | no | |
| `condicionPago` | `condicion_pago` | no | `CONTADO` \| `CREDITO` |
| `diasCredito` | `dias_credito` | condicional | Obligatorio > 0 si CREDITO; 0 si CONTADO |
| `contacto` | `contacto` | legacy | Conservado; migrado a contactos |
| `notas` / `activo` / fechas | | | Soft-delete vía `activo` |
| `contactos` | 1:N | | `ContactoProveedor` |

### ContactoProveedor (persona externa)

`nombre`, `cargo`, `telefono`, `celular`, `email`, `tipoContacto` (`COMERCIAL`, `FACTURACION`, `LOGISTICA`, `SOPORTE`, `OTRO`), `principal`, `activo`, fechas.

**No** es usuario SOLVIX.

### Compra (mínimo histórico)

- `proveedorNombreSnapshot`
- `proveedorDocumentoSnapshot`

Capturados al **crear** la compra.

---

## 2. Migración

Archivo: `src/main/resources/db/migration/V17__proveedores_maestro_contactos.sql`

Contiene:

1. Columnas nuevas en `proveedores`
2. Backfill `tipo_documento = NIT` **solo** donde ya hay documento
3. Tabla `contactos_proveedor` + migración del string `contacto` → contacto COMERCIAL principal (solo nombre)
4. Snapshots en `compras` + backfill desde proveedor vivo

### Runtime del proyecto

**HECHO:** Flyway **no** está cableado en el POM. El esquema de desarrollo/test se apoya en Hibernate (`ddl-auto=update` / `create-drop` en tests).

**Operación recomendada en MySQL:**

1. Ejecutar `V17__proveedores_maestro_contactos.sql` manualmente (o cablear Flyway en una fase de infra).
2. Reiniciar con Hibernate `update` para alinear tipos/índices residuales si aplica.
3. **No** inventar NIT para filas históricas sin documento.

### Históricos sin documento

- Se conservan.
- No reciben NIT inventado.
- Cualquier **crear/actualizar** vía API exige NIT + razón social.

---

## 3. Identificación fiscal

- Regla funcional: proveedor Formal → **NIT obligatorio** en altas/ediciones.
- Enum reutilizado: `TipoDocumento.NIT`.
- Normalización almacenada: trim + eliminar espacios, puntos y guiones → solo dígitos (incluye DV si venía separado).
- Unicidad: `documento` unique (mismo NIT no puede repetirse).
- Cliente y Proveedor con el mismo NIT: **permitido** (roles separados).

---

## 4. Contactos

- Relación `Proveedor 1:N ContactoProveedor`.
- Máximo **un** principal activo por proveedor (validado en service).
- Desactivar contacto ≠ desactivar proveedor.
- Desactivar proveedor **no** borra contactos.
- Sincronización en create/update vía lista nested en `ProveedorRequestDTO`:
  - `contactos == null` → no toca contactos existentes (update) / vacío (create)
  - lista presente → replace set (ids retenidos / nuevos / removidos)

---

## 5. Condiciones comerciales habituales

Defaults del maestro; **no** congelan compras históricas (aún no hay campos de condición en Compra).

- `CONTADO` → `diasCredito = 0`
- `CREDITO` → `diasCredito > 0` obligatorio

---

## 6. Activo / inactivo

- Soft delete: `DELETE /api/v1/proveedores/{id}` → `activo=false`
- Nueva compra: **solo** proveedores activos (`CompraService` → `buscarActivoParaCompra`)
- Compra ya creada: se puede **completar** aunque el proveedor se inactive después
- Historial visible en detalle proveedor / listados compra

---

## 7. Integración Compra

Flujo intacto:

```
Proveedor → Compra → CompraService.completar
  → PoliticaCosteoInventario → Producto.costoActual
  → InventarioService.registrarMovimiento(COMPRA)
```

Sin `Producto.proveedorId`. Sin cambio de autoridad de inventario/costeo.

---

## 8. Snapshot histórico

`CompraResponseDTO.proveedorNombre` / `proveedorDocumento` leen **snapshot** si existe; fallback al proveedor vivo (compras previas al backfill).

Cambio posterior de razón social **no** altera compras ya creadas con snapshot.

`DevolucionCompraResponseDTO.proveedorNombre` también prioriza snapshot de la compra.

---

## 9. API

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/api/v1/proveedores` | `soloActivos`; también `q`+`limite` (paridad Cliente) |
| GET | `/api/v1/proveedores/buscar` | `q`, `limite`, `soloActivos` |
| GET | `/api/v1/proveedores/{id}` | con contactos |
| POST | `/api/v1/proveedores` | NIT + razón social |
| PUT | `/api/v1/proveedores/{id}` | |
| DELETE | `/api/v1/proveedores/{id}` | desactiva |

DTOs: `ProveedorRequestDTO` / `ProveedorResponseDTO` + nested contactos. Aliases `nombre`/`documento` para compat UI compras.

---

## 10. Frontend

Placeholders `comingSoon` eliminados.

Rutas:

- `/proveedores` — lista (búsqueda/filtro/estado)
- `/proveedores/nuevo` — formulario seccionado
- `/proveedores/:id/editar`
- `/proveedores/:id` — detalle + contactos + compras relacionadas (`CompraService.listar`)

Patrones: Cliente (header, badges, empty/loading/error, confirmación desactivar, responsive).

---

## 11. Tests

### Backend

- `ProveedorServiceTest`: crear, NIT duplicado/normalizado, obligatorios, principal único, crédito, buscar, desactivar, compra inactiva bloqueada, completar permitida, snapshot estable.
- `CompraServiceTest`: regresión (helpers ya crean proveedor con NIT).

### Frontend

- `proveedor-ui.spec.ts` — UI helpers + mapper
- `proveedor-list.spec.ts` — carga y filtro

---

## 12. Decisiones

| Tema | Decisión |
|------|----------|
| Segundo dominio Proveedor/Compra | **No** |
| Razón social | Columna `nombre` + DTO `razonSocial` |
| ContactoProveedor | **Sí**, en esta fase |
| Producto↔Proveedor | Solo vía Compra |
| Mismo NIT Cliente/Proveedor | Permitido |
| Motivo inactivación | No (mejora futura) |
| Flyway auto | No cableado; script V17 manual |

---

## 13. Riesgos

1. **MySQL prod:** si no se ejecuta V17, Hibernate `update` crea columnas/tablas pero **no** migra `contacto` ni backfill de snapshots.
2. Proveedores históricos **sin NIT** no pueden editarse hasta completar identificación.
3. Lista `contactos` en PUT hace sync completo: omitir ids borra contactos (contrato documentado).
4. Normalización NIT agresiva (quita puntos/guiones): dos formatos visuales colisionan a propósito.

---

## 14. Limitaciones (NO-GOALS respetados)

Sin CxP, factura electrónica, pagos, multi-moneda, IVA compras, OC independiente, `ProductoProveedor`, nuevo costeo.

---

## Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| Separación Cliente/Proveedor | ✅ |
| Empresa + NIT + razón social | ✅ |
| Dirección / contacto / condiciones | ✅ |
| ContactoProveedor 1:N + principal único | ✅ |
| Sin Producto.proveedorId | ✅ |
| Compra nueva exige activo | ✅ |
| Completar con inactivo posterior | ✅ |
| Snapshot nombre | ✅ |
| Inventario/costeo intactos | ✅ |
| API buscar | ✅ |
| FE lista/crear/detalle/editar | ✅ |
| Migración V17 | ✅ (script; aplicar en MySQL) |
| Documentación | ✅ este archivo |

---

*Fin FASE 3.15.10-B*
