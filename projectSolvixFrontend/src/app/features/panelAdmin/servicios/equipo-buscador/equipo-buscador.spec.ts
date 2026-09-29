import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { EquipoBuscadorComponent, DEBOUNCE_BUSQUEDA_EQUIPO_MS } from './equipo-buscador';
import { EquipoService } from '../../../../core/services/equipo.service';
import { EquipoResponseDTO } from '../../../../core/models/equipo.models';

const equipo: EquipoResponseDTO = {
  id: 9,
  clienteId: 4,
  clienteNombre: 'Ana Ruiz',
  tipoEquipo: 'PORTATIL',
  marca: 'Lenovo',
  modelo: 'ThinkPad',
  numeroSerie: 'ABC123',
  referenciaInterna: null,
  observaciones: null,
  activo: true,
  fechaRegistro: null
};

describe('EquipoBuscadorComponent', () => {
  let fixture: ComponentFixture<EquipoBuscadorComponent>;
  let component: EquipoBuscadorComponent;
  let equipoService: jasmine.SpyObj<EquipoService>;

  beforeEach(async () => {
    equipoService = jasmine.createSpyObj('EquipoService', ['buscar', 'listar']);
    await TestBed.configureTestingModule({
      imports: [EquipoBuscadorComponent],
      providers: [{ provide: EquipoService, useValue: equipoService }]
    }).compileComponents();
    fixture = TestBed.createComponent(EquipoBuscadorComponent);
    component = fixture.componentInstance;
    component.clienteId = 4;
    fixture.detectChanges();
  });

  function escribir(texto: string): void {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  }

  it('no lista el catálogo completo: busca con debounce y mínimo 2 caracteres', fakeAsync(() => {
    equipoService.buscar.and.returnValue(of([equipo]));
    escribir('A');
    tick(DEBOUNCE_BUSQUEDA_EQUIPO_MS);
    expect(equipoService.buscar.calls.allArgs().every(a => a[0] === '')).toBeTrue();
    expect(equipoService.listar).not.toHaveBeenCalled();

    equipoService.buscar.calls.reset();
    escribir('AB');
    tick(DEBOUNCE_BUSQUEDA_EQUIPO_MS);
    fixture.detectChanges();
    expect(equipoService.buscar).toHaveBeenCalledWith('AB', 10, 4, true);
    expect(fixture.nativeElement.textContent).toContain('Lenovo');
    expect(fixture.nativeElement.textContent).toContain('ABC123');
  }));

  it('D.3: focus carga preview de equipos del cliente (últimos registros)', fakeAsync(() => {
    equipoService.buscar.and.returnValue(of([equipo]));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    tick();
    fixture.detectChanges();
    expect(equipoService.buscar).toHaveBeenCalledWith('', 5, 4, true);
    expect(component.estado).toBe('preview');
    expect(fixture.nativeElement.textContent).toContain('Últimos registros');
  }));

  it('permite seleccionar con teclado Enter', fakeAsync(() => {
    equipoService.buscar.and.returnValue(of([equipo]));
    const emitidos: (EquipoResponseDTO | null)[] = [];
    component.seleccionadoChange.subscribe(e => emitidos.push(e));
    escribir('len');
    tick(DEBOUNCE_BUSQUEDA_EQUIPO_MS);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(emitidos[0]?.id).toBe(9);
    expect(fixture.nativeElement.querySelector('.elegido')?.textContent).toContain('Lenovo');
  }));

  it('bloquea búsqueda sin cliente', fakeAsync(() => {
    component.clienteId = null;
    component.ngOnChanges({
      clienteId: {
        previousValue: 4,
        currentValue: null,
        firstChange: false,
        isFirstChange: () => false
      }
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Primero elige un cliente');
  }));
});
