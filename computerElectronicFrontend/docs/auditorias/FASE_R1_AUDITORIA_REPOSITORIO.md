# FASE R1 — Auditoría de identidad y conexiones del repositorio

**Fecha:** 2026-11-17  
**Alcance:** monorepo local `Computer&Electronic` ↔ remoto GitHub  
**Tipo:** solo lectura (sin renombrado, sin commits, sin push, sin cambios de remoto)  
**Herramienta `gh`:** no disponible en este entorno → secrets/hooks/variables de GitHub quedan como **verificación manual**.

---

## 1. Estado Git

| Campo | Valor |
|-------|--------|
| Raíz del repo | `C:/Users/Jhossuan C/Documents/Computer&Electronic` |
| Remoto `origin` (fetch/push) | `https://github.com/Jhossuant0520/Proyect-Solar.git` |
| Nombre actual en GitHub | **Proyect-Solar** |
| Owner | `Jhossuant0520` |
| Rama actual | `main` |
| Tracking | `main` ↔ `origin/main` |
| Ahead / behind | `0 / 0` (commits; el working tree local **sí** diverge) |
| `origin/HEAD` | `origin/main` |
| Tags | ninguno |
| Staged | **0** |
| Worktrees | 1) este monorepo (`main`) · 2) `…/Solvix.worktrees/workspace-visibility-issues` (`agents/workspace-visibility-issues`) |

### Remotos y ramas

```text
origin  https://github.com/Jhossuant0520/Proyect-Solar.git (fetch)
origin  https://github.com/Jhossuant0520/Proyect-Solar.git (push)

* main                               ae02a11 [origin/main]
+ agents/workspace-visibility-issues 9f92b4b (otro worktree)
  remotes/origin/main
```

Últimos commits (`git log --oneline -10`): `ae02a11` … `2c6560b` (historial preservado en remoto; mensajes aún citan merges de `Proyect-Solar`).

---

## 2. Estado de versionamiento

### Index (archivos rastreados)

| Prefijo en el index | Archivos |
|---------------------|----------|
| `projectSolvixFrontend/` | **615** |
| `projectSolvixBackend/` | **497** |
| `.github/` | 2 |
| `.cursor/` | 1 |
| `design-system/` | 1 |
| `.gitignore` | 1 |
| **Total `git ls-files`** | **1117** |

### Working tree (disco)

| Carpeta | Existe en disco | En index | Untracked (`git ls-files -o`) |
|---------|-----------------|----------|-------------------------------|
| `projectSolvixFrontend/` | **No** | 615 | 0 |
| `projectSolvixBackend/` | **No** | 497 | 0 |
| `computerElectronicFrontend/` | **Sí** | **0** | **628** |
| `computerElectronicBackend/` | **Sí** | **0** | **495** |

### `git status` (resumen)

| Tipo | Cantidad aproximada |
|------|---------------------|
| Entradas porcelain | ~1115 |
| Borrados rastreados (` D`) | **1112** (rutas `projectSolvix*`) |
| Modificados rastreados | **1** (`.gitignore`) |
| Untracked | carpetas `computerElectronicFrontend/` + `computerElectronicBackend/` (**~1123** archivos) |
| Staged | 0 |

**Conclusión:** el trabajo activo vive en `computerElectronic*` y **no está versionado**. El index sigue apuntando a `projectSolvix*`, que ya no existen en disco. Git interpreta esto como borrado masivo + untracked masivo (renombrado de carpetas **no** registrado con `git mv` / commit).

---

## 3. Integridad frontend y backend

### Frontend (`computerElectronicFrontend`)

| Chequeo | Resultado |
|---------|-----------|
| `src/` versionado | **No** — **0** en index; **487** untracked bajo `src/` |
| `package.json` en index | Solo `projectSolvixFrontend/package.json` (ruta ausente en disco) |
| Nombre npm actual | `computer-electronic-frontend` |
| `outputPath` Angular | `dist/computerElectronicFrontend` |
| Crítico no versionado | `src/**`, `angular.json`, estilos, tests, docs de auditoría recientes |

**Confirmado el hallazgo de la auditoría visual:** el `src/` del frontend aparece (y es) mayormente untracked.

### Backend (`computerElectronicBackend`)

| Chequeo | Resultado |
|---------|-----------|
| `src/` versionado | **No** — **0** en index; **435** untracked bajo `src/` |
| `pom.xml` en index | Solo `projectSolvixBackend/pom.xml` (ausente en disco) |
| Nombre Spring (`application.properties`) | `computerElectronicBackend` |
| Crítico no versionado | código Java, recursos, Flyway/tests locales |

### CI vs disco

Los workflows siguen rutas **antiguas**:

- `.github/workflows/deploy-test.yml` → `./projectSolvixFrontend`, artifact `dist/projectSolarFishFrontend/browser/`
- `.github/workflows/maven-ci.yml` → `projectSolvixBackend/**`

Con el árbol actual, un push de `main` **sin** reintroducir `projectSolvix*` o actualizar workflows **rompería** deploy/CI.

### `.gitignore`

Cambio local no commiteado: amplía secretos (`.env.*`, `application-local.properties`). Correcto para higiene; no explica el untracked de `src/`.

---

## 4. Remotos y ramas (detalle operativo)

- Un solo remoto: `origin` → `Proyect-Solar`.
- Rama principal remota: `main`.
- No hay tags que renombrar.
- Worktree extra bajo `Solvix.worktrees` puede quedar con URL antigua tras el rename de GitHub (GitHub redirige, pero conviene actualizar `origin` explícitamente).

---

## 5. Referencias a la URL / nombres anteriores

### Dependientes de la URL GitHub (actualizar tras rename)

| Ubicación | Tipo | Notas |
|-----------|------|--------|
| Remoto `origin` en cada clon | **URL** | Obligatorio |
| Mensajes de commit / merges históricos | Historial | No reescribir |
| `docs/auditorias/AUDITORIA_REGRESION_VISUAL_…` | Mención documental | Opcional |

`package.json` del frontend **no** declara campo `repository`/`homepage` con la URL GitHub.

### Dependientes de rutas de carpeta (bloquean CI; no son la URL)

| Archivo | Referencia |
|---------|------------|
| `.github/workflows/deploy-test.yml` | `projectSolvixFrontend`, `projectSolarFishFrontend`, secrets FTP |
| `.github/workflows/maven-ci.yml` | `projectSolvixBackend` |
| `.cursor/rules/design-constitution.mdc` (raíz) | texto `projectSolvixFrontend/Backend` / “monorepo Solvix” |

### Menciones históricas SOLVIX / SolarFish (no tocar en R1)

- Docs bajo `computerElectronicFrontend/docs/frontend/*`, `docs/arquitectura/*`, outs `*-out.txt`, `package-lock.json` name legacy `projectSolarFishFrontend`, paquetes Java `projectSolvixBackend` / `projectComputerElectronicBackend` en código.
- Son identidad de producto/código o documentación histórica; **no** equivalen a la URL del repo.

No se modifica documentación histórica en esta fase.

---

## 6. Integraciones identificadas

### Confirmadas en el repo (evidencia en archivos)

| Integración | Evidencia | Impacto del rename |
|-------------|-----------|-------------------|
| GitHub Actions — Deploy Angular TEST | `deploy-test.yml` on `push` → `main` | Sigue al repo renombrado; **rutas de carpeta** deben alinearse aparte |
| GitHub Actions — Maven CI | `maven-ci.yml` paths `projectSolvixBackend/**` | Idem |
| Secrets (nombres) | `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` | Persisten en el mismo repo; **no** se leyeron valores |
| Deploy FTPS | `SamKirkland/FTP-Deploy-Action` | Independiente del nombre del repo si secrets OK |

### Requieren verificación manual en GitHub (sin `gh` aquí)

- Lista completa de Actions secrets / variables.
- Webhooks (Cloudflare, hosting, chatops, etc.).
- Environments / deployment protection rules.
- Apps de GitHub instaladas (Dependabot, Copilot, etc.).
- Páginas, Packages, Codespaces.
- Cloudflare / DNS / Pages ligados a la URL del repo.
- Tokens PAT o deploy keys en la PC secundaria (k6) y en CI externos.

**No se muestran secretos ni valores.**

---

## 7. Riesgos

| Riesgo | Severidad | Detalle |
|--------|-----------|---------|
| Código CE no versionado | **Crítica** | Pérdida de trabajo si se limpia el WT o se clona de nuevo desde `origin` |
| Rename GitHub sin estabilizar paths | Alta | CI/deploy apuntan a carpetas inexistentes |
| Confundir rename de repo con rename de carpetas | Alta | Son dos operaciones; el rename de GitHub **no** versiona `computerElectronic*` |
| Worktree / PC k6 con `origin` viejo | Media | Mitigado por redirect de GitHub; mejor `set-url` explícito |
| Reescritura de historial | Alta (evitar) | No usar filter-repo solo por el rename de GitHub |
| Documentación histórica SOLVIX | Baja | No actualizar en masa en R1 |

---

## 8. Plan de renombrado (propuesta; **no ejecutado**)

### 8.1 Nombre definitivo recomendado

| | Valor |
|--|--------|
| Actual | `Proyect-Solar` |
| Recomendado | **`Computer-Electronic`** |
| URL nueva | `https://github.com/Jhossuant0520/Computer-Electronic.git` |
| Alternativas | `computer-electronic`, `ComputerElectronic` |

Criterio: alinear marca Computer & Electronic; evitar “Solar/Solvix/Proyect” en el slug público.

### 8.2 Prerrequisito obligatorio (antes o en commit previo al rename)

1. Resguardar el WT (ya hay backups de estilos; considerar zip/copia del monorepo).
2. Versionar el rename de carpetas de forma segura, p. ej. `git mv` efectivo o add de `computerElectronic*` + commit que registre el movimiento (preservar historial con `git log --follow` cuando sea posible).
3. Actualizar workflows a `computerElectronicFrontend` / `computerElectronicBackend` y `dist/computerElectronicFrontend` (o el artifact real).
4. Actualizar reglas Cursor que aún citan `projectSolvix*`.
5. Commit(s) en `main` y push **antes** o **justo después** del rename (GitHub redirige el remoto).
6. **No** `reset --hard` / `clean` mientras existan untracked CE.

### 8.3 Orden seguro del rename en GitHub

1. Completar prerrequisito de versionamiento (o al menos un commit de seguridad con el árbol CE).
2. En GitHub: Settings → General → Repository name → `Computer-Electronic`.
3. En **cada** clon / worktree / PC:

```bash
git remote set-url origin https://github.com/Jhossuant0520/Computer-Electronic.git
git remote -v
git fetch origin
```

4. Verificar Actions en el repo nuevo (misma UI; URL cambia).
5. Revisar secrets FTP y un workflow_dispatch de prueba cuando las rutas ya coincidan.
6. Actualizar bookmarks / clones de la PC de k6.

### 8.4 Comandos por computador (post-rename)

**PC principal (este monorepo):**

```bash
cd "C:/Users/Jhossuan C/Documents/Computer&Electronic"
git remote -v
git remote set-url origin https://github.com/Jhossuant0520/Computer-Electronic.git
git remote -v
git fetch origin
git status -sb
```

**Worktree Solvix (si se sigue usando):**

```bash
cd "C:/Users/Jhossuan C/Documents/Solvix.worktrees/workspace-visibility-issues"
git remote set-url origin https://github.com/Jhossuant0520/Computer-Electronic.git
git fetch origin
```

**PC secundario (pruebas k6)** — ajustar rutas reales al clonar:

```bash
cd <ruta-del-clon>
git remote -v
# Si aún apunta a Proyect-Solar:
git remote set-url origin https://github.com/Jhossuant0520/Computer-Electronic.git
git fetch origin
git status -sb
```

No se asume sincronización entre PCs: comparar `git log -1` y `git status` en ambos.

### 8.5 Archivos a actualizar (fase posterior; no en R1)

- `.github/workflows/deploy-test.yml`
- `.github/workflows/maven-ci.yml`
- `.cursor/rules/design-constitution.mdc` (rutas)
- Opcional: README raíz si se crea; badges
- **No** docs históricas de fases SOLVIX

### 8.6 Recuperación

| Escenario | Acción |
|-----------|--------|
| Rename GitHub incorrecto | Volver a renombrar en Settings (GitHub redirige) |
| Clon con URL vieja | `set-url` o confiar en redirect temporalmente |
| Pérdida de untracked CE | Restaurar desde backup/zip local (el remoto **no** tiene el árbol CE actual) |
| CI roto | Revertir commit de paths o restaurar carpetas esperadas por el workflow |

---

## 9. Checklist posterior al cambio

### Antes del rename en GitHub

- [ ] Backup local del monorepo
- [ ] `computerElectronicFrontend` y `computerElectronicBackend` versionados (o plan de commit aprobado)
- [ ] Workflows alineados a nuevas rutas / dist
- [ ] Sin `git clean` / `reset --hard` pendientes
- [ ] Inventario de clones (PC dev + PC k6 + worktrees)

### En GitHub

- [ ] Renombrar a `Computer-Electronic` (o nombre aprobado)
- [ ] Confirmar redirect desde `Proyect-Solar`
- [ ] Revisar Actions, secrets (`FTP_*`), variables, webhooks
- [ ] Revisar integraciones Cloudflare/hosting manualmente

### En cada máquina

- [ ] `git remote set-url origin …Computer-Electronic.git`
- [ ] `git fetch` + `git status`
- [ ] Smoke: clone limpio opcional en carpeta temporal
- [ ] PC k6: mismo `origin` + confirmación de rama

### Verificación funcional

- [ ] Push de prueba / workflow_dispatch cuando el árbol y CI coincidan
- [ ] Deploy TEST solo tras paths correctos
- [ ] Documentar URL nueva en un README vivo (sin reescribir docs históricas)

---

## 10. Criterio de cierre R1

R1 se considera completa con este informe. **No** se ha:

- renombrado el repositorio,
- cambiado `origin`,
- hecho commit/push,
- modificado código,
- expuesto secretos,
- ejecutado comandos destructivos.

**Bloqueo explícito para R2 (rename):** el árbol `computerElectronic*` debe quedar versionado y los workflows actualizados; de lo contrario el rename de GitHub es cosmético y el riesgo de pérdida de código / CI roto permanece.

**Siguiente paso:** esperar aprobación explícita antes de versionar carpetas, actualizar CI o renombrar en GitHub.
