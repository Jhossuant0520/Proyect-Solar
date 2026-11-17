---
name: ce-buttons
description: Applies Computer & Electronic official button families Cyber-Glow, Glass-Precision, and Tech-Minimal with PRIMARY, SECONDARY, TERTIARY, and DANGER. Use when creating or restyling buttons, CTAs, wizard actions, or when the user mentions botones CE, Cyber-Glow, Glass-Precision, or Tech-Minimal.
---

# Computer & Electronic — Buttons

Tres familias oficiales. Cada pantalla usa **una sola familia**. No mezclar.

Alcance: solo este frontend. No aplicar a otras marcas del monorepo.

## Elegir familia

| Familia | Cuándo |
|---------|--------|
| **Cyber-Glow** | Homepage, CTAs de conversión, acciones críticas en fondo oscuro |
| **Glass-Precision** | Sobre cards, glassmorphism, wizards, datos o esquemas |
| **Tech-Minimal** | Panel admin, tablas densas, instrumentación |

Si el usuario no elige, usar **Cyber-Glow** en marketing/público y **Tech-Minimal** en panel admin.

## Jerarquía (obligatoria)

- **PRIMARY** — una sola por vista
- **SECONDARY** — acción complementaria
- **TERTIARY** — acción menor / cancelar / ver más
- **DANGER** — destructiva

Labels en una sola línea. Palabras simples. Tiempo presente.

## Implementación Angular

No copiar Tailwind. Usar clases SCSS:

- Cyber-Glow: `btn-cyber-primary|secondary|tertiary|danger`
- Glass-Precision: `btn-glass-primary|secondary|tertiary|danger`
- Tech-Minimal: `btn-tech-primary|secondary|tertiary|danger`

Componente: `ce-button`. CSS canónico de referencia de la skill: [buttons.scss](buttons.scss). En la app, la fuente de estilos globales es `src/styles/_buttons.scss`.

Al aplicar en una pantalla:

1. Leer HTML/TS/SCSS existentes.
2. No tocar servicios ni API.
3. Reemplazar estilos de botón sueltos por estas clases.
4. Verificar hover, contraste y una sola línea.
5. Verificar responsive.

## Tokens extra de estas familias

Reutilizar la paleta CE (`--color-*` / `--ce-*`). Estos hex sí están permitidos en botones:

- Texto sobre primary sólido: `#001f29`
- Primary glow hover: `rgba(79, 209, 255, 0.6)`
- Danger: `#ffb4ab`, fondo `#93000a`, hover `#690005`, texto `#ffdad6`
- Tech surface: `#2e3447`, `#33394c`
- Tech primary fill: `#dce1fb` sobre `#0c1324`

No introducir más hex.
