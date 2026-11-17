# SOLVIX — FASE 3.10.3 Imágenes (frontend)

Complemento de `docs/backend/FASE_3_10_3_GESTION_IMAGENES.md`.

## Cambios UI

- Formulario producto: subir archivo **o** URL externa, preview y eliminar
- Detalle admin: resuelve `imagenUrl` relativa/absoluta; placeholder / error de carga
- Catálogo: misma resolución vía `resolverUrlMedia` (sin lógica de upload)

## Utilidades

- `src/app/core/utils/media-url.ts` — origen API + resolución de URL
- `src/app/features/panelAdmin/producto/producto-imagen.ts` — validación cliente (2 MB, JPG/PNG/WEBP)

## Servicio

`ProductoService.subirImagen(id, file)` → `POST .../productos/{id}/imagen`  
`ProductoService.eliminarImagen(id)` → `DELETE .../productos/{id}/imagen`

## Nota

El modelo sigue con un solo campo `imagenUrl`. No se hardcodea `localhost` dentro del producto persistido: el backend guarda rutas relativas `/api/v1/productos/imagenes/...`.
