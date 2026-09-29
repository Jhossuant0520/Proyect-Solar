import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';
import { ServicioCotizacionesPanelComponent, DocumentoCotizacionEsperado } from './servicio-cotizaciones-panel';
import { CotizacionServicioService } from '../../../../core/services/cotizacion-servicio.service';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import { CotizacionServicioResponseDTO } from '../../../../core/models/cotizacion-servicio.models';
import { CotizacionFormDialogComponent } from './cotizacion-form-dialog/cotizacion-form-dialog';

function cot(parcial: Partial<CotizacionServicioResponseDTO> = {}): CotizacionServicioResponseDTO {
  return {
    id: 44,
    ordenServicioId: 12,
    numero: 'COT-2026-000044',
    tipo: 'INICIAL',
    estado: 'BORRADOR',
    fechaCreacion: null,
    fechaPresentacion: null,
    fechaAprobacion: null,
    fechaRechazo: null,
    usuarioCreacion: 'admin',
    usuarioPresentacion: null,
    usuarioAprobacion: null,
    usuarioRechazo: null,
    subtotal: 420000,
    total: 420000,
    subtotalRepuestos: 0,
    subtotalManoObra: 420000,
    subtotalOtros: 0,
    observaciones: null,
    motivoAmpliacion: null,
    detalles: [],
    puedeEditar: true,
    puedePresentar: true,
    puedeAprobar: false,
    puedeRechazar: false,
    ...parcial
  };
}

describe('ServicioCotizacionesPanelComponent', () => {
  let fixture: ComponentFixture<ServicioCotizacionesPanelComponent>;
  let component: ServicioCotizacionesPanelComponent;
  let cotizacionService: jasmine.SpyObj<CotizacionServicioService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  async function montar(
    lista: CotizacionServicioResponseDTO[],
    estado = 'COTIZADO',
    docs: unknown[] = []
  ): Promise<void> {
    cotizacionService = jasmine.createSpyObj('CotizacionServicioService', [
      'listar',
      'resumenEconomico',
      'presentar',
      'aprobar'
    ]);
    cotizacionService.listar.and.returnValue(of(lista));
    cotizacionService.resumenEconomico.and.returnValue(
      of({
        ordenServicioId: 12,
        totalAutorizado: 0,
        subtotalRepuestosAprobados: 0,
        subtotalManoObraAprobados: 0,
        subtotalOtrosAprobados: 0
      })
    );
    const documentoService = jasmine.createSpyObj('DocumentoOrdenServicioService', ['listar']);
    documentoService.listar.and.returnValue(of(docs));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [ServicioCotizacionesPanelComponent, NoopAnimationsModule],
      providers: [
        { provide: CotizacionServicioService, useValue: cotizacionService },
        { provide: DocumentoOrdenServicioService, useValue: documentoService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    })
      .overrideProvider(MatDialog, { useValue: dialog })
      .overrideProvider(MatSnackBar, { useValue: jasmine.createSpyObj('MatSnackBar', ['open']) })
      .compileComponents();

    fixture = TestBed.createComponent(ServicioCotizacionesPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ordenId', 12);
    fixture.componentRef.setInput('estado', estado);
    fixture.detectChanges();
  }

  it('presentar llama al endpoint existente y pide el documento COTIZACION de esa cotización', async () => {
    await montar([cot()]);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    cotizacionService.presentar.and.returnValue(of(cot({ estado: 'PENDIENTE_APROBACION' })));
    const esperados: DocumentoCotizacionEsperado[] = [];
    component.documentoEsperado.subscribe(e => esperados.push(e));

    component.presentar(component.cotizaciones[0]);

    expect(cotizacionService.presentar).toHaveBeenCalledWith(12, 44);
    expect(esperados).toEqual([{ tipo: 'COTIZACION', cotizacionId: 44 }]);
  });

  it('diferencia visual inicial vs adicional', async () => {
    await montar(
      [
        cot({
          id: 50,
          tipo: 'ADICIONAL',
          estado: 'PENDIENTE_APROBACION',
          puedePresentar: false,
          puedeAprobar: true,
          motivoAmpliacion: 'Pieza adicional'
        })
      ],
      'REQUIERE_APROBACION_ADICIONAL'
    );
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Cotización adicional');
    expect(text).toContain('Ampliación de la propuesta inicial');
  });

  it('vigente primero y anteriores colapsadas', async () => {
    await montar(
      [
        cot({
          id: 1,
          numero: 'COT-OLD',
          estado: 'RECHAZADA',
          puedePresentar: false,
          puedeEditar: false
        }),
        cot({
          id: 2,
          numero: 'COT-NOW',
          estado: 'PENDIENTE_APROBACION',
          puedePresentar: false,
          puedeAprobar: true
        })
      ],
      'PENDIENTE_APROBACION'
    );
    expect(component.cotizacionVigente?.numero).toBe('COT-NOW');
    expect(component.cotizacionesAnteriores.length).toBe(1);
    expect(component.anterioresAbiertas).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Anteriores (1)');
    expect(fixture.nativeElement.textContent).not.toContain('COT-OLD');
  });

  it('acción primaria de borrador es Presentar (no Aprobar)', async () => {
    await montar([cot()]);
    expect(component.accionPrimariaCotizacion(component.cotizaciones[0])).toBe('presentar');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Presentar');
  });

  it('PENDIENTE: Aprobar queda en menú; primaria no es Aprobar', async () => {
    const presentada = cot({
      estado: 'PENDIENTE_APROBACION',
      puedePresentar: false,
      puedeAprobar: true,
      puedeEditar: true
    });
    await montar([presentada], 'PENDIENTE_APROBACION', [
      {
        id: 9,
        ordenServicioId: 12,
        tipoDocumento: 'COTIZACION',
        cotizacionId: 44,
        version: 1,
        nombreArchivo: 'cot.pdf',
        hashSha256: 'x',
        fechaGeneracion: '2026-01-01T00:00:00',
        usuarioGeneracion: 'admin',
        tokenDocumento: null,
        tipoDocumentoEtiqueta: 'Cotización'
      }
    ]);
    expect(component.accionPrimariaCotizacion(presentada)).toBe('ver-pdf');
    const menuBtn = fixture.nativeElement.querySelector(
      '[aria-label="Más acciones"]'
    ) as HTMLButtonElement;
    expect(menuBtn).toBeTruthy();
    menuBtn.click();
    fixture.detectChanges();
    expect(document.body.textContent).toContain('Aprobar');
    const primaryButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.card-actions > solvix-button') as NodeListOf<HTMLElement>
    ).map(b => b.textContent?.trim());
    expect(primaryButtons).not.toContain('Aprobar');
    expect(primaryButtons.some(t => t?.includes('Ver'))).toBeTrue();
  });

  it('una cotización presentada sigue siendo editable desde el menú', async () => {
    const presentada = cot({
      estado: 'PENDIENTE_APROBACION',
      puedePresentar: false,
      puedeAprobar: true
    });
    await montar([presentada], 'PENDIENTE_APROBACION');
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);

    expect(component.cotizaciones[0].puedeEditar).toBeTrue();
    component.editar(component.cotizaciones[0]);

    expect(dialog.open).toHaveBeenCalledWith(
      CotizacionFormDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({ modo: 'editar', cotizacion: presentada })
      })
    );
  });

  it('una cotización aprobada no muestra Editar como primaria', async () => {
    await montar(
      [cot({ estado: 'APROBADA', puedeEditar: false, puedePresentar: false })],
      'APROBADO'
    );
    expect(component.accionPrimariaCotizacion(component.cotizaciones[0])).toBe('ver');
    const botones = Array.from(
      fixture.nativeElement.querySelectorAll('.card-actions > solvix-button') as NodeListOf<HTMLElement>
    ).map(b => b.textContent?.trim());
    expect(botones).not.toContain('Editar');
  });

  it('resumen compacto muestra Subtotal y Total de la vigente', async () => {
    await montar([cot({ subtotal: 100000, total: 120000 })]);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Subtotal');
    expect(text).toContain('Total');
  });

  it('Presentar usa loading de solvix-button y lo libera en éxito', async () => {
    await montar([cot()]);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    const pending = new Subject<CotizacionServicioResponseDTO>();
    cotizacionService.presentar.and.returnValue(pending.asObservable());

    component.presentar(component.cotizaciones[0]);
    fixture.detectChanges();

    expect(component.accionEnCurso).toBeTrue();
    expect(component.accionTipo).toBe('presentar');
    expect(fixture.nativeElement.querySelector('.is-loading')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Presentando y generando PDF');

    pending.next(cot({ estado: 'PENDIENTE_APROBACION', puedePresentar: false }));
    pending.complete();
    fixture.detectChanges();
    expect(component.accionEnCurso).toBeFalse();
    expect(component.accionTipo).toBeNull();
  });

  it('Presentar libera loading si falla y no permite doble ejecución', async () => {
    await montar([cot()]);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
    const pending = new Subject<CotizacionServicioResponseDTO>();
    cotizacionService.presentar.and.returnValue(pending.asObservable());

    component.presentar(component.cotizaciones[0]);
    fixture.detectChanges();
    expect(component.accionEnCurso).toBeTrue();

    component.presentar(component.cotizaciones[0]);
    expect(cotizacionService.presentar).toHaveBeenCalledTimes(1);

    pending.error({ status: 500 });
    fixture.detectChanges();
    expect(component.accionEnCurso).toBeFalse();
    expect(component.accionTipo).toBeNull();
  });
});
