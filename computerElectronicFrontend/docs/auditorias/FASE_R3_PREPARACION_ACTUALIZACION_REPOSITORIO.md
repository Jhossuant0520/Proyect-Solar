# FASE R3 — Preparación de actualización y recuperación del versionamiento

**Fecha:** 2026-11-17  
**Remoto:** `https://github.com/Jhossuant0520/Proyect-Solar.git` (sin push)  
**Rama de actualización:** `update/computer-electronic-current-version`  
**Rama `main`:** no modificada en remoto; tip local de `main` intacto como ancestro  
**Estado:** lista para revisión; **pendiente aprobación** antes de push / merge / publicación

---

## 1. Protección previa

| Chequeo | Resultado |
|---------|-----------|
| Raíz Git | `C:/Users/Jhossuan C/Documents/Computer&Electronic` |
| `computerElectronicFrontend/` | Existe |
| `computerElectronicBackend/` | Existe |
| `projectSolvixFrontend/` / `Backend/` | Ausentes en disco (solo en index previo) |

### Respaldo completo (fuera del repo)

`C:\Users\Jhossuan C\Documents\ComputerElectronic-backups\pre-R3-20261117-154724`

Incluye: frontend, backend, `.github`, `design-system`, `.cursor`, `.gitignore`, manifiesto.  
Excluidos regenerables: `node_modules`, `dist`, `target`, `.angular`, `*.log`.  
Tamaño aprox.: **155 MB**. No sobrescrito ni eliminado.

---

## 2. Rama y comandos ejecutados (resumen)

```text
git checkout -b update/computer-electronic-current-version
# actualización workflows + regla Cursor de rutas
git -c diff.renames=true -c diff.renameLimit=9999 add -A
# validaciones FE/BE (ver §6)
# commit local en la rama de actualización (sin push)
```

No se ejecutó: `push`, `merge` a `main`, `reset --hard`, `clean`, rewrite de historial, cambios Cloudflare/DNS/producción.

---

## 3. Incorporación de estructura

### Detección de renombrados (index staged / commit)

| Tipo | Cantidad |
|------|----------|
| Renames (`R`) | **1038** |
| Adds (`A`) | **86** |
| Deletes (`D`) | **74** |
| Mods (`M`) | **4** |
| Total entradas | **1202** |

Git reconoció de forma masiva `projectSolvixFrontend|Backend` → `computerElectronicFrontend|Backend` (muchos `R100`).

### Contenido principal

- Árbol actual Computer & Electronic (FE + BE).
- Eliminación lógica de rutas antiguas `projectSolvix*` (vía rename/delete).
- `.gitignore` reforzado (secretos locales).
- Workflows CI/CD alineados.
- Regla `.cursor/rules/design-constitution.mdc` con rutas CE.

### Secretos

Escaneo previo al stage: sin `.env` reales, sin `application-local.properties` (solo `.example` / `.env.example`).  
Secrets FTP de Actions: solo referencias `${{ secrets.* }}` (sin valores).

---

## 4. Verificación de integridad (sin cambios cosméticos de código)

### Frontend

| Ítem | Estado |
|------|--------|
| Angular 20 / standalone | Presente |
| `src/`, styles, design system | Versionados en la rama |
| Environments / API config | Incluidos |
| Specs | Incluidos |
| Build producción | **OK** → `dist/computerElectronicFrontend` |
| Suite | **488 SUCCESS** |

### Backend

| Ítem | Estado |
|------|--------|
| Java 21 / Spring Boot | Presente |
| Paquete `projectComputerElectronicBackend` | Presente |
| Seguridad, entidades, servicios, migraciones | Incluidos |
| `mvn -B clean test` | **BUILD SUCCESS — 447 tests, 0 failures** |
| Servidor PC2 | No detenido / no modificado |

---

## 5. GitHub Actions actualizados

### `deploy-test.yml`

| Antes | Después |
|-------|---------|
| `working-directory: ./projectSolvixFrontend` | `./computerElectronicFrontend` |
| `cache-dependency-path: …/projectSolvixFrontend/…` | `…/computerElectronicFrontend/…` |
| `dist/projectSolarFishFrontend/browser` | `dist/computerElectronicFrontend/browser` |
| `local-dir: ./projectSolvixFrontend/dist/…` | `./computerElectronicFrontend/dist/computerElectronicFrontend/browser/` |
| Limpieza FTP legacy `projectSolarFishFrontend` | Conserva legacy + añade `computerElectronicFrontend` |

Secrets referenciados (sin valores): `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.

### `maven-ci.yml`

| Antes | Después |
|-------|---------|
| Nombre “Solvix Backend” | “Computer & Electronic Backend” |
| paths `projectSolvixBackend/**` | `computerElectronicBackend/**` |
| `working-directory: projectSolvixBackend` | `computerElectronicBackend` |

---

## 6. Validaciones ejecutadas

| Validación | Resultado |
|------------|-----------|
| `ng test --no-watch` (ChromeHeadless) | **488 SUCCESS** |
| `ng build --configuration=production` | **OK** |
| `mvn -B clean test` (backend) | **447 SUCCESS / BUILD SUCCESS** |
| `npm ci` en CI | No reejecutado localmente (dependencias ya instaladas); workflow usa `npm ci` |

---

## 7. Revisión final

| Criterio | Estado |
|----------|--------|
| Archivos esenciales sin seguimiento | No (tras `add -A` en la rama) |
| Secretos incorporados | No detectados |
| Workflows → rutas existentes | Sí |
| Identidad CE preservada | Sí |
| Historial Git anterior | Intacta (commit nuevo encima de `main`) |
| Push / merge | **No realizados** |
| Rama lista para revisión | **Sí** |

### Estado Git esperado al cierre

```text
branch: update/computer-electronic-current-version
based on: main (ae02a11 …)
remote: origin → Proyect-Solar (sin push de esta rama)
```

---

## 8. Próximos pasos (requieren aprobación explícita)

1. Revisar el commit / diff de la rama.
2. `git push -u origin update/computer-electronic-current-version`
3. Abrir PR hacia `main` (o merge acordado).
4. Verificar Actions con paths nuevos.
5. Solo después: fases de rename GitHub / sync PC2 / deploy.

---

## 9. Recuperación

- Restaurar desde: `Documents\ComputerElectronic-backups\pre-R3-20261117-154724`
- Descartar la rama local (si se rechaza): `git checkout main` y borrar la rama de update (sin `clean` del working tree sin backup).
- No usar `reset --hard` sobre trabajo no respaldado.
