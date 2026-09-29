import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
import { CotizacionComercialDetailComponent } from './cotizacion-comercial-detail';
import { CotizacionComercialService } from '../../../../core/services/cotizacion-comercial.service';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import {
  CotizacionComercialResponseDTO,
  DocumentoCotizacionComercialResponseDTO
} from '../../../../core/models/cotizacion-comercial.models';

const DOC: DocumentoCotizacionComercialResponseDTO = {
  id: 3,
  cotizacionId: 7,
  version: 1,
  nombreArchivo: 'cotizacion-CC-2026-000007-v1.pdf',
  hashSha256: 'abc',
  fechaGeneracion: '2026-09-20T10:05:00',
  usuarioGeneracion: 'admin'
};

function cot(parcial: Partial<CotizacionComercialResponseDTO> = {}): CotizacionComercialResponseDTO {
  return {
    id: 7,
    numero: 'CC-2026-000007',
    clienteId: 5,
    clienteNombre: 'Carla Mora',
    clienteDocumento: null,
    clienteConsumidorFinal: false,
    estado: 'BORRADOR',
    fecha: '2026-09-20T10:00:00',
    fechaPresentacion: null,
    fechaAprobacion: null,
    fechaRechazo: null,
    fechaAnulacion: null,
    usuarioCreacion: 'admin',
    subtotal: 80000,
    total: 80000,
    subtotalProductos: 0,
    subtotalManoObra: 80000,
    subtotalOtros: 0,
    observaciones: null,
    motivoRechazo: null,
    detalles: [
      {
        id: 1, tipo: 'MANO_OBRA', descripcion: 'Instalación', cantidad: 1, precioUnitario: 80000,
        subtotal: 80000, productoId: null, productoNombreSnapshot: null, productoActivo: null
      }
    ],
    documentoVigente: null,
    documentoGenerado: false,
    puedeEditar: true,
    puedePresentar: true,
    puedeAprobar: false,
    puedeRechazar: false,
    puedeAnular: true,
    ...parcial
  };
}

const PENDIENTE = cot({
  estado: 'PENDIENTE_APROBACION',
  fechaPresentacion: '2026-09-20T10:05:00',
  documentoVigente: DOC,
  documentoGenerado: true,
  puedePresentar: false,
  puedeAprobar: true,
  puedeRechazar: true
});

describe('CotizacionComercialDetailComponent', () => {
  let fixture: ComponentFixture<CotizacionComercialDetailComponent>;
  let service: jasmine.SpyObj<CotizacionComercialService>;
  let helper: jasmine.SpyObj<DocumentoOrdenServicioService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('CotizacionComercialService', [
      'obtener', 'presentar', 'aprobar', 'rechazar', 'anular', 'listarDocumentos', 'descargarPdf', 'regenerarDocumento'
    ]);
    helper = jasmine.createSpyObj('DocumentoOrdenServicioService', ['abrirPdfEnNuevaPestana', 'descargarBlobComoArchivo']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.listarDocumentos.and.returnValue(of([DOC]));
    await TestBed.configureTestingModule({
      imports: [CotizacionComercialDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: CotizacionComercialService, useValue: service },
        { provide: DocumentoOrdenServicioService, useValue: helper },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .overrideProvider(MatSnackBar, { useValue: jasmine.createSpyObj('MatSnackBar', ['open']) })
      .compileComponents();
    fixture = TestBed.createComponent(CotizacionComercialDetailComponent);
  });

  function botones(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.acciones-botones .solvix-button__label'))
      .map(b => (b as HTMLElement).textContent?.trim() ?? '');
  }

  it('borrador: solo Editar, Presentar y Anular; sin PDF', () => {
    service.obtener.and.returnValue(of(cot()));
    fixture.detectChanges();
    expect(botones()).toEqual(['Editar', 'Presentar', 'Anular']);
    expect(service.listarDocumentos).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('se genera al presentar');
  });

  it('presentar con documentoGenerado=true muestra éxito y documento', () => {
    service.obtener.and.returnValue(of(cot()));
    service.presentar.and.returnValue(of(PENDIENTE));
    fixture.detectChanges();

    fixture.componentInstance.presentar();
    fixture.detectChanges();

    expect(service.presentar).toHaveBeenCalledWith(7);
    expect(fixture.componentInstance.pdfPendienteTrasPresentar).toBeFalse();
    expect(botones()).toEqual(['Editar', 'Aprobar', 'Rechazar', 'Ver PDF', 'Descargar', 'Anular']);
    expect(service.listarDocumentos).toHaveBeenCalledWith(7);
  });

  it('presentar con documentoGenerado=false muestra aviso y CTA Generar PDF', () => {
    service.obtener.and.returnValue(of(cot()));
    const sinPdf = cot({
      estado: 'PENDIENTE_APROBACION',
      fechaPresentacion: '2026-09-20T10:05:00',
      documentoVigente: null,
      documentoGenerado: false,
      puedePresentar: false,
      puedeAprobar: true,
      puedeRechazar: true
    });
    service.presentar.and.returnValue(of(sinPdf));
    service.listarDocumentos.and.returnValue(of([]));
    fixture.detectChanges();

    fixture.componentInstance.presentar();
    fixture.detectChanges();

    expect(fixture.componentInstance.cotizacion?.estado).toBe('PENDIENTE_APROBACION');
    expect(fixture.componentInstance.cotizacion?.puedePresentar).toBeFalse();
    expect(fixture.componentInstance.pdfPendienteTrasPresentar).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain(
      'Cotización presentada, pero no se pudo generar el PDF'
    );
    expect(fixture.nativeElement.textContent).toContain('Generar PDF');
    expect(fixture.nativeElement.textContent).not.toContain('No pudimos presentar');
  });

  it('Generar PDF tras fallo limpia el aviso y muestra el documento', () => {
    const sinPdf = cot({
      estado: 'PENDIENTE_APROBACION',
      fechaPresentacion: '2026-09-20T10:05:00',
      documentoVigente: null,
      documentoGenerado: false,
      puedePresentar: false,
      puedeAprobar: true,
      puedeRechazar: true
    });
    service.obtener.and.returnValue(of(sinPdf));
    service.listarDocumentos.and.returnValue(of([]));
    service.regenerarDocumento.and.returnValue(of(DOC));
    fixture.detectChanges();
    fixture.componentInstance.pdfPendienteTrasPresentar = true;
    fixture.detectChanges();

    fixture.componentInstance.regenerarPdf();
    fixture.detectChanges();

    expect(fixture.componentInstance.pdfPendienteTrasPresentar).toBeFalse();
    expect(fixture.componentInstance.documentos[0]).toEqual(DOC);
    expect(fixture.componentInstance.documentoVigente?.id).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain(
      'Cotización presentada, pero no se pudo generar el PDF'
    );
  });

  it('no muestra "Presentada" en el detalle aunque exista fechaPresentacion', () => {
    service.obtener.and.returnValue(of(PENDIENTE));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Presentada');
    expect(fixture.componentInstance.cotizacion?.fechaPresentacion).toBe('2026-09-20T10:05:00');
  });

  it('Presentar usa loading del solvix-button mientras procesa', () => {
    service.obtener.and.returnValue(of(cot()));
    const subject = new Subject<CotizacionComercialResponseDTO>();
    service.presentar.and.returnValue(subject.asObservable());
    fixture.detectChanges();

    fixture.componentInstance.presentar();
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBe('presentar');
    const btn = fixture.nativeElement.querySelector('.btn-tech-primary.is-loading') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBeTrue();
    expect(btn!.textContent).toContain('Presentando y generando PDF');

    subject.next(PENDIENTE);
    subject.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBeNull();
  });

  it('Presentar libera loading si la petición falla', () => {
    service.obtener.and.returnValue(of(cot()));
    const subject = new Subject<CotizacionComercialResponseDTO>();
    service.presentar.and.returnValue(subject.asObservable());
    fixture.detectChanges();

    fixture.componentInstance.presentar();
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBe('presentar');

    subject.error({ status: 500 });
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBeNull();
  });

  it('Generar PDF usa loading y lo libera en éxito y error', () => {
    const sinDoc = cot({
      estado: 'PENDIENTE_APROBACION',
      fechaPresentacion: '2026-09-20T10:05:00',
      documentoVigente: null,
      documentoGenerado: false,
      puedePresentar: false,
      puedeAprobar: true,
      puedeRechazar: true
    });
    service.obtener.and.returnValue(of(sinDoc));
    service.listarDocumentos.and.returnValue(of([]));
    const subject = new Subject<DocumentoCotizacionComercialResponseDTO>();
    service.regenerarDocumento.and.returnValue(subject.asObservable());
    fixture.detectChanges();

    fixture.componentInstance.regenerarPdf();
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBe('regenerar');
    const btn = fixture.nativeElement.querySelector('.btn-tech-tertiary.is-loading') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBeTrue();
    expect(btn!.textContent).toContain('Generando PDF');

    subject.error({ status: 500 });
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBeNull();

    const ok = new Subject<DocumentoCotizacionComercialResponseDTO>();
    service.regenerarDocumento.and.returnValue(ok.asObservable());
    fixture.componentInstance.regenerarPdf();
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBe('regenerar');
    ok.next(DOC);
    ok.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.procesando).toBeNull();
  });

  it('aprobada: sin Editar ni transiciones, con Ver PDF y Descargar', () => {
    service.obtener.and.returnValue(of(cot({
      estado: 'APROBADA', documentoVigente: DOC, puedeEditar: false, puedePresentar: false, puedeAnular: false
    })));
    fixture.detectChanges();
    expect(botones()).toEqual(['Ver PDF', 'Descargar']);
  });

  it('descarga y abre el PDF vigente', () => {
    service.obtener.and.returnValue(of(PENDIENTE));
    const blob = new Blob(['%PDF-'], { type: 'application/pdf' });
    service.descargarPdf.and.returnValue(of(blob));
    fixture.detectChanges();

    fixture.componentInstance.descargarPdf();
    expect(service.descargarPdf).toHaveBeenCalledWith(7, 3, 'attachment');
    expect(helper.descargarBlobComoArchivo).toHaveBeenCalledWith(blob, DOC.nombreArchivo);

    fixture.componentInstance.verPdf();
    expect(service.descargarPdf).toHaveBeenCalledWith(7, 3, 'inline');
    expect(helper.abrirPdfEnNuevaPestana).toHaveBeenCalledWith(blob);
  });

  it('rechazar envía la observación del diálogo', () => {
    service.obtener.and.returnValue(of(PENDIENTE));
    service.rechazar.and.returnValue(of(cot({ estado: 'RECHAZADA', puedeEditar: false, puedePresentar: false })));
    dialog.open.and.returnValue({ afterClosed: () => of({ observacion: 'Muy caro' }) } as never);
    fixture.detectChanges();

    fixture.componentInstance.rechazar();
    expect(service.rechazar).toHaveBeenCalledWith(7, 'Muy caro');
  });

  function etiquetasResumen(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.panel .facts > div dt') as NodeListOf<HTMLElement>)
      .map(el => el.textContent?.trim() ?? '')
      .filter(t => ['Productos', 'Mano de obra', 'Otros conceptos', 'Total'].includes(t));
  }

  it('D.6 resumen detalle: solo mano de obra (productos/otros en 0 ocultos)', () => {
    service.obtener.and.returnValue(of(cot()));
    fixture.detectChanges();
    expect(etiquetasResumen()).toEqual(['Mano de obra', 'Total']);
    expect(fixture.nativeElement.textContent).toContain('$80.000');
  });

  it('D.6 resumen detalle: productos + otros sin mano de obra', () => {
    service.obtener.and.returnValue(of(cot({
      subtotalProductos: 250000,
      subtotalManoObra: 0,
      subtotalOtros: 15000,
      subtotal: 265000,
      total: 265000,
      detalles: [
        {
          id: 1, tipo: 'PRODUCTO', descripcion: 'Pantalla', cantidad: 1, precioUnitario: 250000,
          subtotal: 250000, productoId: 10, productoNombreSnapshot: 'Pantalla', productoActivo: true
        },
        {
          id: 2, tipo: 'OTRO', descripcion: 'Transporte', cantidad: 1, precioUnitario: 15000,
          subtotal: 15000, productoId: null, productoNombreSnapshot: null, productoActivo: null
        }
      ]
    })));
    fixture.detectChanges();
    expect(etiquetasResumen()).toEqual(['Productos', 'Otros conceptos', 'Total']);
  });

  it('D.6 resumen detalle: los tres conceptos cuando subtotales > 0', () => {
    service.obtener.and.returnValue(of(cot({
      subtotalProductos: 250000,
      subtotalManoObra: 80000,
      subtotalOtros: 15000,
      subtotal: 345000,
      total: 345000
    })));
    fixture.detectChanges();
    expect(etiquetasResumen()).toEqual(['Productos', 'Mano de obra', 'Otros conceptos', 'Total']);
  });
});
