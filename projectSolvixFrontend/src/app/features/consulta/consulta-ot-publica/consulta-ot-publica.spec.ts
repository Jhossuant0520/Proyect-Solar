import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConsultaOtPublicaComponent } from './consulta-ot-publica';
import { DocumentoOrdenServicioService } from '../../../core/services/documento-orden-servicio.service';
import {
  ConsultaCotizacionOtPublicaDTO,
  ConsultaOtPublicaDTO
} from '../../../core/models/documento-orden-servicio.models';

describe('ConsultaOtPublicaComponent (FASE C.2)', () => {
  let fixture: ComponentFixture<ConsultaOtPublicaComponent>;
  let component: ConsultaOtPublicaComponent;
  let documentoService: jasmine.SpyObj<DocumentoOrdenServicioService>;

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

  beforeEach(async () => {
    documentoService = jasmine.createSpyObj('DocumentoOrdenServicioService', [
      'consultaOtPublica',
      'consultaCotizacionOtPublica'
    ]);
    documentoService.consultaOtPublica.and.returnValue(of(dtoBase()));

    await TestBed.configureTestingModule({
      imports: [ConsultaOtPublicaComponent],
      providers: [
        { provide: DocumentoOrdenServicioService, useValue: documentoService },
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

  it('en PENDIENTE_APROBACION permite ver cotización real', fakeAsync(() => {
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
    const cot: ConsultaCotizacionOtPublicaDTO = {
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
    documentoService.consultaCotizacionOtPublica.and.returnValue(of(cot));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-primary');
    expect(btn?.textContent?.trim()).toBe('Ver cotización');
    btn?.click();
    tick();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('COT-1');
    expect(text).toContain('Mano de obra');
    expect(text).toContain('Incluye revisión');
    expect(documentoService.consultaCotizacionOtPublica).toHaveBeenCalledWith('token-abc');
  }));

  it('otros estados no ofrecen cotización aunque el label diga aprobación', fakeAsync(() => {
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
    expect(documentoService.consultaCotizacionOtPublica).not.toHaveBeenCalled();
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
    expect(text).toContain('+57 300 0000001');
    expect(text).toContain('Yondo - Antioquia');
    expect(text).toContain('Referencia');
    expect(text).toContain('Laptop Contabilidad');
    expect(text).not.toContain('tecnico');
    expect(text).not.toContain('costo interno');
  }));

  it('muestra error si el token no existe', fakeAsync(() => {
    documentoService.consultaOtPublica.and.returnValue(throwError(() => ({ status: 404 })));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.state).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('No pudimos mostrar la orden');
  }));
});
