import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CompraDetailComponent } from './compra-detail';
import { CompraService } from '../../../../core/services/compra.service';
import { ProductoService } from '../../../../core/services/producto.service';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { CompraResponseDTO } from '../../../../core/models/compra.models';

describe('CompraDetailComponent enriquecido', () => {
  let fixture: ComponentFixture<CompraDetailComponent>;

  const compra: CompraResponseDTO = {
    id: 1,
    numero: 'C-2026-000123',
    fecha: '2026-03-02T10:00:00',
    proveedorId: 10,
    proveedorNombre: 'Acme SAS',
    proveedorDocumento: '9001234567',
    tipoDocumentoExterno: 'FACTURA',
    numeroDocumentoExterno: 'F-123456',
    numeroOrdenCompra: 'OC-123',
    numeroCotizacionProveedor: 'CDV-123',
    fechaDocumentoProveedor: '2026-03-01T00:00:00',
    fechaEntrega: '2026-03-10T00:00:00',
    fechaVencimiento: '2026-04-01T00:00:00',
    condicionPagoAplicada: 'CREDITO',
    diasCreditoAplicados: 30,
    moneda: 'COP',
    contactoNombreSnapshot: 'Ana Comercial',
    subtotal: 200,
    descuento: 10,
    impuestoTotal: 38,
    total: 228,
    estado: 'PENDIENTE',
    observaciones: null,
    fechaCompletada: null,
    fechaAnulada: null,
    createdBy: 'tester',
    detalles: [{
      id: 1,
      productoId: 1,
      productoNombre: 'Mouse',
      categoriaCodigo: 'GEN',
      cantidad: 2,
      costoUnitario: 100,
      subtotal: 200,
      referenciaProveedor: 'ABC-7781',
      porcentajeImpuesto: 19,
      valorImpuesto: 38,
      cantidadDevuelta: 0
    }]
  };

  const compraLegacy: CompraResponseDTO = {
    ...compra,
    id: 2,
    numero: 'C-2025-000001',
    tipoDocumentoExterno: null,
    numeroDocumentoExterno: null,
    numeroOrdenCompra: null,
    numeroCotizacionProveedor: null,
    fechaDocumentoProveedor: null,
    fechaEntrega: null,
    fechaVencimiento: null,
    condicionPagoAplicada: null,
    diasCreditoAplicados: null,
    contactoNombreSnapshot: null,
    impuestoTotal: 0,
    descuento: 0,
    total: 200,
    detalles: [{
      id: 1,
      productoId: 1,
      productoNombre: 'Mouse',
      categoriaCodigo: null,
      cantidad: 2,
      costoUnitario: 100,
      subtotal: 200,
      cantidadDevuelta: 0
    }]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompraDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        },
        {
          provide: CompraService,
          useValue: {
            obtenerPorId: () => of(compra),
            listarDevoluciones: () => of([])
          }
        },
        { provide: ProductoService, useValue: { listar: () => of([]) } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
        {
          provide: SolvixFeedbackService,
          useValue: { success: () => undefined, error: () => undefined, warning: () => undefined }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CompraDetailComponent);
    fixture.detectChanges();
  });

  it('muestra documento externo, OC, fechas, condiciones e impuesto', () => {
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('C-2026-000123');
    expect(html).toContain('F-123456');
    expect(html).toContain('OC-123');
    expect(html).toContain('CDV-123');
    expect(html).toContain('Crédito 30 días');
    expect(html).toContain('Impuesto');
    expect(html).toContain('Ana Comercial');
  });

  it('soporta compra legacy sin campos nuevos', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CompraDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '2' } } }
        },
        {
          provide: CompraService,
          useValue: {
            obtenerPorId: () => of(compraLegacy),
            listarDevoluciones: () => of([])
          }
        },
        { provide: ProductoService, useValue: { listar: () => of([]) } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
        {
          provide: SolvixFeedbackService,
          useValue: { success: () => undefined, error: () => undefined }
        }
      ]
    }).compileComponents();

    const legacyFixture = TestBed.createComponent(CompraDetailComponent);
    legacyFixture.detectChanges();
    const html = (legacyFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('C-2025-000001');
    expect(html).toContain('Impuesto');
  });
});
