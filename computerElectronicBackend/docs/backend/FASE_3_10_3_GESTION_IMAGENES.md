# SOLVIX — FASE 3.10.3 Gestión de imágenes de productos

## Objetivo

Permitir al administrador subir imágenes locales de producto sin abandonar la URL externa, manteniendo una sola propiedad:

`Producto.imagenUrl`

Esa URL puede apuntar a un recurso externo o a un archivo alojado por SOLVIX.

## Arquitectura

```
Admin form
 ├─ URL externa  → PUT /api/v1/productos/{id} (imagenUrl=https://...)
 └─ Archivo local → POST /api/v1/productos/{id}/imagen (multipart file)
                    ↓
              filesystem uploads/productos/{uuid}.{ext}
                    ↓
              imagenUrl = /api/v1/productos/imagenes/{uuid}.{ext}
                    ↓
         GET público (catálogo + admin <img>)
```

No hay BLOB en MySQL. No hay segundo campo de imagen.

## Almacenamiento

- Directorio: `solvix.productos.imagenes-dir` (default `uploads/productos`)
- Nombre: UUID generado por servidor + extensión detectada por firma mágica
- No se usa `file.getOriginalFilename()` como ruta

## Endpoint

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/productos/{id}/imagen` | ADMIN | Sube `file` (multipart) |
| DELETE | `/api/v1/productos/{id}/imagen` | ADMIN | Quita referencia (+ borra local) |
| GET | `/api/v1/productos/imagenes/{nombre}` | público | Sirve el archivo |

Parámetro multipart: **`file`**

## Seguridad

- Subida/eliminación: JWT + `ROLE_ADMIN`
- Lectura de imagen: `permitAll` (necesaria para catálogo sin JWT)
- Path traversal bloqueado; solo nombres UUID validados
- Validación por firma mágica (JPEG/PNG/WEBP), no solo Content-Type

## Formatos

Permitidos: JPEG, PNG, WEBP.

No permitidos: SVG, GIF, ejecutables, documentos.

## Límites

El proyecto ya tenía:

```
spring.servlet.multipart.max-file-size=2MB
spring.servlet.multipart.max-request-size=2MB
```

Se mantiene **2 MB** (coherente con avatares). Subir a 5 MB requeriría subir también el límite multipart de Spring.

## Flujo de creación

1. `POST /api/v1/productos` (JSON, sin archivo)
2. Si hay archivo local → `POST /{id}/imagen`
3. Si la subida falla: el producto **no** se borra; UI muestra “Producto creado, pero no pudimos guardar la imagen.” + reintento

## Flujo de edición

1. `PUT /api/v1/productos/{id}` con datos (y URL externa si aplica)
2. Si hay archivo → `POST /{id}/imagen`
3. Si “Eliminar imagen” → `DELETE /{id}/imagen`

El archivo **no** viaja dentro del JSON del producto.

## Reemplazo

Al subir una nueva imagen local:

1. guardar archivo nuevo
2. actualizar `imagenUrl`
3. si la anterior era local SOLVIX → borrar archivo anterior
4. si era URL externa → solo reemplazar referencia

## Eliminación

`imagenUrl` puede ser `null`.

- Local SOLVIX: borra referencia + archivo
- Externa: solo borra referencia (no intenta DELETE remoto)

## URL externa

Sigue disponible en el formulario.

No se descarga ni convierte automáticamente a archivo local.

Si el `<img>` falla (p. ej. 403 hotlink):

> No pudimos cargar esta imagen. Puedes subirla directamente a SOLVIX.

## Integración con catálogo

El catálogo sigue consumiendo `CatalogoProducto.imagenUrl`.

Frontend resuelve rutas relativas con `resolverUrlMedia()` (`API_ORIGIN` + path).

No se duplicó lógica de upload en el catálogo.

## Configuración

```properties
solvix.productos.imagenes-dir=uploads/productos
```

Test:

```properties
solvix.productos.imagenes-dir=${java.io.tmpdir}/solvix-test-productos
```

`uploads/` ya está en `.gitignore`.

## Frontend

- Formulario: subir archivo + URL + preview + eliminar
- `ProductoService.subirImagen` / `eliminarImagen`
- Detalle admin y catálogo usan `resolverUrlMedia`

## Tests

Backend:

- `ProductoImagenServiceTest`
- `ProductoImagenControllerTest` (ADMIN, 403, vacío, MIME, 404, reemplazo, delete, GET público, URL externa)

Frontend:

- `media-url.spec.ts`
- `producto-imagen.spec.ts`
- `producto-imagen.service.spec.ts`

## Limitaciones

- Límite 2 MB (no 5 MB) por coherencia multipart existente
- Soft-delete de producto no borra el archivo de disco
- Sin CDN / optimización / thumbnails
- `API_ORIGIN` aún centralizado en util (no environment multi-deploy)

## Pendientes

1. Configurable `API_ORIGIN` / base URL por environment
2. Limpieza de huérfanos al desactivar producto (opcional)
3. Evaluar subir límite a 5 MB de forma coordinada
4. Thumbnails / WebP forzado en servidor
