import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CompraFormComponent } from './compra-form';
import { CompraService } from '../../../../core/services/compra.service';
import { ProveedorService } from '../../../../core/services/proveedor.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { ProveedorResponseDTO } from '../../../../core/models/proveedor.models';
import { ProductoModel } from '../../producto/productoClase';
import { dateInputToIso, labelCondicionPagoCompra, labelTipoDocumentoExterno } from '../compra-ui';

describe('CompraFormComponent enriquecido', () => {
  let fixture: ComponentFixture<CompraFormComponent>;
  let component: CompraFormComponent;
  let compraService: { crear: jasmine.Spy };

  const proveedores: ProveedorResponseDTO[] = [{
    id: 10,
    nombre: 'Acme SAS',
    razonSocial: 'Acme SAS',
    tipoDocumento: 'NIT',
    documento: '9001234567',
    numeroDocumento: '9001234567',
    nombreComercial: null,
    direccion: null,
    ciudad: null,
    departamento: null,
    telefono: null,
    telefonoAlternativo: null,
    email: null,
    web: null,
    condicionPago: 'CREDITO',
    diasCredito: 30,
    contacto: null,
    notas: null,
    activo: true,
    fechaRegistro: null,
    fechaActualizacion: null,
    contactos: [{
      id: 5,
      nombre: 'Ana Comercial',
      cargo: null,
      telefono: null,
      celular: null,
      email: null,
      tipoContacto: 'COMERCIAL',
      principal: true,
      activo: true,
      fechaRegistro: null,
      fechaActualizacion: null
    }]
  }];

  const productos: ProductoModel[] = [{
    id: 1,
    nombre: 'Mouse',
    stockActual: 0,
    costoActual: 100,
    costoConocido: true,
    activo: true,
    codigoBarras: '7701'
  } as ProductoModel];

  beforeEach(async () => {
    compraService = { crear: jasmine.createSpy('crear').and.returnValue(of({ id: 99, numero: 'C-2026-000001' })) };

    await TestBed.configureTestingModule({
      imports: [CompraFormComponent],
      providers: [
        provideRouter([]),
        { provide: CompraService, useValue: compraService },
        { provide: ProveedorService, useValue: { listar: () => of(proveedores) } },
        { provide: ProductoService, useValue: { listar: () => of(productos) } },
        {
          provide: SolvixFeedbackService,
          useValue: {
            success: () => undefined,
            info: () => undefined,
            warning: () => undefined,
            error: () => undefined
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompraFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renderiza secciones documento, fechas, condiciones e impuestos', () => {
    expect(component.loadState).toBe('ready');
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Documento de compra');
    expect(html.textContent).toContain('Fechas');
    expect(html.textContent).toContain('Condiciones');
    expect(html.textContent).toContain('Impuesto');
  });

  it('precarga condición y contacto al elegir proveedor', () => {
    component.form.patchValue({ proveedorId: 10 });
    component.onProveedorChange();
    expect(component.form.get('condicionPagoAplicada')?.value).toBe('CREDITO');
    expect(component.form.get('diasCreditoAplicados')?.value).toBe(30);
    expect(component.form.get('contactoProveedorId')?.value).toBe(5);
  });

  it('valida tipo documento externo sin número', () => {
    component.form.patchValue({
      proveedorId: 10,
      tipoDocumentoExterno: 'FACTURA',
      numeroDocumentoExterno: '',
      condicionPagoAplicada: 'CONTADO',
      diasCreditoAplicados: 0
    });
    component.agregarProducto(productos[0]);
    component.registrar();
    expect(component.submitError).toContain('número es obligatorio');
    expect(compraService.crear).not.toHaveBeenCalled();
  });

  it('envía compra enriquecida con IVA y refs', () => {
    component.form.patchValue({
      proveedorId: 10,
      tipoDocumentoExterno: 'FACTURA',
      numeroDocumentoExterno: 'F-1',
      numeroOrdenCompra: 'OC-9',
      numeroCotizacionProveedor: 'CDV-1',
      fechaDocumentoProveedor: '2026-03-01',
      condicionPagoAplicada: 'CREDITO',
      diasCreditoAplicados: 30,
      contactoProveedorId: 5,
      descuento: 0
    });
    component.agregarProducto(productos[0]);
    component.detalles.at(0).patchValue({
      cantidad: 2,
      costoUnitario: 100,
      porcentajeImpuesto: 19,
      referenciaProveedor: 'ABC-7781'
    });
    component.registrar();
    expect(compraService.crear).toHaveBeenCalled();
    const body = compraService.crear.calls.mostRecent().args[0];
    expect(body.tipoDocumentoExterno).toBe('FACTURA');
    expect(body.numeroDocumentoExterno).toBe('F-1');
    expect(body.numeroOrdenCompra).toBe('OC-9');
    expect(body.condicionPagoAplicada).toBe('CREDITO');
    expect(body.diasCreditoAplicados).toBe(30);
    expect(body.fechaDocumentoProveedor).toBe('2026-03-01T00:00:00');
    expect(body.detalles[0].referenciaProveedor).toBe('ABC-7781');
    expect(body.detalles[0].porcentajeImpuesto).toBe(19);
  });

  it('usa IVA 19% por defecto al agregar producto', () => {
    component.agregarProducto(productos[0]);
    expect(component.detalles.at(0).get('porcentajeImpuesto')?.value).toBe(19);
    expect(component.impuestoEstimado).toBe(19);
  });

  it('estima total = subtotal - descuento + impuesto', () => {
    component.agregarProducto(productos[0]);
    component.detalles.at(0).patchValue({ cantidad: 2, costoUnitario: 100, porcentajeImpuesto: 19 });
    component.form.patchValue({ descuento: 10 });
    expect(component.subtotalEstimado).toBe(200);
    expect(component.impuestoEstimado).toBe(38);
    expect(component.totalEstimado).toBe(228);
  });

  it('no envía valorImpuesto en el request', () => {
    component.form.patchValue({
      proveedorId: 10,
      condicionPagoAplicada: 'CONTADO',
      diasCreditoAplicados: 0,
      descuento: 0
    });
    component.agregarProducto(productos[0]);
    component.registrar();
    const body = compraService.crear.calls.mostRecent().args[0];
    expect(body.detalles[0].porcentajeImpuesto).toBe(19);
    expect(body.detalles[0].valorImpuesto).toBeUndefined();
    expect(body.impuestoTotal).toBeUndefined();
  });
});

describe('compra-ui helpers', () => {
  it('formatea documento y condiciones', () => {
    expect(labelTipoDocumentoExterno('FACTURA')).toBe('Factura');
    expect(labelCondicionPagoCompra('CREDITO', 30)).toBe('Crédito 30 días');
    expect(labelCondicionPagoCompra('CONTADO')).toBe('Contado');
    expect(dateInputToIso('2026-01-15')).toBe('2026-01-15T00:00:00');
    expect(dateInputToIso('')).toBeNull();
  });
});
