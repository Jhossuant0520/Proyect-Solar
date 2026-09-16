import { HttpErrorResponse } from '@angular/common/http';
import { OrdenServicioResponseDTO } from '../../../core/models/orden-servicio.models';
import { aOrdenServicioRequest, aRequestActualizacionTextos } from './servicio-mapper';
import {
  campoTecnicoDestacado,
  equipoResumen,
  esEstadoTerminal,
  esResumenTecnicoCompleto,
  filtrarOrdenesLocal,
  labelEstadoOrden,
  mensajeErrorServicio,
  puedeEditarTextos,
  textosTecnicosSinCambios,
  toneEstadoOrden,
  transicionesDesde
} from './servicio-ui';

function orden(parcial: Partial<OrdenServicioResponseDTO> = {}): OrdenServicioResponseDTO {
  return {
    id: 1,
    numero: 'OS-2026-000001',
    clienteId: 4,
    clienteNombre: 'Ana Ruiz',
    equipoId: 9,
    equipoTipo: 'PORTATIL',
    equipoMarca: 'Dell',
    equipoModelo: 'XPS',
    equipoNombre: 'Notebook',
    estado: 'RECEPCIONADO',
    problemaReportado: 'No enciende',
    diagnostico: null,
    trabajoRealizado: null,
    observaciones: null,
    fechaRecepcion: '2026-03-01T10:00:00',
    fechaActualizacion: '2026-03-01T10:00:00',
    fechaCierre: null,
    createdBy: 'admin',
    ...parcial
  };
}

describe('servicio-ui', () => {
  it('muestra nombres humanos sin renombrar el enum interno', () => {
    expect(labelEstadoOrden('RECEPCIONADO')).toBe('Recepcionado');
    expect(labelEstadoOrden('EN_DIAGNOSTICO')).toBe('En diagnóstico');
    expect(labelEstadoOrden('ESPERA_REPUESTO')).toBe('Espera repuesto');
  });

  it('expone solo transiciones conocidas por el backend', () => {
    expect(transicionesDesde('RECEPCIONADO')).toEqual(['EN_DIAGNOSTICO', 'CANCELADO']);
    expect(transicionesDesde('EN_REPARACION')).toEqual(['ESPERA_REPUESTO', 'LISTO', 'CANCELADO']);
    expect(transicionesDesde('CERRADO')).toEqual([]);
    expect(transicionesDesde('CANCELADO')).toEqual([]);
  });

  it('bloquea edición de textos en estados terminales', () => {
    expect(puedeEditarTextos('RECEPCIONADO')).toBeTrue();
    expect(esEstadoTerminal('CERRADO')).toBeTrue();
    expect(puedeEditarTextos('CANCELADO')).toBeFalse();
  });

  it('destaca campos técnicos por estado sin ocultar el resto', () => {
    expect(campoTecnicoDestacado('RECEPCIONADO')).toBe('problemaReportado');
    expect(campoTecnicoDestacado('EN_DIAGNOSTICO')).toBe('diagnostico');
    expect(campoTecnicoDestacado('EN_REPARACION')).toBe('trabajoRealizado');
    expect(campoTecnicoDestacado('LISTO')).toBeNull();
    expect(esResumenTecnicoCompleto('ENTREGADO')).toBeTrue();
  });

  it('detecta si los textos técnicos cambiaron', () => {
    const base = orden({});
    expect(
      textosTecnicosSinCambios(base, {
        problemaReportado: 'No enciende',
        diagnostico: '',
        trabajoRealizado: '',
        observaciones: ''
      })
    ).toBeTrue();
    expect(
      textosTecnicosSinCambios(base, {
        problemaReportado: 'No enciende',
        diagnostico: 'Fuente',
        trabajoRealizado: '',
        observaciones: ''
      })
    ).toBeFalse();
  });

  it('asigna tonos de badge coherentes', () => {
    expect(toneEstadoOrden('LISTO')).toBe('success');
    expect(toneEstadoOrden('ESPERA_REPUESTO')).toBe('warning');
    expect(toneEstadoOrden('CANCELADO')).toBe('error');
    expect(toneEstadoOrden('RECEPCIONADO')).toBe('neutral');
  });

  it('filtra localmente por número, cliente o equipo sin inventar HTTP', () => {
    const lista = [
      orden({}),
      orden({ id: 2, numero: 'OS-2026-000002', clienteNombre: 'Zoe', equipoMarca: 'HP' })
    ];
    expect(filtrarOrdenesLocal(lista, 'OS-2026-000002').map(o => o.id)).toEqual([2]);
    expect(filtrarOrdenesLocal(lista, 'ana').map(o => o.id)).toEqual([1]);
    expect(filtrarOrdenesLocal(lista, 'hp').map(o => o.id)).toEqual([2]);
  });

  it('resume equipo desde campos del response', () => {
    expect(equipoResumen(orden({}))).toContain('Portátil');
    expect(equipoResumen(orden({}))).toContain('Dell');
  });

  it('traduce errores de negocio sin mostrar SQL', () => {
    const negocio = new HttpErrorResponse({
      status: 400,
      error: { message: 'El equipo no pertenece al cliente indicado.' }
    });
    const sql = new HttpErrorResponse({
      status: 500,
      error: { message: 'SQLException: constraint violation' }
    });
    expect(mensajeErrorServicio(negocio, 'fallo')).toBe(
      'El equipo seleccionado no pertenece al cliente indicado.'
    );
    expect(mensajeErrorServicio(sql, 'fallo')).toBe('fallo');
  });
});

describe('servicio-mapper', () => {
  it('arma request de creación sin número ni estado', () => {
    const request = aOrdenServicioRequest({
      clienteId: 4,
      equipoId: 9,
      problemaReportado: '  No enciende  ',
      diagnostico: '',
      trabajoRealizado: '',
      observaciones: '  '
    });
    expect(request).toEqual({
      clienteId: 4,
      equipoId: 9,
      problemaReportado: 'No enciende',
      diagnostico: null,
      trabajoRealizado: null,
      observaciones: null
    });
    expect((request as { numero?: string }).numero).toBeUndefined();
  });

  it('en PUT conserva cliente y equipo de la orden', () => {
    const request = aRequestActualizacionTextos(orden({}), {
      problemaReportado: 'Actualizado',
      diagnostico: 'Fuente',
      trabajoRealizado: '',
      observaciones: ''
    });
    expect(request.clienteId).toBe(4);
    expect(request.equipoId).toBe(9);
    expect(request.problemaReportado).toBe('Actualizado');
    expect(request.diagnostico).toBe('Fuente');
  });
});
