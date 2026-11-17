import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ProductoService } from '../../../core/services/producto.service';
import { ProductoModel } from './productoClase';
import {
  mensajeErrorLookupCodigoBarras,
  resolverProductoPorCodigoBarras
} from './producto-barcode-lookup';
import {
  MENSAJE_PRODUCTO_NO_ENCONTRADO_CODIGO,
  encontrarPorCodigoExacto
} from './producto-ui';

describe('producto-barcode-lookup', () => {
  const camara: ProductoModel = {
    id: 7,
    nombre: 'Cámara H9C',
    marca: 'Hikvision',
    codigoBarras: '07701234567890',
    categoriaId: 1,
    precioVentaActual: 240000,
    stockActual: 3,
    activo: true
  };

  it('encuentra por código exacto sin convertir a número', () => {
    const hallado = encontrarPorCodigoExacto([camara], '07701234567890');
    expect(hallado?.id).toBe(7);
    expect(hallado?.codigoBarras).toBe('07701234567890');
  });

  it('resuelve desde catálogo local sin llamar al servicio', () => {
    const productoService = jasmine.createSpyObj<ProductoService>('ProductoService', [
      'obtenerPorCodigoBarras'
    ]);

    let resultado: ProductoModel | undefined;
    resolverProductoPorCodigoBarras(productoService, [camara], '07701234567890').subscribe(p => {
      resultado = p;
    });

    expect(resultado?.nombre).toBe('Cámara H9C');
    expect(productoService.obtenerPorCodigoBarras).not.toHaveBeenCalled();
  });

  it('consulta ProductoService cuando el código no está en el catálogo local', () => {
    const productoService = jasmine.createSpyObj<ProductoService>('ProductoService', [
      'obtenerPorCodigoBarras'
    ]);
    productoService.obtenerPorCodigoBarras.and.returnValue(of(camara));

    let resultado: ProductoModel | undefined;
    resolverProductoPorCodigoBarras(productoService, [], '07701234567890').subscribe(p => {
      resultado = p;
    });

    expect(productoService.obtenerPorCodigoBarras).toHaveBeenCalledWith('07701234567890');
    expect(resultado?.id).toBe(7);
  });

  it('traduce 404 a mensaje humano de código no encontrado', () => {
    const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    expect(mensajeErrorLookupCodigoBarras(error, 'fallback')).toBe(MENSAJE_PRODUCTO_NO_ENCONTRADO_CODIGO);
  });

  it('propaga errores distintos de 404 con el fallback', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    expect(mensajeErrorLookupCodigoBarras(error, 'No pudimos buscar el producto.')).toBe(
      'No pudimos buscar el producto.'
    );
  });

  it('falla con 404 cuando el código está vacío', done => {
    const productoService = jasmine.createSpyObj<ProductoService>('ProductoService', [
      'obtenerPorCodigoBarras'
    ]);

    resolverProductoPorCodigoBarras(productoService, [camara], '   ').subscribe({
      next: () => fail('no debía resolver'),
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(404);
        expect(productoService.obtenerPorCodigoBarras).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('propaga el 404 del servicio remoto', done => {
    const productoService = jasmine.createSpyObj<ProductoService>('ProductoService', [
      'obtenerPorCodigoBarras'
    ]);
    productoService.obtenerPorCodigoBarras.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    resolverProductoPorCodigoBarras(productoService, [], '9999999999999').subscribe({
      next: () => fail('no debía resolver'),
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(404);
        expect(mensajeErrorLookupCodigoBarras(err, 'x')).toBe(MENSAJE_PRODUCTO_NO_ENCONTRADO_CODIGO);
        done();
      }
    });
  });
});
