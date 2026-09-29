import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioDocumentosPanelComponent } from './servicio-documentos-panel';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import {
  AsegurarComprobanteRecepcionResponseDTO,
  DocumentoOrdenServicioResponseDTO
} from '../../../../core/models/documento-orden-servicio.models';

function docBase(
  parcial: Partial<DocumentoOrdenServicioResponseDTO> = {}
): DocumentoOrdenServicioResponseDTO {
  return {
    id: 1,
    ordenServicioId: 12,
    tipoDocumento: 'COMPROBANTE_RECEPCION',
    tipoDocumentoEtiqueta: 'Comprobante de recepción',
    cotizacionId: null,
    version: 1,
    nombreArchivo: 'comprobante-OS-2026-000012-v1.pdf',
    hashSha256: 'abc',
    fechaGeneracion: '2026-03-01T10:00:00',
    usuarioGeneracion: 'admin',
    tokenDocumento: null,
    ...parcial
  };
}

function asegurar(
  parcial: Partial<AsegurarComprobanteRecepcionResponseDTO> = {}
): AsegurarComprobanteRecepcionResponseDTO {
  return {
    status: 'GENERATED',
    ready: true,
    documento: docBase(),
    ...parcial
  };
}

describe('ServicioDocumentosPanelComponent', () => {
  let fixture: ComponentFixture<ServicioDocumentosPanelComponent>;
  let component: ServicioDocumentosPanelComponent;
  let documentoService: jasmine.SpyObj<DocumentoOrdenServicioService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    documentoService = jasmine.createSpyObj('DocumentoOrdenServicioService', [
      'listar',
      'descargarPdf',
      'regenerar',
      'asegurarComprobanteRecepcion',
      'generarComprobanteRecepcion',
      'generarCotizacionPdf',
      'generarActaEntrega',
      'abrirPdfEnNuevaPestana',
      'descargarBlobComoArchivo'
    ]);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    documentoService.listar.and.returnValue(of([]));
    documentoService.asegurarComprobanteRecepcion.and.returnValue(of(asegurar()));
    documentoService.generarComprobanteRecepcion.and.callFake(
      (id: number) => documentoService.asegurarComprobanteRecepcion(id)
    );

    await TestBed.configureTestingModule({
      imports: [ServicioDocumentosPanelComponent, NoopAnimationsModule],
      providers: [
        { provide: DocumentoOrdenServicioService, useValue: documentoService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .overrideProvider(MatSnackBar, { useValue: jasmine.createSpyObj('MatSnackBar', ['open']) })
      .compileComponents();

    fixture = TestBed.createComponent(ServicioDocumentosPanelComponent);
    component = fixture.componentInstance;
  });

  it('OT recién creada: asegura y muestra comprobante con badge NUEVO', fakeAsync(() => {
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(documentoService.asegurarComprobanteRecepcion).toHaveBeenCalledWith(12);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Comprobante de recepción');
    expect(text).toContain('NUEVO');
    expect(component.docRecienGeneradoId).toBe(1);
    expect(text).toContain('Ver');
    expect(text).not.toContain('Generar comprobante');
    expect(text).not.toContain('Reintentar generación');
    expect(text).not.toContain('WhatsApp');
    component.ngOnDestroy();
  }));

  it('documento relevante correcto según input', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([docBase()]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('documentoRelevante', 'COMPROBANTE_RECEPCION');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const slots = component.slotsDocumentales;
    expect(slots.find(s => s.tipo === 'COMPROBANTE_RECEPCION')?.relevante).toBeTrue();
    expect(slots.find(s => s.tipo === 'COTIZACION')?.relevante).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Relevante');
  }));

  it('revela documento recién generado con feedback contextual', fakeAsync(() => {
    const actionReveal = TestBed.inject(SolvixActionRevealService);
    const successSpy = spyOn(actionReveal, 'success').and.callThrough();

    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    tick(50);

    expect(component.docRecienGeneradoId).toBe(1);
    expect(successSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Comprobante de recepción generado correctamente.',
        target: '[data-doc-id="1"]'
      })
    );
    component.ngOnDestroy();
  }));

  it('versiones anteriores colapsadas por defecto', fakeAsync(() => {
    documentoService.listar.and.returnValue(
      of([
        docBase({ id: 2, version: 2, nombreArchivo: 'comp-v2.pdf' }),
        docBase({ id: 1, version: 1, nombreArchivo: 'comp-v1.pdf' })
      ])
    );
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Versiones anteriores (1)');
    expect(component.versionesAbiertasDe('COMPROBANTE_RECEPCION')).toBeFalse();
    expect(text).toContain('Versión 2');
    expect(text).not.toMatch(/Versión 1(?!\d)/);
  }));

  it('acciones administrativas: Regenerar visible y sin WhatsApp', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([docBase()]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ver');
    expect(text).toContain('Descargar');
    expect(text).toContain('Regenerar');
    expect(fixture.nativeElement.querySelector('[aria-label="Regenerar PDF"]')).toBeTruthy();
    expect(text).not.toContain('WhatsApp');
    expect(text).not.toContain('comprobante-OS-2026-000012-v1.pdf');
  }));

  it('tres slots documentales siempre visibles', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'EN_REPARACION');
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Recepción');
    expect(text).toContain('Cotización');
    expect(text).toContain('Entrega');
    expect(text).toContain('Se genera al crear la orden');
    expect(text).toContain('Se genera al presentar la cotización');
    expect(text).toContain('Se genera al registrar la entrega');
    expect(component.docRecienGeneradoId).toBeNull();
    expect(text).not.toContain('NUEVO');
  }));

  it('muestra Generando mientras asegurar está en curso', fakeAsync(() => {
    const pending = new Subject<AsegurarComprobanteRecepcionResponseDTO>();
    documentoService.asegurarComprobanteRecepcion.and.returnValue(pending.asObservable());
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    expect(fixture.nativeElement.textContent).toContain('Generando comprobante');
    expect(fixture.nativeElement.textContent).not.toContain('Generar comprobante');
    pending.next(asegurar());
    pending.complete();
    tick();
    component.ngOnDestroy();
  }));

  it('polling encuentra documento si asegurar falla', fakeAsync(() => {
    documentoService.asegurarComprobanteRecepcion.and.returnValue(
      throwError(() => ({ status: 500 }))
    );
    let calls = 0;
    documentoService.listar.and.callFake(() => {
      calls += 1;
      return calls >= 2 ? of([docBase()]) : of([]);
    });
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    expect(fixture.nativeElement.textContent).toContain('Generando comprobante');
    tick(800);
    fixture.detectChanges();
    expect(component.docRecienGeneradoId).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('NUEVO');
    component.ngOnDestroy();
  }));

  it('timeout muestra Reintentar generación', fakeAsync(() => {
    documentoService.asegurarComprobanteRecepcion.and.returnValue(
      throwError(() => ({ status: 500 }))
    );
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    for (let i = 0; i < 10; i++) {
      tick(800);
    }
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('El comprobante no pudo generarse automáticamente');
    expect(text).toContain('Reintentar generación');
    component.ngOnDestroy();
  }));

  it('reintentar usa asegurarComprobanteRecepcion', fakeAsync(() => {
    documentoService.asegurarComprobanteRecepcion.and.returnValue(
      throwError(() => ({ status: 500 }))
    );
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    for (let i = 0; i < 10; i++) {
      tick(800);
    }
    documentoService.asegurarComprobanteRecepcion.and.returnValue(of(asegurar({ status: 'EXISTING' })));
    component.reintentarGeneracion();
    tick();
    fixture.detectChanges();
    expect(documentoService.asegurarComprobanteRecepcion).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Comprobante de recepción');
    component.ngOnDestroy();
  }));

  it('OT antigua RECEPCIONADO sin doc: pendiente + Generar (sin polling)', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('esperarComprobante', false);
    fixture.detectChanges();
    tick();
    expect(documentoService.asegurarComprobanteRecepcion).not.toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pendiente');
    expect(text).toContain('Se genera al crear la orden');
    expect(text).toContain('Generar comprobante');
    expect(text).not.toContain('Generando comprobante');
  }));

  it('esperarDocumento hace polling hasta aparecer cotización', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([docBase()]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'PENDIENTE_APROBACION');
    fixture.detectChanges();
    tick();

    let calls = 0;
    documentoService.listar.and.callFake(() => {
      calls += 1;
      if (calls === 1) {
        return of([docBase()]);
      }
      return of([
        docBase(),
        docBase({
          id: 9,
          tipoDocumento: 'COTIZACION',
          tipoDocumentoEtiqueta: 'Cotización',
          cotizacionId: 44,
          cotizacionNumero: 'COT-2026-000044',
          nombreArchivo: 'cot.pdf'
        })
      ]);
    });

    component.esperarDocumento({ tipo: 'COTIZACION', cotizacionId: 44 });
    tick();
    fixture.detectChanges();
    expect(component.esperandoDoc?.tipo).toBe('COTIZACION');
    tick(800);
    fixture.detectChanges();
    expect(component.esperandoDoc).toBeNull();
    expect(component.docRecienGeneradoId).toBe(9);
    expect(fixture.nativeElement.textContent).toContain('NUEVO');
    expect(fixture.nativeElement.textContent).toContain('Cotización COT-2026-000044');
    component.ngOnDestroy();
  }));

  it('lista documentos por tipo con Ver / Descargar / Regenerar', fakeAsync(() => {
    documentoService.listar.and.returnValue(
      of([
        docBase(),
        docBase({
          id: 2,
          tipoDocumento: 'COTIZACION',
          tipoDocumentoEtiqueta: 'Cotización',
          cotizacionId: 5,
          cotizacionNumero: 'COT-1',
          nombreArchivo: 'cotizacion-v1.pdf'
        })
      ])
    );
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'COTIZADO');
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Comprobante de recepción');
    expect(text).toContain('Cotización');
    expect(text).toContain('Ver');
    expect(text).toContain('Descargar');
    expect(text).toContain('Regenerar');
    expect(fixture.nativeElement.querySelector('[aria-label="Regenerar PDF"]')).toBeTruthy();
    expect(component.docRecienGeneradoId).toBeNull();
    expect(text).not.toContain('NUEVO');
  }));

  it('Ver descarga PDF inline y abre pestaña', fakeAsync(() => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    documentoService.listar.and.returnValue(of([docBase()]));
    documentoService.descargarPdf.and.returnValue(of(blob));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.detectChanges();
    tick();

    component.ver(docBase());
    tick();

    expect(documentoService.descargarPdf).toHaveBeenCalledWith(12, 1, 'inline');
    expect(documentoService.abrirPdfEnNuevaPestana).toHaveBeenCalledWith(blob);
  }));

  it('error de reintento no muestra stacktrace Java', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.detectChanges();
    tick();
    documentoService.asegurarComprobanteRecepcion.and.returnValue(
      throwError(() => ({
        status: 500,
        error: { message: 'java.lang.NoClassDefFoundError: com.foo.Bar' }
      }))
    );
    component.reintentarGeneracion();
    tick();
    fixture.detectChanges();
    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).not.toContain('noclassdeffounderror');
    expect(text).not.toContain('com.foo');
    expect(component.accionEnCurso).toBeFalse();
  }));

  it('cancela suscripciones al destruir', fakeAsync(() => {
    const pending = new Subject<AsegurarComprobanteRecepcionResponseDTO>();
    documentoService.asegurarComprobanteRecepcion.and.returnValue(pending.asObservable());
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('esperarComprobante', true);
    fixture.detectChanges();
    tick();
    component.ngOnDestroy();
    pending.next(asegurar());
    pending.complete();
    tick(10_000);
    expect().nothing();
  }));

  it('Regenerar usa loading de solvix-button y libera en error', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([docBase()]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
    tick();

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    const pending = new Subject<DocumentoOrdenServicioResponseDTO>();
    documentoService.regenerar.and.returnValue(pending.asObservable());

    component.regenerar(docBase());
    tick();
    fixture.detectChanges();

    expect(component.accionEnCurso).toBeTrue();
    expect(component.accionTipo).toBe('regenerar');
    expect(fixture.nativeElement.querySelector('.is-loading')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Generando PDF');

    pending.error({ status: 500 });
    tick();
    fixture.detectChanges();
    expect(component.accionEnCurso).toBeFalse();
    expect(component.accionTipo).toBeNull();
  }));

  it('Generar comprobante muestra loading y no permite doble ejecución', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'RECEPCIONADO');
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();
    tick();

    const pending = new Subject<AsegurarComprobanteRecepcionResponseDTO>();
    documentoService.asegurarComprobanteRecepcion.and.returnValue(pending.asObservable());

    component.reintentarGeneracion();
    fixture.detectChanges();
    expect(component.accionEnCurso).toBeTrue();
    expect(component.accionTipo).toBe('comprobante');
    expect(component.state).toBe('esperando_comprobante');

    component.reintentarGeneracion();
    expect(documentoService.asegurarComprobanteRecepcion).toHaveBeenCalledTimes(1);

    pending.next(asegurar());
    pending.complete();
    tick();
    fixture.detectChanges();
    expect(component.accionEnCurso).toBeFalse();
    expect(component.accionTipo).toBeNull();
  }));

  it('espera de acta muestra mensaje Generando acta de entrega', fakeAsync(() => {
    documentoService.listar.and.returnValue(of([]));
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', 'ENTREGADO');
    fixture.detectChanges();
    tick();

    component.esperarDocumento({ tipo: 'ACTA_ENTREGA' });
    tick();
    fixture.detectChanges();
    expect(component.labelGenerandoEsperado()).toBe('Generando acta de entrega…');
    expect(fixture.nativeElement.textContent).toContain('Generando acta de entrega');
  }));
});
