# SOLVIX — FASE 3.15.10-C
## Validación, migración y cierre — Proveedores

**Tipo:** VALIDACIÓN Y CIERRE (sin ampliación funcional)  
**Base:** `FASE_3_15_10_A_AUDITORIA_PROVEEDORES.md` + `FASE_3_15_10_B_PROVEEDORES.md`  
**Fecha:** 2026-10-02

Leyenda: **HECHO** · **PRUEBADO** · **CORREGIDO** · **RIESGO** · **LIMITACION** · **NO IMPLEMENTADO**

---

## 1. Baseline (antes de correcciones)

| Artefacto | Resultado baseline |
|-----------|-------------------|
| Backend tests (suite 10-C) | **PASS** — ver §14 |
| Frontend specs proveedor/compra/cliente | **PASS** — 29/29 |
| `mvn -DskipTests package` | **BUILD SUCCESS** |
| `ng build --configuration=production` | **PASS** (budget warning preexistente) |
| MySQL `solarfishdb` | Esquema **parcialmente** actualizado por Hibernate `ddl-auto=update` (columnas + `contactos_proveedor` + snapshots); **0** filas en proveedores/compras; **faltaban** índices nombrados V17 |
| Placeholders FE `/proveedores` | **HECHO** — eliminados en 10-B (rutas reales) |
| Flyway | **HECHO** — no cableado (preexistente) |

### Separación de origen

| Hallazgo | Origen |
|----------|--------|
| Flyway no cableado | **PREEXISTENTE** |
| Hibernate crea columnas/ENUM antes de V17 | **INTRODUCIDO POR 3.15.10-B** (entidades) + runtime `ddl-auto=update` |
| V17 no idempotente (`Duplicate column`) si el esquema ya está al día | **INTRODUCIDO POR 3.15.10-B** (script asume FASE 1 puro) |
| Analytics gasto por proveedor usa `pr.nombre` vivo | **PREEXISTENTE** (FASE 2); no regresivo |

**Correcciones de código en 10-C:** ninguna (no se identificó defecto funcional de aplicación).  
**Acción operativa:** residual de índices + backfill idempotente en `solarfishdb` (ver §2).

---

## 2. Migración V17

**Archivo:** `src/main/resources/db/migration/V17__proveedores_maestro_contactos.sql`

### Inspección estática — **HECHO**

- Orden: ALTER proveedores → tipificar NIT → CREATE contactos → INSERT contactos → ALTER compras → backfill snapshots → índices.
- No inventa NIT; no inventa cargo/tel/email en contactos.
- `CREATE TABLE IF NOT EXISTS` solo en contactos; `ADD COLUMN` **no** es idempotente.

### Ejecución controlada — **PRUEBADO**

Base dedicada: `solarfishdb_v17_val` (MySQL 8, esquema legacy FASE 1).

**Pre-V17**

| Métrica | Valor |
|---------|------:|
| proveedores | 4 |
| con documento | 2 |
| sin documento | 2 |
| con contacto string | 2 |
| compras | 3 |

**Post-V17**

| Métrica | Valor | Esperado |
|---------|------:|----------|
| tipificados `tipo_documento=NIT` | 2 | solo con documento |
| sin doc y sin tipo | 2 | sin inventar NIT |
| contactos migrados | 2 | solo nombre; cargo/tel/email NULL |
| compras con `proveedor_nombre_snapshot` | 3 | todas |
| compras con `proveedor_documento_snapshot` | 2 | 1 NULL (proveedor sin doc) |
| índices `idx_*` | presentes | sí |

**PRUEBADO:** FK `contactos_proveedor.proveedor_id` → `proveedores.id`.

### `solarfishdb` (TEST de aplicación)

- Reejecutar V17 completo → **ERROR 1060 Duplicate column name 'ciudad'** — **PRUEBADO**.
- Residual aplicado (índices + backfills idempotentes). Datos de negocio: **0** proveedores / **0** compras (vacía).

### Cómo ejecutar V17 (operación)

**Caso A — esquema FASE 1 puro (sin columnas 10-B):**

```text
mysql -u... -p NOMBRE_BD < src/main/resources/db/migration/V17__proveedores_maestro_contactos.sql
```

**Caso B — Hibernate ya creó columnas/tablas (como `solarfishdb`):**

1. **No** reejecutar el ALTER completo.
2. Ejecutar residual:
   - `CREATE INDEX` si faltan (`idx_proveedores_tipo_documento`, `idx_proveedores_ciudad`, `idx_contactos_proveedor`, `idx_contactos_proveedor_activo`)
   - `UPDATE tipo_documento='NIT' WHERE documento presente y tipo vacío`
   - `INSERT` contactos desde `contacto` con `NOT EXISTS`
   - `UPDATE` snapshots en compras donde `proveedor_nombre_snapshot IS NULL`
3. Verificar conteos §5.

**Precondiciones:** backup; MySQL InnoDB; `proveedores` y `compras` existen.  
**Rollback manual:** no hay down-script; restaurar backup. Borrar columnas/tablas nuevas solo si no hay datos dependientes.  
**Flyway automático:** **NO IMPLEMENTADO** — fase de infraestructura pendiente. **NO** cableado en 10-C.

---

## 3. Backfill

| Regla | Resultado en `solarfishdb_v17_val` |
|-------|-------------------------------------|
| Doc → `tipo_documento=NIT` | **PRUEBADO** |
| Sin doc → sin NIT inventado | **PRUEBADO** |
| `contacto` → `ContactoProveedor.nombre` COMERCIAL principal | **PRUEBADO** |
| Sin inventar tel/email/cargo | **PRUEBADO** (NULL) |
| Snapshot nombre/documento desde proveedor vivo | **PRUEBADO**; doc NULL si proveedor sin doc |

---

## 4. Snapshots históricos

Cubierto por `ProveedorServiceTest.snapshotNoCambiaConRenombre` (**PRUEBADO**):

1. Crear compra → snapshot = razón social/NIT al crear  
2. Renombrar proveedor  
3. Consultar compra → nombre histórico **inalterado**

DTO Compra/Devolución priorizan snapshot sobre join vivo.

---

## 5. Contactos

Cubierto por tests + contrato service (**PRUEBADO**):

| Caso | Resultado |
|------|-----------|
| Un / varios contactos | OK |
| Dos principales activos | bloqueado |
| Desactivar contacto | permanece; no borra proveedor |
| Desactivar proveedor | contactos no se borran |
| PUT `contactos == null` | no modifica set |
| PUT con lista | sync retenidos/nuevos/removidos |

---

## 6. NIT

**PRUEBADO** (`ProveedorServiceTest` + `normalizarNit`):

- Alta: razón social + NIT obligatorios  
- Normalización: quita espacios, puntos y guiones → dígitos  
- `900.123.456-7` ≡ `9001234567` → duplicado bloqueado  
- Cliente NIT = Proveedor NIT: **permitido** (sin `esProveedor`, sin FK cruzada)

---

## 7. Activo / inactivo + Compra

**PRUEBADO** en `ProveedorServiceTest.compraConProveedorInactivo`:

| Caso | Resultado |
|------|-----------|
| Activo → nueva compra | permitido |
| Inactivo → nueva compra | bloqueado |
| Compra previa → desactivar → completar | permitido |
| Reactivar vía PUT `activo=true` | soportado por API |

---

## 8. Inventario y costos

**PRUEBADO** vía `CompraServiceTest`, `AjusteCostoInventarioTest`:

- Flujo Compra → `PoliticaCosteoInventario` → `costoActual` → `InventarioService` → movimiento `COMPRA` intacto  
- `DetalleCompra.costoUnitario` no se reescribe  
- Sin cambio de política de costeo

---

## 9. Devoluciones

**PRUEBADO:** `DevolucionCompraServiceTest` — 16 tests, 0 fallos.  
`DevolucionCompraResponseDTO` prioriza snapshot de compra.

---

## 10. Analytics

**PRUEBADO:** `InventarioComprasAnalyticsServiceTest` — 17 tests, 0 fallos (gasto por proveedor, devoluciones, filtros).

**LIMITACION:** agregados usan `pr.nombre` **vivo** del maestro. Renombrar proveedor cambia etiqueta en analytics históricos; compras individuales conservan snapshot. **NO** se amplió Analytics en 10-C (fase futura si se requiere snapshot en BI).

---

## 11. API Proveedor

**HECHO / PRUEBADO** (tests service + contrato controller):

`GET/POST/PUT/DELETE /api/v1/proveedores`, `GET .../buscar`, ADMIN, DTOs (no entidades), contactos nested, validaciones NIT/razón social/principal.

---

## 12. Frontend

**PRUEBADO** / **HECHO:**

- Rutas `/proveedores`, `/nuevo`, `/:id`, `/:id/editar` — sin `comingSoon`  
- Specs UI + list + compra + cliente: **29 SUCCESS**  
- Sin rediseño; sin defectos visuales bloqueantes detectados en tests

---

## 13. Builds

| Build | Estado |
|-------|--------|
| Backend `mvn -DskipTests package` | **BUILD SUCCESS** (EXIT 0) |
| Frontend `ng build --configuration=production` | **BUILD SUCCESS** (EXIT 0; warning budget bundle **PREEXISTENTE**) |

---

## 14. Tests (suite 10-C registrada)

| Suite | Tests | Failures | Errors | Skipped | Time (s) |
|-------|------:|---------:|-------:|--------:|---------:|
| ProveedorServiceTest | 9 | 0 | 0 | 0 | 0.642 |
| CompraServiceTest | 5 | 0 | 0 | 0 | 0.857 |
| DevolucionCompraServiceTest | 16 | 0 | 0 | 0 | 2.191 |
| InventarioComprasAnalyticsServiceTest | 17 | 0 | 0 | 0 | 34.735 |
| AjusteCostoInventarioTest | 8 | 0 | 0 | 0 | 1.970 |
| **TOTAL backend suite** | **55** | **0** | **0** | **0** | **~40.4** |

Frontend (proveedor + compra + cliente relacionados): **29 / 29 SUCCESS** (~0.82 s Karma).

---

## 15. Hallazgos

1. **RIESGO — V17 no idempotente** si Hibernate ya aplicó columnas → `ERROR 1060`. Mitigación: procedimiento Caso B (§2).  
2. **LIMITACION — Analytics nombre vivo** vs snapshot en Compra.  
3. **HECHO — `solarfishdb` vacía** de datos comerciales; backfill real validado en `solarfishdb_v17_val`.  
4. **PREEXISTENTE — Flyway** no cableado.

## 16. Correcciones

| Ítem | Acción |
|------|--------|
| Código Java/TS | **Ninguna** (sin defecto funcional reproducido) |
| `solarfishdb` índices V17 | **CORREGIDO** (ops: índices residuales creados) |
| Migraciones históricas | **No modificadas** |

---

## 17. Riesgos residuales

- Despliegues donde solo corrió Hibernate: deben aplicar residual, no V17 crudo.  
- Históricos sin NIT: no editables vía API hasta completar identificación (contrato 10-B).  
- PUT con lista vacía de contactos borra contactos (sync completo documentado).

## 18. Limitaciones / NO IMPLEMENTADO

IVA, FE proveedor, CxP, pagos, multi-moneda, OC independiente, ProductoProveedor, Flyway automático, Analytics por snapshot.

---

## 19. Criterios de aceptación

| Criterio | Estado |
|----------|--------|
| V17 validada MySQL equivalente TEST | ✅ `solarfishdb_v17_val` |
| Datos históricos no perdidos / backfill | ✅ |
| Contactos legacy migrados | ✅ |
| Snapshots validados | ✅ |
| NIT / duplicados / principal único | ✅ |
| Cliente ≠ Proveedor | ✅ |
| Compra activa/inactiva | ✅ |
| Inventario / costos / devoluciones / analytics | ✅ |
| API + FE | ✅ |
| Tests BE/FE + builds | ✅ |
| Documentación | ✅ este archivo |

---

## 20. Estado final

**PASS WITH RISKS**

Riesgo principal documentado y mitigado operativamente: **ejecución de V17 en esquemas ya actualizados por Hibernate**.

---

## Informe final (brief)

### Estado
PASS WITH RISKS

### Migración
V17 correcta en BD FASE 1; no reejecutable cruda sobre `solarfishdb` post-Hibernate; residual de índices aplicado en TEST.

### Datos
Validación con 4 proveedores / 3 compras en `solarfishdb_v17_val`; `solarfishdb` sin filas comerciales.

### Backend / Frontend / Compra / Inventario / Costos / Devoluciones / Analytics
Integridad confirmada por suite 55 + 29; snapshot Compra OK; analytics nombre vivo = limitación conocida.

### Tests / Builds
55 backend PASS · 29 frontend PASS · package SUCCESS · production build al cierre.

### Hallazgos / Correcciones
Sin bug de aplicación; ops residual índices; documentar Caso B V17.

### Riesgos / Limitaciones
V17 no idempotente; analytics vivo; sin Flyway; NO-GOALS intactos.

### Conclusión
Módulo **Proveedores 3.15.10** cerrado formalmente para uso; siguientes fases de Compras enriquecidas quedan fuera de alcance.

---

*Fin FASE 3.15.10-C*
