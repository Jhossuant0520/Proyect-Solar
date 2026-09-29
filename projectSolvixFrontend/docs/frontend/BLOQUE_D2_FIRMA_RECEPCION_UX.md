# SOLVIX Frontend — BLOQUE D.2
## Firma digital de recepción — UX

**Fecha:** 2026-09-29  
**Alcance:** wizard de nueva OT + modal de firma de recepción + feedback D.1.  
**Sin cambios** al listado Servicios ni al flujo de entrega salvo reutilizar el pad de firma.

---

### 1. Flujo UX

```text
Wizard paso 1 Cliente
  → paso 2 Equipo
  → paso 3 Recepción (problema / observaciones)
  → «Continuar a firma»
  → modal ServicioRecepcionDialog
       confirmación + nombre + firma canvas
  → «Confirmar recepción firmada» (solvix-button loading)
  → éxito: snack «Recepción registrada»
  → navega a detalle OT con esperarComprobante=1
       (panel documentos revela comprobante vía D.1 existente)
```

---

### 2. Reutilización de firma

Nuevo componente compartido:

`src/app/shared/components/solvix-signature-pad/solvix-signature-pad.ts`

- Canvas touch/mouse
- Limpiar
- Emite `firmadoChange` / `firmaBase64Change`
- Mismos colores tema claro/oscuro que entrega

Usado en:

- `servicio-recepcion-dialog` (nuevo)

El diálogo de **entrega** conserva su canvas interno (estable).  
Extracción mínima: pad reutilizable sin refactor grande de entrega.

---

### 3. Estados

| Estado UI | Comportamiento |
|---|---|
| Sin confirmación / sin firma | Botón disabled + mensaje |
| Enviando | `solvix-button [loading][disabled]` |
| Error backend | `role="alert"` visible: «No se pudo registrar la recepción.» |
| Éxito | Cierra modal → feedback D.1 → detalle |

---

### 4. Feedback D.1

Tras éxito:

```ts
feedback.success('Recepción registrada');
```

El comprobante se espera con el flujo ya existente `esperarComprobante` + `SolvixActionRevealService` en el panel de documentos (scroll condicional + highlight).

Un solo toast principal; el estado del documento aparece en UI.

---

### 5. Error handling

- Validación local: confirmación, firma, nombre  
- Error HTTP: `mensajeErrorServicio` / copy «No se pudo registrar la recepción.»  
- Modal no se cierra en error; loading se libera  

---

### 6. Responsive

Diálogo `maxWidth: 96vw`, estilos alineados a entrega:

- Mobile: canvas 220px, acciones en columna  
- Touch: `touch-action: none` + Pointer Events  

---

### 7. Accessibility

- `aria-label` en canvas  
- Checklist de requisitos antes de confirmar  
- Errores con `role="alert"`  
- Focus visible en inputs  

---

### 8. Tests

- `servicio-form.spec.ts` — abre diálogo, feedback, navegación  
- `servicio-recepcion-dialog.spec.ts` — firma vacía, confirmación, éxito, error  

---

### Contrato create

`OrdenServicioRequestDTO` incluye:

- `clienteConfirmoRecepcion`
- `nombreFirmanteRecepcion`
- `documentoFirmanteRecepcion`
- `firmaBase64Recepcion`

`GET /{id}/recepcion` tipado en FE (`RecepcionOrdenServicioResponseDTO`).
