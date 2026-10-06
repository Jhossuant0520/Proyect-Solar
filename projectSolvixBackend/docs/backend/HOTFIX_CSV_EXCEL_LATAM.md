# SOLVIX — HOTFIX CSV REPORTES (Excel LATAM)

**Fecha:** 2026-10-06  
**Alcance:** solo `ReportCsvExportService` (+ tests / docs de contrato)

## Causa

El generador usaba `,` como delimitador. Excel con separador de listas regional `;` (es-CO / Latinoamérica) interpreta cada línea como una sola columna.

## Solución

`COLUMN_SEPARATOR = ';'`, manteniendo UTF-8 + BOM, extensión `.csv`, escape de `;`, `,`, `"`, saltos de línea, y valores numéricos sin formato visual.

## Verificación Excel

- Formato comprobado por tests (cabecera `section;metrica;valor;estado`, filas KPI, escape).
- Apertura manual en Excel de escritorio: **no ejecutada en este entorno**.
