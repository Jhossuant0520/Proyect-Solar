import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ConsultaOtPublicaComponent } from './consulta-ot-publica';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import {
  AccionPublicaCotizacionResponseDTO,
  ConsultaCotizacionOtPublicaDTO,
  ConsultaOtPublicaDTO
} from '../../../core/models/documento-orden-servicio.models';
import { SolvixActionRevealService } from '../../../shared/services/solvix-action-reveal.service';
import { SolvixFeedbackService } from '../../../shared/services/solvix-feedback.service';
import { mensajeErrorAccionPublicaCotizacion } from './consulta-ot-publica-accion.util';

describe('ConsultaOtPublicaComponent (FASE C.2 / 3.15.9.3-C)', () => {
  let fixture: ComponentFixture<ConsultaOtPublicaComponent>;
  let component: ConsultaOtPublicaComponent;
  let documentoService: jasmine.SpyObj<DocumentoOrdenServicioService>;
  let feedback: jasmine.SpyObj<SolvixFeedbackService>;
  let actionReveal: jasmine.SpyObj<SolvixActionRevealService>;

  const contacto = {
    empresa: 'Computer & Electronic Test',
    telefono: '+57 300 0000000',
    whatsapp: '+57 300 0000001',
    direccion: 'Yondo - Antioquia',
    sitioWeb: 'http://localhost:4200'
  };

  function dtoBase(partial: Partial<ConsultaOtPublicaDTO> = {}): ConsultaOtPublicaDTO {
    return {
      numero: 'OS-2026-000001',
      estadoCodigo: 'RECEPCIONADO',
      estadoPublico: 'Recibido en taller',
      etapaPublica: 'RECEPCION',
      etapaPublicaNumero: 1,
      totalEtapasPublicas: 5,
      equipoTipo: 'PORTATIL',
      equipoMarca: 'Dell',
      equipoModelo: 'XPS',
      referenciaInterna: 'Laptop Contabilidad',
      fechaRecepcion: '2026-03-01T10:00:00',
      fechaActualizacion: '2026-03-01T10:00:00',
      cotizacionDisponible: false,
      contacto,
      mensaje: 'Consulta informativa.',
      ...partial
    };
  }

  function cotizacionPendiente(): ConsultaCotizacionOtPublicaDTO {
    return {
      numero: 'COT-1',
      fecha: '2026-03-02T12:00:00',
      lineas: [
        {
          descripcion: 'Mano de obra',
          cantidad: 1,
          precioUnitario: 80000,
          subtotal: 80000
        }
      ],
      subtotal: 80000,
      total: 80000,
      observaciones: 'Incluye revisión'
    };
  }

  function abrirCotizacionPendiente(): void {
    documentoService.consultaOtPublica.and.returnValue(
      of(
        dtoBase({
          estadoCodigo: 'PENDIENTE_APROBACION',
          cotizacionDisponible: true,
          etapaPublica: 'COTIZACION',
          etapaPublicaNumero: 3
        })
      )
    );
    documentoService.consultaCotizacionOtPublica.and.returnValue(of(cotizacionPendiente()));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-primary');
    btn?.click();
    tick();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    documentoService = jasmine.createSpyObj('DocumentoOrdenServicioService', [
      'consultaOtPublica',
      'consultaCotizacionOtPublica',
      'aprobarCotizacionOtPublica',
      'rechazarCotizacionOtPublica'
    ]);
    feedback = jasmine.createSpyObj('SolvixFeedbackService', ['success', 'error', 'info', 'warning']);
    actionReveal = jasmine.createSpyObj('SolvixActionRevealService', ['success', 'reveal', 'error']);
    documentoService.consultaOtPublica.and.returnValue(of(dtoBase()));

    await TestBed.configureTestingModule({
      imports: [ConsultaOtPublicaComponent],
      providers: [
        { provide: DocumentoOrdenServicioService, useValue: documentoService },
        { provide: SolvixFeedbackService, useValue: feedback },
        { provide: SolvixActionRevealService, useValue: actionReveal },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'token-abc' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultaOtPublicaComponent);
    component = fixture.componentInstance;
  });

  it('traduce el estado por estadoCodigo, no por etiqueta', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(
      of(
        dtoBase({
          estadoCodigo: 'DIAGNOSTICADO',
          estadoPublico: 'Etiqueta cualquiera que no debe usarse'
        })
      )
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.ux.tituloCliente).toBe('Preparando tu cotización');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Preparando tu cotización');
    expect(text).not.toContain('Etiqueta cualquiera que no debe usarse');
  }));

  it('muestra progreso por fases y no los 13 estados técnicos', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(
      of(dtoBase({ estadoCodigo: 'PENDIENTE_APROBACION', etapaPublica: 'COTIZACION' }))
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Recepción');
    expect(text).toContain('Diagnóstico');
    expect(text).toContain('Cotización y aprobación');
    expect(text).toContain('Reparación');
    expect(text).toContain('Entrega');
    expect(text).not.toContain('ESPERA_REPUESTO');
    expect(text).not.toContain('REQUIERE_APROBACION_ADICIONAL');
  }));

  it('en PENDIENTE_APROBACION permite ver cotización y acciones', fakeAsync(() => {
    abrirCotizacionPendiente();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('COT-1');
    expect(text).toContain('Mano de obra');
    expect(text).toContain('Aprobar');
    expect(text).toContain('Rechazar');
    expect(text).not.toContain('contacta al taller');
    expect(documentoService.consultaCotizacionOtPublica).toHaveBeenCalledWith('token-abc');
  }));

  it('otros estados no ofrecen cotización ni acciones', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(
      of(
        dtoBase({
          estadoCodigo: 'EN_REPARACION',
          estadoPublico: 'Pendiente de tu aprobación',
          cotizacionDisponible: false
        })
      )
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.puedeVerCotizacion).toBeFalse();
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Ver cotización');
    expect(text).not.toContain('Aprobar');
    expect(documentoService.consultaCotizacionOtPublica).not.toHaveBeenCalled();
  }));

  it('aprobar abre panel de identidad y valida vacío', fakeAsync(() => {
    abrirCotizacionPendiente();
    const aprobar: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.btn-approve');
    aprobar?.click();
    fixture.detectChanges();

    expect(component.panelAccion).toBe('aprobar');
    expect(fixture.nativeElement.textContent).toContain('¿Deseas aprobar esta cotización?');

    component.confirmarAccion();
    fixture.detectChanges();
    expect(component.errorAccion).toContain('Completa documento y teléfono');
    expect(documentoService.aprobarCotizacionOtPublica).not.toHaveBeenCalled();
  }));

  it('envía aprobación y refresca consulta', fakeAsync(() => {
    abrirCotizacionPendiente();
    component.iniciarAprobar();
    fixture.detectChanges();
    component.identidadForm.setValue({
      numeroDocumento: '1098765432',
      telefono: '300 123 4567'
    });

    const resp: AccionPublicaCotizacionResponseDTO = {
      ordenNumero: 'OS-2026-000001',
      ordenEstado: 'APROBADO',
      cotizacionNumero: 'COT-1',
      cotizacionTipo: 'INICIAL',
      cotizacionEstado: 'APROBADA',
      mensaje: 'Cotización aprobada. El taller continuará con el proceso.'
    };
    documentoService.aprobarCotizacionOtPublica.and.returnValue(of(resp));
    documentoService.consultaOtPublica.and.returnValue(
      of(
        dtoBase({
          estadoCodigo: 'APROBADO',
          cotizacionDisponible: false,
          etapaPublica: 'REPARACION'
        })
      )
    );

    component.confirmarAccion();
    tick();
    fixture.detectChanges();

    expect(documentoService.aprobarCotizacionOtPublica).toHaveBeenCalledWith('token-abc', {
      numeroDocumento: '1098765432',
      telefono: '300 123 4567'
    });
    expect(component.panelAccion).toBe('cerrado');
    expect(component.puedeVerCotizacion).toBeFalse();
    expect(component.resultadoAccion?.cotizacionEstado).toBe('APROBADA');
    expect(actionReveal.success).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Aprobar');
  }));

  it('rechazo exitoso sincroniza vista', fakeAsync(() => {
    abrirCotizacionPendiente();
    component.iniciarRechazar();
    component.identidadForm.setValue({
      numeroDocumento: '1098765432',
      telefono: '3001234567'
    });
    documentoService.rechazarCotizacionOtPublica.and.returnValue(
      of({
        ordenNumero: 'OS-2026-000001',
        ordenEstado: 'COTIZADO',
        cotizacionNumero: 'COT-1',
        cotizacionTipo: 'INICIAL',
        cotizacionEstado: 'RECHAZADA',
        mensaje: 'Cotización rechazada. El taller revisará la propuesta.'
      })
    );
    documentoService.consultaOtPublica.and.returnValue(
      of(dtoBase({ estadoCodigo: 'COTIZADO', cotizacionDisponible: false }))
    );

    component.confirmarAccion();
    tick();
    fixture.detectChanges();

    expect(documentoService.rechazarCotizacionOtPublica).toHaveBeenCalled();
    expect(component.data?.estadoCodigo).toBe('COTIZADO');
    expect(component.puedeAccionarCotizacion).toBeFalse();
  }));

  it('identidad inválida 403 muestra mensaje genérico', fakeAsync(() => {
    abrirCotizacionPendiente();
    component.iniciarAprobar();
    component.identidadForm.setValue({
      numeroDocumento: '1',
      telefono: '2'
    });
    documentoService.aprobarCotizacionOtPublica.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { message: 'No pudimos validar la información ingresada.' }
          })
      )
    );

    component.confirmarAccion();
    tick();
    fixture.detectChanges();

    expect(component.errorAccion).toContain('No pudimos validar');
    expect(component.errorAccion.toLowerCase()).not.toContain('documento incorrecto');
    expect(feedback.error).toHaveBeenCalled();
    expect(component.enviandoAccion).toBeFalse();
  }));

  it('rate limit 429 muestra mensaje orientado al usuario', fakeAsync(() => {
    abrirCotizacionPendiente();
    component.iniciarAprobar();
    component.identidadForm.setValue({
      numeroDocumento: '1098765432',
      telefono: '3001234567'
    });
    documentoService.aprobarCotizacionOtPublica.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 429 }))
    );

    component.confirmarAccion();
    tick();
    fixture.detectChanges();

    expect(component.errorAccion).toContain('límite de intentos');
    expect(component.errorAccion).not.toContain('429');
  }));

  it('bloquea doble submit mientras envía', fakeAsync(() => {
    abrirCotizacionPendiente();
    component.iniciarAprobar();
    component.identidadForm.setValue({
      numeroDocumento: '1098765432',
      telefono: '3001234567'
    });
    const pending = new Subject<AccionPublicaCotizacionResponseDTO>();
    documentoService.aprobarCotizacionOtPublica.and.returnValue(pending.asObservable());
    documentoService.consultaOtPublica.and.returnValue(
      of(dtoBase({ estadoCodigo: 'APROBADO', cotizacionDisponible: false }))
    );

    component.confirmarAccion();
    expect(component.enviandoAccion).toBeTrue();
    component.confirmarAccion();
    expect(documentoService.aprobarCotizacionOtPublica).toHaveBeenCalledTimes(1);

    pending.next({
      ordenNumero: 'OS-1',
      ordenEstado: 'APROBADO',
      cotizacionNumero: 'COT-1',
      cotizacionTipo: 'INICIAL',
      cotizacionEstado: 'APROBADA',
      mensaje: 'ok'
    });
    pending.complete();
    tick();
    expect(component.enviandoAccion).toBeFalse();
  }));

  it('muestra contacto del taller y alias como Referencia', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(
      of(dtoBase({ estadoCodigo: 'LISTO', cotizacionDisponible: false }))
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Contacto del taller');
    expect(text).toContain('+57 300 0000000');
    expect(text).toContain('Referencia');
    expect(text).toContain('Laptop Contabilidad');
  }));

  it('muestra error si el token no existe', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.state).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('No pudimos mostrar la orden');
  }));

  it('D.12: carga pública con token válido sin auth', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(
      of(dtoBase({ numero: 'OS-2026-000018', estadoCodigo: 'RECEPCIONADO' }))
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.token).toBe('token-abc');
    expect(component.state).toBe('ready');
    expect(documentoService.consultaOtPublica).toHaveBeenCalledWith('token-abc');
  }));

  it('D.12: token vacío → sin-token', async () => {
    TestBed.resetTestingModule();
    const emptyTokenService = jasmine.createSpyObj('DocumentoOrdenServicioService', [
      'consultaOtPublica',
      'consultaCotizacionOtPublica',
      'aprobarCotizacionOtPublica',
      'rechazarCotizacionOtPublica'
    ]);
    await TestBed.configureTestingModule({
      imports: [ConsultaOtPublicaComponent],
      providers: [
        { provide: DocumentoOrdenServicioService, useValue: emptyTokenService },
        { provide: SolvixFeedbackService, useValue: feedback },
        { provide: SolvixActionRevealService, useValue: actionReveal },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '' } } }
        }
      ]
    }).compileComponents();

    const emptyFixture = TestBed.createComponent(ConsultaOtPublicaComponent);
    emptyFixture.detectChanges();
    expect(emptyFixture.componentInstance.state).toBe('sin-token');
    expect(emptyTokenService.consultaOtPublica).not.toHaveBeenCalled();
  });
});

describe('mensajeErrorAccionPublicaCotizacion', () => {
  it('mapea 403/429/409 sin filtrar campos', () => {
    expect(
      mensajeErrorAccionPublicaCotizacion(
        new HttpErrorResponse({
          status: 403,
          error: { message: 'No pudimos validar la información ingresada.' }
        })
      )
    ).toContain('No pudimos validar');
    expect(mensajeErrorAccionPublicaCotizacion(new HttpErrorResponse({ status: 429 }))).toContain(
      'límite de intentos'
    );
    expect(mensajeErrorAccionPublicaCotizacion(new HttpErrorResponse({ status: 409 }))).toContain(
      'ya no está pendiente'
    );
  });
});
