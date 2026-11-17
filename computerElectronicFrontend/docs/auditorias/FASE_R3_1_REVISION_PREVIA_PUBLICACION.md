# FASE R3.1 — Revisión final previa a publicación

**Fecha:** 2026-11-17  
**Rama:** `update/computer-electronic-current-version`  
**Tip HEAD:** `433fd96` (doc R3)  
**Commit principal de actualización:** `a50b7a1`  
**Base:** `main` (`ae02a11` = `origin/main`)  
**Tipo:** revisión solo lectura (sin push, merge, reset ni clean)

---

## Conclusión

# APROBADO CON OBSERVACIONES

La rama contiene la actualización esperada (renombres CE + CI + identidad). No se detectaron secretos de producción versionados. Puede autorizarse el push de la rama tras aceptar las observaciones de §5.

---

## 1. Integridad del commit

| Comando / chequeo | Resultado |
|-------------------|-----------|
| `git status -sb` | `## update/computer-electronic-current-version` — **limpio** |
| `git log --oneline --decorate -5` | `433fd96` (HEAD) → `a50b7a1` → `ae02a11` (`main`/`origin/main`) |
| Cambios posteriores sin registrar | **Ninguno** |
| Rango `main...HEAD` | **1203** archivos · R **1038** · A **87** · D **74** · M **4** |
| `git diff --check main...HEAD` | Avisos de whitespace (EOF/trailing); no bloquean funcionalmente |

`git show HEAD` es solo el ajuste documental R3. El volumen de actualización está en **`a50b7a1`**. Para publicar, pushear el **tip** `433fd96` (incluye ambos).

### Mods explícitos (no rename)

- `.github/workflows/deploy-test.yml`
- `.github/workflows/maven-ci.yml`
- `.gitignore`
- `.cursor/rules/design-constitution.mdc`

### Deletes puros (muestra)

Retiro de módulos/legacy SOLVIX no migrados como rename (HSP, demanda-recibo, paneles, coming-soon, componentes `solvix-*` antiguos, etc.). Alineado con identidad Computer & Electronic; no se interpreta como borrado accidental del núcleo CE.

---

## 2. Workflows

### `deploy-test.yml`

| Aspecto | Estado |
|---------|--------|
| `working-directory` | `./computerElectronicFrontend` |
| npm cache path | `./computerElectronicFrontend/package-lock.json` |
| Artifact verify / dist | `dist/computerElectronicFrontend/browser` |
| `local-dir` FTP | `./computerElectronicFrontend/dist/computerElectronicFrontend/browser/` |
| Secrets | Solo `${{ secrets.FTP_* }}` (sin valores en el diff) |
| Triggers | Sin cambio: `push` → `main` + `workflow_dispatch` |

**Limpieza FTP (observación):** el job sigue borrando en la **raíz** del servidor entradas `assets`, `browser`, nombres legacy/CE y archivos `main*` / `polyfills*` / `styles*` / `chunk-*` / extensiones web. Comportamiento **preexistente**; R3 solo actualizó rutas. Riesgo residual de afectar contenido ajeno si el FTP root se comparte con otros sitios.

**Exclude:** mantiene `.well-known`, añade `computerElectronicFrontend/**` junto al legacy.

**No se ejecutó despliegue.**

### `maven-ci.yml`

| Aspecto | Estado |
|---------|--------|
| Nombre | Computer & Electronic Backend |
| `paths` | `computerElectronicBackend/**` |
| `working-directory` | `computerElectronicBackend` |
| Comando | `mvn -B clean test` (JDK 21) |

---

## 3. Archivos sensibles

| Hallazgo | Evaluación |
|----------|------------|
| `.env` real en el commit | **No** |
| `application-local.properties` en el commit | **No** (existe en disco local; **gitignored**, no tracked) |
| `.env.example` / `application-local.properties.example` | Plantillas; claves vacías |
| `application.properties` / `application-prod.properties` | Passwords/JWT vía **env-ref** `${…}` |
| `application-test.properties` | JWT/mail de **prueba hardcodeados** (solo perfil test) |
| `JwtUtil` / `JwtAuthFilter` / DTOs password | Código fuente, no secretos |
| `MysqlLocal.session.sql` | Sin keywords password/secret en contenido |
| Claves privadas / PEM / JKS / tokens `ghp_` / AWS | **No** detectados en grep de contenido |
| Valores de secretos | **No se muestran** en este informe |

---

## 4. Integridad del código

| Tipo de cambio | ¿Esperado? |
|----------------|------------|
| Renames masivos `projectSolvix*` → `computerElectronic*` | Sí |
| Adds de árbol CE actual (seguridad, tests, docs, audits, Ce*) | Sí |
| Deletes de módulos SOLVIX no usados en CE | Sí (identidad) |
| Ajustes CI + `.gitignore` + regla Cursor de rutas | Sí (R3) |
| Migraciones cosméticas nuevas / rediseño | **No** en esta revisión |

No se reejecutaron builds/tests en R3.1 (ya validados en R3: FE 488, BE 447, build prod OK).

---

## 5. Observaciones (no bloquean el push de la rama)

1. **Tip ≠ solo `a50b7a1`:** publicar `433fd96` (incluye informe R3).
2. **Whitespace** residual (`git diff --check`); limpieza opcional post-merge.
3. **FTP root cleanup** agresivo heredado; confirmar que el hosting TEST es exclusivo de este frontend antes del primer deploy tras merge.
4. **JWT de test** hardcodeado en `application-test.properties` (aceptable en test; no usar en prod).
5. **`application-local.properties` local** presente en disco pero no versionado — correcto; no incluir en futuros `git add -f`.

---

## 6. Acciones no realizadas

- No `git push`
- No merge a `main`
- No `reset` / `clean`
- No deploy / Cloudflare / DNS / producción

---

## 7. Checklist si se autoriza publicación

1. `git push -u origin update/computer-electronic-current-version`
2. Abrir PR hacia `main` y revisar Actions (paths CE).
3. Merge solo tras OK del PR.
4. Primer `workflow_dispatch` de deploy TEST con precaución por limpieza FTP.
5. Sync `origin` en PC2 / worktrees cuando corresponda.

**Esperando autorización explícita antes de cualquier push.**
