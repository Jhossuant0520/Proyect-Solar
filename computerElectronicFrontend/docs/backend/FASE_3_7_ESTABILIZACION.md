# SOLVIX — FASE 3.7
## Estabilización y calidad del backend

**Fecha:** 2026-09-11  
**Alcance:** deuda técnica del analizador Java. Sin cambios funcionales.

---

## 1. Objetivo

Reducir warnings reales (deprecaciones y NPE analizables) y explicar el ruido del IDE, sin cambiar reglas de negocio, contratos HTTP, fórmulas, inventario, costeo ni seguridad funcional.

---

## 2. Estado inicial

El reporte del Problems panel de Cursor no era una falla de `mvn`. Eran avisos del analizador (severidad warning).

Cada hallazgo aparecía **dos veces**, con `owner: java` y `owner: java7`, misma línea y mismo código. Esa duplicación no era un bug del código.

Tipos únicos encontrados:

| Tipo | Dónde | Clasificación |
|------|--------|----------------|
| `Specification.where` deprecado desde Spring Data 3.5 | 6 `*Specifications.java` | API deprecada, corregible sin cambiar semántica |
| `StringUtils.trimWhitespace` deprecado desde Spring 6.0 | `JwtAuthFilter` | API deprecada. No sustituir por `trimAllWhitespace` |
| Posible NPE `getContentType()` | `FotoPerfilService` | Falso positivo del analizador (doble llamada). Mejora local segura |
| Posible NPE `costoHistorico` | `DevolucionCompraService` | No hay NPE hoy. El analizador no estrecha un `boolean`. Alineado el `if` al null real |
| Null type safety / unchecked `@NonNull` | Analytics, servicios, tests (mayoría) | Falsos positivos de Eclipse null analysis + method references + Lombok + Spring Data |

Versión real usada por el build:

- Spring Boot **3.5.3**
- Spring Data JPA **3.5.1** (`spring-data-bom` 2025.0.1)

En 3.5.1 **no existe** `Specification.unrestricted()`. Sí existe `Specification.allOf(...)` (desde 3.0), que combina con AND y no está deprecado en nuestro código.

---

## 3. Warnings corregidos

### `Specification.where`

- **Archivos:** `CompraSpecifications`, `VentaSpecifications`, `ProductoSpecifications`, `DevolucionCompraSpecifications`, `DevolucionVentaSpecifications`, `MovimientoInventarioSpecifications`
- **Problema:** `Specification.where(...).and(...)` deprecado desde 3.5, marcado para eliminación en 4.0
- **Solución:** `Specification.allOf(...)`
- **Razón:** los predicados de filtro nunca son `null`; el parámetro ausente ya se traduce a `cb.conjunction()` dentro de cada predicado. `allOf` aplica AND en el mismo orden. No hay OR. La semántica de búsqueda no cambia.

### `StringUtils.trimWhitespace`

- **Archivo:** `JwtAuthFilter`
- **Problema:** método deprecado
- **Solución:** `String.strip()` sobre el nombre de rol, conservando `null`
- **Razón:** `trimWhitespace` recorta solo extremos con `Character.isWhitespace` y no toca espacios internos. `strip()` hace lo mismo. `trimAllWhitespace` se rechazó porque borraría espacios internos y podría cambiar el rol. `String.trim()` no es equivalente (solo ASCII `<= ' '`). `StringUtils.hasText` se mantiene para decidir si el rol es autorizable.

### `FotoPerfilService.getContentType()`

- **Problema:** el analizador veía `getContentType()` posiblemente null en la misma expresión donde ya se comprobaba null (segunda llamada)
- **Solución:** guardar el resultado en una variable y solo entonces hacer `toLowerCase`
- **Razón:** misma semántica (null → cadena vacía → tipo rechazado). Elimina la carrera teórica entre dos llamadas.

### `DevolucionCompraService.costoHistorico`

- **Problema:** warning de NPE en `costoHistorico.multiply(...)` dentro de `if (costoConocido)`
- **Solución:** el `if` ahora pregunta `costoHistorico != null` directamente
- **Razón:** `costoConocido` ya era `costoHistorico != null`. Eclipse no estrecha el tipo a partir de un boolean. El camino null sigue marcando `costoCompleto = false` y **no** convierte null en 0.

---

## 4. Warnings descartados como falsos positivos

La masa de avisos `Null type safety` / `unchecked conversion to @NonNull` (servicios de Analytics, `ProductoService`, `VentaService`, `CompraService`, tests, `GrantedAuthority::getAuthority`).

Por qué no se tocaron:

- Eclipse null analysis no demuestra no-nulidad en method references, Lombok y APIs de Spring Data.
- No hay NPE reproducible detrás de esos avisos.
- Silenciarlos con `@SuppressWarnings`, `Optional` extra, casts o cambios de firma pública no corrige un riesgo; solo tapa el IDE.

---

## 5. Warnings que permanecen

Siguen los de null-safety masivos descritos arriba.

También puede quedar un aviso de conversión `@NonNull File` en `FotoPerfilService` (`destino.toFile()` hacia `transferTo`). No se cambió: no hay evidencia de NPE y alterar esa línea no aporta seguridad real.

No se persiguió “0 warnings”.

---

## 6. Deprecaciones corregidas

| API | Reemplazo | Equivalencia |
|-----|-----------|----------------|
| `Specification.where` | `Specification.allOf` | AND de predicados no nulos, mismos filtros |
| `StringUtils.trimWhitespace` | `String.strip()` | solo extremos; espacios internos intactos; null se conserva |

No se usó `Specification.unrestricted()` porque **no está** en Spring Data JPA 3.5.1.

---

## 7. Null-safety

### FotoPerfilService

`MultipartFile.getContentType()` puede ser null. El código ya lo trataba como tipo inválido. El warning venía de llamar dos veces al getter en el ternario. Corregido sin cambiar la regla de tipos permitidos (JPG, PNG, WEBP).

### DevolucionCompraService

Cadena revisada:

1. `costoHistorico = detalleCompra.getCostoUnitario()` (costo de la línea de compra, no el costo actual del catálogo).
2. `costoConocido = costoHistorico != null`.
3. Si es null, no se suma al costo devuelto y `costoCompleto` queda false (`COSTO_INCOMPLETO` / `costoCompletoConocido = false`).
4. Null **no** se convierte en cero ni se inventa un costo histórico.

Conclusión: no había NPE real mientras `costoHistorico` no se reasignara entre la bandera y el `multiply`. El cambio deja esa garantía visible para el compilador, sin alterar la semántica.

---

## 8. Configuración del IDE

**Causa de `java` + `java7`:** el Language Support for Java (Red Hat) arranca en modo **Hybrid**. El syntax server ligero y el language server completo publican el mismo aviso con owners distintos. No hay dos copias del proyecto.

**Cambio aplicado** en la configuración de usuario de Cursor (no en el código ni en Maven):

```json
"java.server.launchMode": "Standard"
```

Efecto: un solo analizador. El build de Maven no cambia. Hay que recargar la ventana de Cursor para que deje de duplicar avisos.

No se desactivó el null analysis de Eclipse. Eso ocultaría avisos sin corregirlos.

---

## 9. Validación

- `mvn test` — **BUILD SUCCESS**
- Tests run: **122**, Failures: **0**, Errors: **0**, Skipped: **0**
- Incluye JWT (`JwtAuthFilterTest`), productos, ventas, compras, devoluciones, analytics e inventario

No se modificaron tests.

---

## 10. Impacto funcional

No se modificaron reglas de negocio ni contratos funcionales.

---

## 11. Estado final

- Deprecaciones propias corregidas: `Specification.where` (6 archivos) y `trimWhitespace` (1).
- NPE revisados: `getContentType` y `costoHistorico`.
- Duplicación artificial del IDE: configurada para no repetirse (requiere recarga de ventana).
- Permanecen los falsos positivos de null analysis de Eclipse. No se silenciaron.
