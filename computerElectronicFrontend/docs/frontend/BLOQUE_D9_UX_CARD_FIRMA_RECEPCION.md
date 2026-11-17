# SOLVIX Frontend — BLOQUE D.9
## UX card de firma de recepción (limpieza visual)

**Fecha:** 2026-09-29  
**Alcance:** diálogo de recepción + refinamiento visual del `solvix-signature-pad`.  
**Sin cambios:** lógica de firma, canvas/export D.7, endpoints, workflow, listado Servicios, entrega.

---

### 1. Problema UX

La card de firma tenía demasiado texto descriptivo y se percibía poco refinada. La frase larga de conformidad restaba foco a la acción de firmar.

---

### 2. Texto eliminado (UI)

- “El cliente confirma la entrega del equipo al taller para diagnóstico o servicio…”
- “La firma es manuscrita en pantalla…”
- “Quien entrega declara dejar el equipo en custodia…”
- “Firma con mouse, dedo o stylus…”
- Checkbox largo → reemplazado por **“Confirmo la recepción”**
- Checklist “Antes de registrar” (ruido)

---

### 3. Estructura resultante

```text
Recepción del equipo
Firma del cliente

Cliente / Equipo / Problema (compacto)

☑ Confirmo la recepción
Nombre · Documento

┌ Firma ─────────────────────┐
│  [canvas blanco / trazo negro D.7] │
│  Sin firma          [Limpiar]      │
└────────────────────────────────────┘

[Cancelar]  [Confirmar recepción]
```

---

### 4. Mejora visual

- Card `.firma-card` compacta con borde sutil
- Pad: borde sólido (no dashed), fondo blanco D.7
- Botón primario: **Confirmar recepción**
- Menos tipografía secundaria

---

### 5. Responsive

Mobile: grid a 1 columna; acciones apiladas; canvas ≥220px en pad.

---

### 6. Tests / build

```bash
npx ng test --include=**/servicio-recepcion-dialog.spec.ts --include=**/solvix-signature-pad.spec.ts --browsers=ChromeHeadless --watch=false
npx ng build
```

---

### 7. Impacto

Solo presentación. D.7 y D.1 intactos. PDF: ver doc backend D.9.
