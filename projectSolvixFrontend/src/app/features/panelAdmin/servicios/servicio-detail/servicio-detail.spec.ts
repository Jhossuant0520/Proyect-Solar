import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServicioDetailComponent } from './servicio-detail';
import { OrdenServicioService } from '../../../../core/services/orden-servicio.service';
import { CotizacionServicioService } from '../../../../core/services/cotizacion-servicio.service';
import { DocumentoOrdenServicioService } from '../../../../core/services/documento-orden-servicio.service';
import {
  HistorialEstadoOrdenServicioResponseDTO,
  OrdenServicioResponseDTO,
  TransicionOrdenServicioResponseDTO
} from '../../../../core/models/orden-servicio.models';
import { SolvixFeedbackService } from '../../../../shared/services/solvix-feedback.service';
import { SolvixActionRevealService } from '../../../../shared/services/solvix-action-reveal.service';
import { environment } from '../../../../../environments/environment';
import { MSG_TELEFONO_INVALIDO_WHATSAPP } from '../whatsapp-asistido.util';

function ordenBase(parcial: Partial<OrdenServicioResponseDTO> = {}): OrdenServicioResponseDTO {
  return {
    id: 12,
    numero: 'OS-2026-000012',
    clienteId: 4,
    clienteNombre: 'Ana Ruiz',
    clienteTelefono: '3001234567',
    tokenConsulta: 'tokendeprueba1234567890abcdef12',
    equipoId: 9,
    equipoTipo: 'PORTATIL',
    equipoMarca: 'Dell',
    equipoModelo: 'XPS',
    equipoNombre: 'Notebook',
    estado: 'RECEPCIONADO',
    problemaReportado: 'No enciende',
    diagnostico: null,
    trabajoRealizado: null,
    observaciones: 'Urgente',
    fechaRecepcion: '2026-03-01T10:00:00',
    fechaActualizacion: '2026-03-01T10:00:00',
    fechaCierre: null,
    createdBy: 'admin',
    ...parcial
  };
}

function transicion(
  orden: OrdenServicioResponseDTO,
  parcial: Partial<TransicionOrdenServicioResponseDTO> = {}
): TransicionOrdenServicioResponseDTO {
  return {
    orden,
    estadoAnterior: 'RECEPCIONADO',
    estadoNuevo: orden.estado,
    motivo: '',
    observacion: null,
    usuario: 'admin',
    fechaCambio: '2026-03-01T11:00:00',
    mensaje: 'OK',
    ...parcial
  };
}

describe('ServicioDetailComponent — workflow', () => {
  let fixture: ComponentFixture<ServicioDetailComponent>;
  let component: ServicioDetailComponent;
  let ordenService: jasmine.SpyObj<OrdenServicioService>;
  let cotizacionService: jasmine.SpyObj<CotizacionServicioService>;
  let documentoService: jasmine.SpyObj<DocumentoOrdenServicioService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let feedback: jasmine.SpyObj<SolvixFeedbackService>;
  let router: Router;

  beforeEach(async () => {
    ordenService = jasmine.createSpyObj('OrdenServicioService', [
      'obtenerPorId',
      'actualizar',
      'cambiarEstado',
      'completarDiagnostico',
      'completarReparacion',
      'registrarNuevaFalla',
      'listarHistorial',
      'listarRepuestos'
    ]);
    cotizacionService = jasmine.createSpyObj('CotizacionServicioService', [
      'listar',
      'resumenEconomico',
      'crearInicial',
      'crearAdicional',
      'actualizar',
      'presentar',
      'aprobar',
      'rechazar',
      'eliminarBorrador'
    ]);
    documentoService = jasmine.createSpyObj('DocumentoOrdenServicioService', [
      'listar',
      'descargarPdf',
      'regenerar',
      'asegurarComprobanteRecepcion',
      'generarCotizacionPdf',
      'generarActaEntrega',
      'abrirPdfEnNuevaPestana',
      'descargarBlobComoArchivo'
    ]);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    feedback = jasmine.createSpyObj('SolvixFeedbackService', [
      'success',
      'error',
      'info',
      'warning'
    ]);
    const actionReveal = jasmine.createSpyObj('SolvixActionRevealService', [
      'success',
      'reveal',
      'error'
    ]);
    ordenService.obtenerPorId.and.returnValue(of(ordenBase()));
    ordenService.listarHistorial.and.returnValue(of([]));
    ordenService.listarRepuestos.and.returnValue(of([]));
    cotizacionService.listar.and.returnValue(of([]));
    cotizacionService.resumenEconomico.and.returnValue(
      of({
        ordenServicioId: 12,
        totalAutorizado: 0,
        subtotalRepuestosAprobados: 0,
        subtotalManoObraAprobados: 0,
        subtotalOtrosAprobados: 0
      })
    );
    documentoService.listar.and.returnValue(of([]));
    ordenService.actualizar.and.returnValue(
      of(ordenBase({ diagnostico: 'Fuente dañada', problemaReportado: 'No enciende' }))
    );
    ordenService.cambiarEstado.and.returnValue(
      of(transicion(ordenBase({ estado: 'EN_DIAGNOSTICO' })))
    );
    ordenService.completarDiagnostico.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'DIAGNOSTICADO', diagnostico: 'Fuente dañada' }), {
          estadoAnterior: 'EN_DIAGNOSTICO',
          estadoNuevo: 'DIAGNOSTICADO'
        })
      )
    );
    ordenService.completarReparacion.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'LISTO', trabajoRealizado: 'Cambio de fuente' }), {
          estadoAnterior: 'EN_REPARACION',
          estadoNuevo: 'LISTO'
        })
      )
    );
    ordenService.registrarNuevaFalla.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'REQUIERE_APROBACION_ADICIONAL' }), {
          estadoAnterior: 'EN_REPARACION',
          estadoNuevo: 'REQUIERE_APROBACION_ADICIONAL'
        })
      )
    );

    await TestBed.configureTestingModule({
      imports: [ServicioDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => '12' },
              queryParamMap: { get: () => null }
            }
          }
        },
        { provide: OrdenServicioService, useValue: ordenService },
        { provide: CotizacionServicioService, useValue: cotizacionService },
        { provide: DocumentoOrdenServicioService, useValue: documentoService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
        { provide: SolvixFeedbackService, useValue: feedback },
        { provide: SolvixActionRevealService, useValue: actionReveal }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ServicioDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('muestra los cuatro campos técnicos con hints', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Problema reportado');
    expect(text).toContain('Diagnóstico');
    expect(text).toContain('Trabajo realizado');
    expect(text).toContain('Observaciones');
    expect(text).toContain('No enciende');
  }));

  it('RECEPCIONADO: Iniciar diagnóstico llama cambiarEstado sin motivo y sin bloqueo de error', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal?.boton).toBe('Iniciar diagnóstico');
    expect(component.estadoError).toBe('');
    expect(component.guiaTecnica).toBe('');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Iniciar diagnóstico');
    expect(text).not.toContain('bloqueo');

    component.ejecutarAccionPrincipal();
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(ordenService.cambiarEstado).toHaveBeenCalledWith(12, {
      nuevoEstado: 'EN_DIAGNOSTICO'
    });
    expect(ordenService.cambiarEstado).not.toHaveBeenCalledWith(
      12,
      jasmine.objectContaining({ motivo: jasmine.anything() })
    );
  }));

  it('no abre modal de motivo genérico al iniciar diagnóstico', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.ejecutarAccionPrincipal();
    tick();
    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('EN_DIAGNOSTICO: Guardar diagnóstico llama completarDiagnostico', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'EN_DIAGNOSTICO', diagnostico: null }))
    );
    fixture.detectChanges();
    tick();

    expect(component.accionPrincipal?.boton).toBe('Registrar diagnóstico');
    expect(component.accionPrincipal?.destino).toBe('DIAGNOSTICADO');

    component.iniciarEdicion();
    component.form.controls.diagnostico.setValue('Fuente dañada');
    component.guardarTextos();
    tick();

    expect(ordenService.completarDiagnostico).toHaveBeenCalledWith(12, {
      problemaReportado: 'No enciende',
      diagnostico: 'Fuente dañada',
      trabajoRealizado: null,
      observaciones: 'Urgente'
    });
    expect(ordenService.cambiarEstado).not.toHaveBeenCalled();
    expect(component.orden?.estado).toBe('DIAGNOSTICADO');
  }));

  it('tras iniciar diagnóstico enfoca la guía de ficha técnica', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.ejecutarAccionPrincipal();
    tick();
    flushMicrotasks();
    expect(component.orden?.estado).toBe('EN_DIAGNOSTICO');
    expect(component.editando).toBeTrue();
    expect(component.guiaTecnica).toContain('diagnóstico');
  }));

  it('COTIZADO muestra CTA de presentar cotización (no aprobación directa)', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'COTIZADO' })));
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Presentar cotización');
    expect(text).toContain('Cotizaciones');
    expect(component.accionPrincipal?.destino).toBe('PENDIENTE_APROBACION');
    expect(component.accionPrincipal?.boton).toBe('Presentar cotización');
  }));

  it('DIAGNOSTICADO muestra preparar cotización y sección económica', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'DIAGNOSTICADO' })));
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal?.boton).toBe('Preparar cotización');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Cotizaciones');
    expect(text).toContain('Preparar la cotización inicial');
    expect(cotizacionService.listar).toHaveBeenCalledWith(12);
  }));

  it('muestra sección Documentos e invoca listado', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Documentos');
    expect(text).not.toContain('Documentación');
    expect(documentoService.listar).toHaveBeenCalledWith(12);
  }));

  it('D.11: no renderiza la card de Repuestos y sí Cotizaciones/Documentos', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent as string;
    expect(root.querySelector('app-servicio-repuestos-panel')).toBeNull();
    expect(text).not.toMatch(/Inventario\s*Repuestos/);
    expect(text).toContain('Cotizaciones');
    expect(text).toContain('Documentos');
    expect(text).toContain('Sección técnica');
    expect(ordenService.listarRepuestos).toHaveBeenCalledWith(12);
  }));

  it('PENDIENTE_APROBACION muestra registrar respuesta del cliente', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'PENDIENTE_APROBACION' }))
    );
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal?.boton).toBe('Registrar respuesta del cliente');
    expect(component.ux.siguienteTaller).toContain('respuesta del cliente');
  }));

  it('Marcar listo sin trabajo realizado muestra guía técnica', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'EN_REPARACION', trabajoRealizado: null }))
    );
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal?.boton).toBe('Marcar como listo');

    component.ejecutarAccionPrincipal();
    tick();

    expect(ordenService.completarReparacion).not.toHaveBeenCalled();
    expect(component.editando).toBeTrue();
    expect(component.guiaTecnica).toContain('trabajo realizado');
  }));

  it('EN_REPARACION tiene nueva falla en menú Más acciones', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'EN_REPARACION' })));
    fixture.detectChanges();
    tick();
    expect(component.accionFalla?.destino).toBe('REQUIERE_APROBACION_ADICIONAL');
    expect(component.accionFalla?.boton).toBe('Registrar nueva falla');
    expect(component.hayMenuMasAcciones).toBeTrue();
  }));

  it('muestra actividad reciente del historial', fakeAsync(() => {
    const hist: HistorialEstadoOrdenServicioResponseDTO[] = [
      {
        id: 1,
        ordenServicioId: 12,
        estadoAnterior: 'RECEPCIONADO',
        estadoNuevo: 'EN_DIAGNOSTICO',
        motivo: 'Inicio',
        observacion: null,
        usuario: 'admin',
        fechaCambio: '2026-03-01T11:00:00'
      }
    ];
    ordenService.listarHistorial.and.returnValue(of(hist));
    fixture.detectChanges();
    tick();
    component.abrirSeccion('actividad');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Actividad reciente');
    expect(text).toContain('Inicio');
    expect(text).toContain('admin');
    expect(ordenService.listarHistorial).toHaveBeenCalledWith(12);
  }));

  it('muestra Siguiente paso y progreso de 5 fases', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Siguiente paso');
    expect(text).toContain('Recepción');
    expect(text).toContain('Iniciar diagnóstico');
    expect(text).not.toContain('Estado actual:');
  }));

  it('permite editar y guardar textos fuera de diagnóstico', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'COTIZADO', diagnostico: 'Fuente dañada' }))
    );
    ordenService.actualizar.and.returnValue(
      of(ordenBase({ estado: 'COTIZADO', diagnostico: 'Fuente dañada', observaciones: 'Nota taller' }))
    );
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    component.form.controls.observaciones.setValue('Nota taller');
    component.guardarTextos();
    tick();
    expect(ordenService.actualizar).toHaveBeenCalled();
    expect(ordenService.completarDiagnostico).not.toHaveBeenCalled();
  }));

  it('D.13: RECEPCIONADO + diagnóstico al guardar llama completarDiagnostico (no actualizar)', fakeAsync(() => {
    ordenService.completarDiagnostico.and.returnValue(
      of(
        transicion(ordenBase({ estado: 'DIAGNOSTICADO', diagnostico: 'Fuente dañada' }), {
          estadoAnterior: 'EN_DIAGNOSTICO',
          estadoNuevo: 'DIAGNOSTICADO'
        })
      )
    );
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    component.form.controls.diagnostico.setValue('Fuente dañada');
    component.form.controls.trabajoRealizado.setValue('Cambio de fuente');
    component.guardarTextos();
    tick();
    expect(ordenService.completarDiagnostico).toHaveBeenCalledWith(12, {
      problemaReportado: 'No enciende',
      diagnostico: 'Fuente dañada',
      trabajoRealizado: 'Cambio de fuente',
      observaciones: 'Urgente'
    });
    expect(ordenService.actualizar).not.toHaveBeenCalled();
    expect(component.orden?.estado).toBe('DIAGNOSTICADO');
  }));

  it('modo lectura en CERRADO', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'CERRADO', fechaCierre: '2026-03-10T12:00:00' }))
    );
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal).toBeNull();
    expect(component.puedeEditar(component.orden!.estado)).toBeFalse();
  }));

  it('muestra error humano al fallar el guardado', fakeAsync(() => {
    ordenService.obtenerPorId.and.returnValue(
      of(ordenBase({ estado: 'COTIZADO', diagnostico: 'Fuente dañada' }))
    );
    ordenService.actualizar.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'No se puede editar una orden CERRADO.' }
          })
      )
    );
    fixture.detectChanges();
    tick();
    component.iniciarEdicion();
    component.form.controls.observaciones.setValue('Nuevo');
    component.guardarTextos();
    tick();
    expect(component.editError).toContain('cerrada o cancelada');
  }));

  it('vuelve al listado', () => {
    const navigate = spyOn(router, 'navigate');
    component.volver();
    expect(navigate).toHaveBeenCalledWith(['/servicios']);
  });

  it('expone sticky CTA y CTA desktop cuando hay acción principal', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.accionPrincipal).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sticky-cta')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.siguiente-actions--desktop')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sticky-cta')?.getAttribute('aria-label')).toBe(
      'Acción principal'
    );
  }));

  describe('WhatsApp asistido', () => {
    it('muestra botón WhatsApp en RECEPCIONADO', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(component.mostrarWhatsAppRecepcion).toBeTrue();
      expect(component.puedePrepararWhatsApp).toBeTrue();
      expect(fixture.nativeElement.querySelector('.btn-whatsapp')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('WhatsApp');
    }));

    it('sin teléfono válido no abre wa.me y avisa', fakeAsync(() => {
      ordenService.obtenerPorId.and.returnValue(
        of(ordenBase({ clienteTelefono: null }))
      );
      const open = spyOn(window, 'open');
      fixture.detectChanges();
      tick();
      expect(component.puedePrepararWhatsApp).toBeFalse();
      component.prepararWhatsApp('recepcion');
      expect(open).not.toHaveBeenCalled();
      expect(feedback.warning).toHaveBeenCalledWith(MSG_TELEFONO_INVALIDO_WHATSAPP);
    }));

    it('abre recepción con URL pública y número CO', fakeAsync(() => {
      const open = spyOn(window, 'open');
      fixture.detectChanges();
      tick();
      const estadoAntes = component.orden?.estado;
      component.prepararWhatsApp('recepcion');
      expect(open).toHaveBeenCalled();
      const href = open.calls.mostRecent().args[0] as string;
      expect(href.startsWith('https://wa.me/573001234567?text=')).toBeTrue();
      const texto = decodeURIComponent(href.split('text=')[1]);
      expect(texto).toContain('Ana Ruiz');
      expect(texto).toContain('OS-2026-000012');
      expect(texto).toContain(
        `${environment.publicWebBaseUrl}/consulta/ot/tokendeprueba1234567890abcdef12`
      );
      expect(component.orden?.estado).toBe(estadoAntes);
      expect(cotizacionService.listar).not.toHaveBeenCalled();
    }));

    it('cotización solo en PENDIENTE_APROBACION y usa número de cotización', fakeAsync(() => {
      ordenService.obtenerPorId.and.returnValue(
        of(ordenBase({ estado: 'PENDIENTE_APROBACION' }))
      );
      cotizacionService.listar.and.returnValue(
        of([
          {
            id: 7,
            ordenServicioId: 12,
            numero: 'COT-2026-000099',
            tipo: 'INICIAL',
            estado: 'PENDIENTE_APROBACION',
            total: 100000,
            puedePresentar: false,
            puedeAprobar: true,
            puedeEditar: true
          } as never
        ])
      );
      const open = spyOn(window, 'open');
      fixture.detectChanges();
      tick();
      expect(component.mostrarWhatsAppCotizacion).toBeTrue();
      expect(component.mostrarWhatsAppEquipoListo).toBeFalse();
      component.prepararWhatsApp('cotizacion');
      tick();
      expect(cotizacionService.listar).toHaveBeenCalledWith(12);
      const href = open.calls.mostRecent().args[0] as string;
      const texto = decodeURIComponent(href.split('text=')[1]);
      expect(texto).toContain('COT-2026-000099');
      expect(texto).toContain('cotización de tu equipo ya se encuentra disponible');
    }));

    it('equipo listo en LISTO; no disponible en RECEPCIONADO', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(component.mostrarWhatsAppEquipoListo).toBeFalse();

      ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'LISTO' })));
      fixture.detectChanges();
      component.cargar();
      tick();
      expect(component.mostrarWhatsAppEquipoListo).toBeTrue();
      const open = spyOn(window, 'open');
      component.prepararWhatsApp('equipoListo');
      const texto = decodeURIComponent((open.calls.mostRecent().args[0] as string).split('text=')[1]);
      expect(texto).toContain('listo para entrega');
      expect(texto).not.toContain('recogerlo hoy');
    }));

    it('CANCELADO no muestra opciones WhatsApp', fakeAsync(() => {
      ordenService.obtenerPorId.and.returnValue(of(ordenBase({ estado: 'CANCELADO' })));
      fixture.detectChanges();
      tick();
      expect(component.hayOpcionesWhatsApp).toBeFalse();
      expect(fixture.nativeElement.querySelector('.btn-whatsapp')).toBeFalsy();
    }));

    it('sin tokenConsulta no abre wa.me', fakeAsync(() => {
      ordenService.obtenerPorId.and.returnValue(of(ordenBase({ tokenConsulta: null })));
      const open = spyOn(window, 'open');
      fixture.detectChanges();
      tick();
      component.prepararWhatsApp('recepcion');
      expect(open).not.toHaveBeenCalled();
      expect(feedback.warning).toHaveBeenCalled();
    }));

    it('avisarWhatsAppSiNoListo al abrir menú sin teléfono', fakeAsync(() => {
      ordenService.obtenerPorId.and.returnValue(of(ordenBase({ clienteTelefono: '' })));
      fixture.detectChanges();
      tick();
      component.avisarWhatsAppSiNoListo();
      expect(feedback.warning).toHaveBeenCalledWith(MSG_TELEFONO_INVALIDO_WHATSAPP);
    }));

    it('elige la última cotización PENDIENTE_APROBACION e ignora otras', fakeAsync(() => {
      ordenService.obtenerPorId.and.returnValue(
        of(ordenBase({ estado: 'PENDIENTE_APROBACION' }))
      );
      cotizacionService.listar.and.returnValue(
        of([
          {
            id: 1,
            ordenServicioId: 12,
            numero: 'COT-OLD-APROBADA',
            tipo: 'INICIAL',
            estado: 'APROBADA',
            total: 1,
            puedePresentar: false,
            puedeAprobar: false,
            puedeEditar: false
          } as never,
          {
            id: 2,
            ordenServicioId: 12,
            numero: 'COT-BORRADOR',
            tipo: 'ADICIONAL',
            estado: 'BORRADOR',
            total: 1,
            puedePresentar: true,
            puedeAprobar: false,
            puedeEditar: true
          } as never,
          {
            id: 3,
            ordenServicioId: 12,
            numero: 'COT-PEND-1',
            tipo: 'ADICIONAL',
            estado: 'PENDIENTE_APROBACION',
            total: 1,
            puedePresentar: false,
            puedeAprobar: true,
            puedeEditar: true
          } as never,
          {
            id: 4,
            ordenServicioId: 12,
            numero: 'COT-PEND-2',
            tipo: 'ADICIONAL',
            estado: 'PENDIENTE_APROBACION',
            total: 1,
            puedePresentar: false,
            puedeAprobar: true,
            puedeEditar: true
          } as never,
          {
            id: 5,
            ordenServicioId: 12,
            numero: 'COT-RECHAZADA',
            tipo: 'ADICIONAL',
            estado: 'RECHAZADA',
            total: 1,
            puedePresentar: false,
            puedeAprobar: false,
            puedeEditar: false
          } as never
        ])
      );
      const open = spyOn(window, 'open');
      fixture.detectChanges();
      tick();
      component.prepararWhatsApp('cotizacion');
      tick();
      const texto = decodeURIComponent((open.calls.mostRecent().args[0] as string).split('text=')[1]);
      expect(texto).toContain('COT-PEND-2');
      expect(texto).not.toContain('COT-OLD-APROBADA');
      expect(texto).not.toContain('COT-BORRADOR');
      expect(texto).not.toContain('COT-RECHAZADA');
    }));
  });
});
