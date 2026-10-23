import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminRecordSearchService } from './admin-record-search.service';
import { AuthService } from './auth.service';
import { ClienteService } from './cliente.service';
import { CotizacionComercialService } from './cotizacion-comercial.service';
import { OrdenServicioService } from './orden-servicio.service';
import { ProductoService } from './producto.service';
import { VentaService } from './venta.service';

describe('AdminRecordSearchService', () => {
  let service: AdminRecordSearchService;
  let auth: { esAdmin: jasmine.Spy };
  let productos: { buscar: jasmine.Spy };
  let clientes: { buscar: jasmine.Spy };
  let ordenes: { listar: jasmine.Spy };
  let ventas: { listar: jasmine.Spy };
  let cotizaciones: { listar: jasmine.Spy };

  beforeEach(() => {
    auth = { esAdmin: jasmine.createSpy('esAdmin').and.returnValue(true) };
    productos = {
      buscar: jasmine.createSpy('buscar').and.returnValue(
        of([{ id: 1, nombre: 'Mouse', marca: 'Logitech', codigoBarras: '123', categoriaNombre: 'Periféricos' }])
      )
    };
    clientes = {
      buscar: jasmine.createSpy('buscar').and.returnValue(
        of([{ id: 2, nombre: 'Ana', numeroDocumento: '100', telefono: null, email: 'a@b.com' }])
      )
    };
    ordenes = {
      listar: jasmine.createSpy('listar').and.returnValue(
        of({
          contenido: [
            {
              id: 3,
              numero: 'OT-1',
              clienteNombre: 'Ana',
              estado: 'RECEPCIONADO',
              equipoNombre: 'Laptop',
              equipoModelo: null
            }
          ]
        })
      )
    };
    ventas = {
      listar: jasmine.createSpy('listar').and.returnValue(
        of({
          contenido: [
            { id: 4, numero: 'V-1', clienteNombre: 'Ana', estado: 'COMPLETADA', fecha: '2026-01-15' }
          ]
        })
      )
    };
    cotizaciones = {
      listar: jasmine.createSpy('listar').and.returnValue(
        of({
          contenido: [
            { id: 5, numero: 'C-1', clienteNombre: 'Ana', estado: 'BORRADOR', fecha: '2026-01-10' }
          ]
        })
      )
    };

    TestBed.configureTestingModule({
      providers: [
        AdminRecordSearchService,
        { provide: AuthService, useValue: auth },
        { provide: ProductoService, useValue: productos },
        { provide: ClienteService, useValue: clientes },
        { provide: OrdenServicioService, useValue: ordenes },
        { provide: VentaService, useValue: ventas },
        { provide: CotizacionComercialService, useValue: cotizaciones }
      ]
    });

    service = TestBed.inject(AdminRecordSearchService);
  });

  it('agrupa hits reales por entidad cuando el usuario es ADMIN', done => {
    service.search('ana').subscribe(result => {
      expect(result.hasError).toBeFalse();
      expect(result.total).toBe(5);
      expect(result.groups.map(g => g.kind)).toEqual([
        'producto',
        'cliente',
        'servicio',
        'venta',
        'cotizacion'
      ]);
      expect(result.groups[0].hits[0].path).toBe('/productos/1');
      expect(result.groups[1].hits[0].path).toBe('/clientes/2');
      done();
    });
  });

  it('solo busca productos si el usuario no es ADMIN', done => {
    auth.esAdmin.and.returnValue(false);
    service.search('mouse').subscribe(result => {
      expect(result.groups.length).toBe(1);
      expect(result.groups[0].kind).toBe('producto');
      expect(clientes.buscar).not.toHaveBeenCalled();
      done();
    });
  });

  it('marca hasError si un endpoint falla y conserva el resto', done => {
    clientes.buscar.and.returnValue(throwError(() => new Error('fail')));
    service.search('ana').subscribe(result => {
      expect(result.hasError).toBeTrue();
      expect(result.groups.some(g => g.kind === 'producto')).toBeTrue();
      expect(result.groups.some(g => g.kind === 'cliente')).toBeFalse();
      done();
    });
  });

  it('devuelve vacío sin disparar APIs si el texto está en blanco', done => {
    service.search('   ').subscribe(result => {
      expect(result.total).toBe(0);
      expect(productos.buscar).not.toHaveBeenCalled();
      done();
    });
  });
});
