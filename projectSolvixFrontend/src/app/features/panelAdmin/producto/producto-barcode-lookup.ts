import { Observable, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductoService } from '../../../core/services/producto.service';
import { ProductoModel } from './productoClase';
import {
  MENSAJE_PRODUCTO_NO_ENCONTRADO_CODIGO,
  encontrarPorCodigoExacto,
  normalizarCodigoBarras
} from './producto-ui';

/**
 * Resuelve un producto por código de barras reutilizando el catálogo local
 * y, si hace falta, ProductoService.obtenerPorCodigoBarras (sin duplicar endpoint).
 */
export function resolverProductoPorCodigoBarras(
  productoService: ProductoService,
  catalogo: ProductoModel[],
  codigoRaw: string
): Observable<ProductoModel> {
  const codigo = normalizarCodigoBarras(codigoRaw);
  if (!codigo) {
    return new Observable(subscriber => {
      subscriber.error(new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { message: MENSAJE_PRODUCTO_NO_ENCONTRADO_CODIGO }
      }));
    });
  }

  const local = encontrarPorCodigoExacto(catalogo, codigo);
  if (local) {
    return of(local);
  }

  return productoService.obtenerPorCodigoBarras(codigo);
}

export function mensajeErrorLookupCodigoBarras(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return MENSAJE_PRODUCTO_NO_ENCONTRADO_CODIGO;
  }
  return fallback;
}
