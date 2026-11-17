import { HttpErrorResponse } from '@angular/common/http';
import { ClienteResponseDTO } from '../../../core/models/cliente.models';
import { aClienteRequest, aRequestConEstado, rutaDevolucion, rutaVenta } from './cliente-mapper';
import {
  MENSAJE_CONSUMIDOR_RESERVADO,
  MENSAJE_DOCUMENTO_DUPLICADO,
  clienteCoincideBusqueda,
  clientesParaVenta,
  esConsumidorFinal,
  filtrarClientes,
  mensajeErrorCliente,
  ordenarClientesPorNombre,
  puedeDesactivarCliente,
  puedeEditarCliente
} from './cliente-ui';

function cliente(parcial: Partial<ClienteResponseDTO>): ClienteResponseDTO {
  return {
    id: 8,
    nombre: 'Ana Ruiz',
    tipoCliente: 'PERSONA',
    consumidorFinal: false,
    tipoDocumento: 'CC',
    numeroDocumento: '123',
    email: 'ana@correo.com',
    telefono: '300',
    notas: null,
    activo: true,
    fechaRegistro: '2026-01-01T10:00:00',
    ...parcial
  };
}

describe('cliente-ui', () => {
  it('detecta consumidor final por tipo o bandera, nunca por id', () => {
    expect(esConsumidorFinal(cliente({ id: 1, tipoCliente: 'PERSONA' }))).toBeFalse();
    expect(esConsumidorFinal(cliente({ id: 99, tipoCliente: 'CONSUMIDOR_FINAL' }))).toBeTrue();
    expect(esConsumidorFinal(cliente({ id: 4, consumidorFinal: true }))).toBeTrue();
  });

  it('protege edición y desactivación del registro reservado', () => {
    const reservado = cliente({ tipoCliente: 'CONSUMIDOR_FINAL', consumidorFinal: true });
    expect(puedeEditarCliente(reservado)).toBeFalse();
    expect(puedeDesactivarCliente(reservado)).toBeFalse();
    expect(puedeEditarCliente(cliente({}))).toBeTrue();
    expect(puedeDesactivarCliente(cliente({ activo: false }))).toBeFalse();
  });

  it('busca en los datos ya cargados por nombre, documento, correo y teléfono', () => {
    const ana = cliente({});
    expect(clienteCoincideBusqueda(ana, 'ana')).toBeTrue();
    expect(clienteCoincideBusqueda(ana, '123')).toBeTrue();
    expect(clienteCoincideBusqueda(ana, 'correo.com')).toBeTrue();
    expect(clienteCoincideBusqueda(ana, '300')).toBeTrue();
    expect(clienteCoincideBusqueda(ana, 'otro')).toBeFalse();
  });

  it('filtra tipo y estado sin inventar ciudad ni valor comprado', () => {
    const lista = [
      cliente({ id: 1, nombre: 'Zeta', tipoCliente: 'EMPRESA' }),
      cliente({ id: 2, nombre: 'Ana', activo: false })
    ];
    const empresas = filtrarClientes(lista, { query: '', activo: '', tipo: 'EMPRESA' });
    expect(empresas.map(item => item.id)).toEqual([1]);
    const inactivos = filtrarClientes(lista, { query: '', activo: 'false', tipo: '' });
    expect(inactivos.map(item => item.id)).toEqual([2]);
  });

  it('ordena localmente por nombre cuando el listado completo no trae orden', () => {
    const ordenados = ordenarClientesPorNombre([
      cliente({ id: 1, nombre: 'Zoe' }),
      cliente({ id: 2, nombre: 'Ana' })
    ]);
    expect(ordenados.map(item => item.nombre)).toEqual(['Ana', 'Zoe']);
  });

  it('deja una sola opción de consumidor final en el select de venta', () => {
    const seleccionables = clientesParaVenta([
      cliente({ id: 3, tipoCliente: 'CONSUMIDOR_FINAL', consumidorFinal: true, nombre: 'Consumidor final' }),
      cliente({ id: 4, nombre: 'Ana' })
    ]);
    expect(seleccionables.map(item => item.id)).toEqual([4]);
  });

  it('traduce el conflicto de documento y no muestra SQL', () => {
    const negocio = new HttpErrorResponse({
      status: 400,
      error: { message: 'Ya existe un cliente con ese documento.' }
    });
    const sql = new HttpErrorResponse({
      status: 500,
      error: { message: "Duplicate entry for key 'uk_clientes_documento'" }
    });
    expect(mensajeErrorCliente(negocio, 'fallo')).toBe(MENSAJE_DOCUMENTO_DUPLICADO);
    expect(mensajeErrorCliente(sql, 'fallo')).toBe(MENSAJE_DOCUMENTO_DUPLICADO);
    expect(mensajeErrorCliente(negocio, 'fallo')).not.toContain('uk_');
  });

  it('no ofrece crear consumidor final y no exige número si el documento es ninguno', () => {
    const request = aClienteRequest({
      nombre: '  Taller Sur  ',
      tipoCliente: 'EMPRESA',
      tipoDocumento: 'NINGUNO',
      numeroDocumento: '999',
      email: '',
      telefono: '',
      notas: '',
      activo: true
    });
    expect(request.tipoCliente).toBe('EMPRESA');
    expect(request.tipoCliente).not.toBe('CONSUMIDOR_FINAL');
    expect(request.numeroDocumento).toBeNull();
    expect(request.nombre).toBe('Taller Sur');
  });

  it('desactiva con el body completo y activo en falso, sin borrar el cliente', () => {
    const request = aRequestConEstado(cliente({ notas: 'VIP' }), false);
    expect(request.activo).toBeFalse();
    expect(request.nombre).toBe('Ana Ruiz');
    expect(request.notas).toBe('VIP');
    expect(request.tipoCliente).toBe('PERSONA');
  });

  it('enlaza ventas y devoluciones solo a rutas que ya existen', () => {
    expect(rutaVenta(12)).toEqual(['/ventas', '12']);
    expect(rutaDevolucion(12, 4)).toEqual(['/ventas', '12', 'devoluciones', '4']);
    expect(rutaDevolucion(null, 4)).toBeNull();
  });

  it('usa el mensaje reservado del sistema, no un id fijo', () => {
    expect(MENSAJE_CONSUMIDOR_RESERVADO).toContain('registro reservado');
  });
});
