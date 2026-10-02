# SOLVIX Backend — BLOQUE D.13
## Sincronización sección técnica ↔ workflow ↔ consulta pública

**Fecha:** 2026-10-01  
**Alcance:** `completarDiagnostico` + historial + consulta OT pública.  
**Sin cambios:** matriz de estados (salvo ampliar orígenes válidos del endpoint existente), QR/token, PDF, cotizaciones, inventario, listado.

---

### 1. Bug

El técnico podía abrir la sección técnica en **RECEPCIONADO**, completar diagnóstico (y hasta trabajo) y **Guardar**.

- Los textos se persistían vía `PUT actualizar`
- El estado **permanecía RECEPCIONADO**
- Sin historial de diagnóstico
- El QR/consulta pública seguía en etapa **RECEPCION** (mensaje genérico de taller)

Datos técnicos y workflow desincronizados.

---

### 2. Escenario que lo reproduce

1. OT en RECEPCIONADO  
2. Entrar a sección técnica (sin pulsar “Iniciar diagnóstico”)  
3. Completar diagnóstico (+ opcional trabajo)  
4. Guardar  
5. Antes: estado RECEPCIONADO + datos llenos  
6. QR: etapa recepción / mensaje genérico

---

### 3. Causa raíz

| Capa | Comportamiento previo |
|------|------------------------|
| FE | `guardarTextos` solo llamaba `completarDiagnostico` si `estado === EN_DIAGNOSTICO` |
| FE | En RECEPCIONADO usaba `actualizar` (sin transición) |
| BE | `completarDiagnostico` rechazaba cualquier origen ≠ `EN_DIAGNOSTICO` |

---

### 4. Regla existente (sin inventar matriz)

```
RECEPCIONADO → EN_DIAGNOSTICO → DIAGNOSTICADO → COTIZADO → …
```

- Completar diagnóstico **no** salta cotización/aprobación  
- Trabajo realizado anticipado **no** implica `EN_REPARACION`  
- Motivos automáticos existentes se reutilizan

---

### 5. Cambio realizado

`OrdenServicioService.completarDiagnostico`:

1. Orígenes: **RECEPCIONADO** o **EN_DIAGNOSTICO**  
2. Si RECEPCIONADO: `aplicarTransicion` → EN_DIAGNOSTICO (motivo automático)  
3. Persiste diagnóstico + observaciones + `trabajoRealizado` opcional  
4. `aplicarTransicion` → DIAGNOSTICADO  
5. Misma `@Transactional` → datos + estados + historial coherentes  

DTO: campo opcional `trabajoRealizado`.

---

### 6–8. Transacciones / historial / consulta pública

- Una transacción de servicio  
- Historial: `RECEPCIONADO→EN_DIAGNOSTICO` y `EN_DIAGNOSTICO→DIAGNOSTICADO`  
- `EtapaPublicaOrdenServicio.desde(DIAGNOSTICADO)` → **DIAGNOSTICO** (ya existía; el fallo era el estado interno)

Nota: el texto *“Documento disponible en el taller”* pertenece a **consulta de documento** (`/consulta/documento/:token`), no a la OT. No se cambió; el QR de OT refleja etapa vía `estadoCodigo` corregido.

---

### 9. Tests

- `OrdenServicioServiceTest`: desde RECEPCIONADO; con trabajo sin saltar reparación; historial  
- `DocumentoOrdenServicioServiceTest`: consulta pública etapa DIAGNOSTICO tras completar desde RECEPCIONADO  

---

### 10. Regresión

- `completarDiagnostico` desde EN_DIAGNOSTICO sin cambios de contrato (trabajo opcional)  
- Matriz intacta  
- Cotización/aprobación siguen siendo el único camino a reparación
