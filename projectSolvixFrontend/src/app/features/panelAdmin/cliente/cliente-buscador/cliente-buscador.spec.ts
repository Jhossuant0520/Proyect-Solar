import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ClienteBuscadorComponent, DEBOUNCE_BUSQUEDA_CLIENTE_MS } from './cliente-buscador';
import { ClienteService } from '../../../../core/services/cliente.service';
import { ClienteResponseDTO } from '../../../../core/models/cliente.models';

function cliente(parcial: Partial<ClienteResponseDTO> = {}): ClienteResponseDTO {
  return {
    id: 5,
    nombre: 'Carla Mora',
    tipoCliente: 'PERSONA',
    consumidorFinal: false,
    tipoDocumento: 'CC',
    numeroDocumento: '1010',
    email: null,
    telefono: '3001234567',
    notas: null,
    activo: true,
    fechaRegistro: null,
    ...parcial
  };
}

describe('ClienteBuscadorComponent', () => {
  let fixture: ComponentFixture<ClienteBuscadorComponent>;
  let component: ClienteBuscadorComponent;
  let clienteService: jasmine.SpyObj<ClienteService>;

  beforeEach(async () => {
    clienteService = jasmine.createSpyObj<ClienteService>('ClienteService', ['buscar', 'listar']);
    await TestBed.configureTestingModule({
      imports: [ClienteBuscadorComponent],
      providers: [{ provide: ClienteService, useValue: clienteService }]
    }).compileComponents();
    fixture = TestBed.createComponent(ClienteBuscadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function escribir(texto: string): void {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  }

  it('no descarga el listado completo: busca en servidor con debounce y límite', fakeAsync(() => {
    clienteService.buscar.and.returnValue(of([
      cliente(),
      cliente({ id: 1, nombre: 'Consumidor final', tipoCliente: 'CONSUMIDOR_FINAL', consumidorFinal: true })
    ]));
    expect(clienteService.listar).not.toHaveBeenCalled();

    escribir('c');
    tick(DEBOUNCE_BUSQUEDA_CLIENTE_MS);
    // 1 carácter: solo preview (q vacío), nunca búsqueda textual con "c"
    const argsCorto = clienteService.buscar.calls.allArgs();
    expect(argsCorto.every(a => a[0] === '')).toBeTrue();

    clienteService.buscar.calls.reset();
    escribir('ca');
    tick(100);
    escribir('carl');
    tick(DEBOUNCE_BUSQUEDA_CLIENTE_MS);
    fixture.detectChanges();

    expect(clienteService.buscar).toHaveBeenCalledWith('carl', 8);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Carla Mora');
    expect(text).not.toContain('Consumidor final”');
    expect(component.resultados.length).toBe(1);
  }));

  it('D.3: focus carga preview ≤5 sin q textual; 1 carácter no busca', fakeAsync(() => {
    clienteService.buscar.and.returnValue(of([
      cliente({ id: 1, nombre: 'Ana' }),
      cliente({ id: 2, nombre: 'Bruno' })
    ]));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    tick();
    fixture.detectChanges();
    expect(clienteService.buscar).toHaveBeenCalledWith('', 5);
    expect(component.estado).toBe('preview');
    expect(fixture.nativeElement.textContent).toContain('Disponibles');
    expect(fixture.nativeElement.textContent).toContain('Ana');

    clienteService.buscar.calls.reset();
    escribir('a');
    tick(DEBOUNCE_BUSQUEDA_CLIENTE_MS);
    expect(clienteService.buscar).not.toHaveBeenCalled();
    expect(component.estado).toBe('preview');
  }));

  it('D.3: preview se reutiliza sin segunda petición en la misma interacción', fakeAsync(() => {
    clienteService.buscar.and.returnValue(of([cliente()]));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    tick();
    expect(clienteService.buscar).toHaveBeenCalledTimes(1);
    input.dispatchEvent(new Event('focus'));
    tick();
    expect(clienteService.buscar).toHaveBeenCalledTimes(1);
  }));

  it('selecciona un cliente, lo muestra y permite cambiarlo', fakeAsync(() => {
    clienteService.buscar.and.returnValue(of([cliente()]));
    const emitidos: (ClienteResponseDTO | null)[] = [];
    component.seleccionadoChange.subscribe(c => emitidos.push(c));

    escribir('carla');
    tick(DEBOUNCE_BUSQUEDA_CLIENTE_MS);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.resultados button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(emitidos.map(c => c?.id)).toEqual([5]);
    expect(fixture.nativeElement.querySelector('.elegido')?.textContent).toContain('Carla Mora');

    (fixture.nativeElement.querySelector('.cambiar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(emitidos[1]).toBeNull();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
  }));

  it('permite navegar resultados con teclado y Enter', fakeAsync(() => {
    clienteService.buscar.and.returnValue(of([
      cliente({ id: 5, nombre: 'Jhossuant Cabezas' }),
      cliente({ id: 6, nombre: 'John Hernández' })
    ]));
    const emitidos: (ClienteResponseDTO | null)[] = [];
    component.seleccionadoChange.subscribe(c => emitidos.push(c));

    escribir('jho');
    tick(DEBOUNCE_BUSQUEDA_CLIENTE_MS);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(emitidos[0]?.id).toBe(6);
  }));

  it('mantiene el input de filtro dentro del contenedor search del sistema', () => {
    const search = fixture.nativeElement.querySelector('.search') as HTMLElement;
    const input = fixture.nativeElement.querySelector('.search input') as HTMLInputElement;
    expect(search).toBeTruthy();
    expect(input).toBeTruthy();
    expect(input.getAttribute('type')).toBe('search');
  });
});
