import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import {
  CotizacionComercialListComponent,
  DEBOUNCE_BUSQUEDA_COTIZACIONES_MS,
  TAMANO_PAGINA_COTIZACIONES
} from './cotizacion-comercial-list';
import { CotizacionComercialService } from '../../../../core/services/cotizacion-comercial.service';
import { CotizacionComercialResumenDTO, PaginaResponseDTO } from '../../../../core/models/cotizacion-comercial.models';

function pagina(
  contenido: CotizacionComercialResumenDTO[],
  extra: Partial<PaginaResponseDTO<CotizacionComercialResumenDTO>> = {}
): PaginaResponseDTO<CotizacionComercialResumenDTO> {
  return { contenido, pagina: 0, tamano: 20, totalElementos: contenido.length, totalPaginas: 1, ...extra };
}

const COT: CotizacionComercialResumenDTO = {
  id: 3,
  numero: 'CC-2026-000003',
  clienteNombre: 'Carla Mora',
  estado: 'PENDIENTE_APROBACION',
  fecha: '2026-09-20T10:00:00',
  total: 585000
};

describe('CotizacionComercialListComponent', () => {
  let fixture: ComponentFixture<CotizacionComercialListComponent>;
  let service: jasmine.SpyObj<CotizacionComercialService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('CotizacionComercialService', ['listar']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.listar.and.returnValue(of(pagina([COT], { totalElementos: 45, totalPaginas: 3 })));
    await TestBed.configureTestingModule({
      imports: [CotizacionComercialListComponent],
      providers: [
        { provide: CotizacionComercialService, useValue: service },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CotizacionComercialListComponent);
  });

  it('carga la primera página y muestra número, cliente y estado', () => {
    fixture.detectChanges();
    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({ pagina: 0, tamano: TAMANO_PAGINA_COTIZACIONES }));
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('CC-2026-000003');
    expect(text).toContain('Carla Mora');
    expect(text).toContain('Pendiente de aprobación');
    expect(text).toContain('página 1 de 3');
  });

  it('busca en servidor con debounce y reinicia a la página 0', fakeAsync(() => {
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp.irAPagina(1);
    expect(comp.pagina).toBe(1);

    const input = fixture.nativeElement.querySelector('input[type=search]') as HTMLInputElement;
    input.value = 'carla';
    input.dispatchEvent(new Event('input'));
    tick(DEBOUNCE_BUSQUEDA_COTIZACIONES_MS);

    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({ q: 'carla', pagina: 0 }));
  }));

  it('filtra por estado y navega al detalle y a nueva', () => {
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'APROBADA';
    select.dispatchEvent(new Event('change'));
    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({ estado: 'APROBADA' }));

    fixture.componentInstance.ver(COT);
    expect(router.navigate).toHaveBeenCalledWith(['/cotizaciones', 3]);
    fixture.componentInstance.nueva();
    expect(router.navigate).toHaveBeenCalledWith(['/cotizaciones/nueva']);
  });
});
