import { HttpErrorResponse } from '@angular/common/http';
import { OrdenServicioResponseDTO } from '../../../core/models/orden-servicio.models';
import { aOrdenServicioRequest, aRequestActualizacionTextos } from './servicio-mapper';
import {
  accionNuevaFalla,
  accionPrincipalDesde,
  campoTecnicoDestacado,
  contarRepuestosPendientes,
  equipoResumen,
  esEstadoTerminal,
  esResumenTecnicoCompleto,
  filtrarOrdenesLocal,
  labelEstadoOrden,
  mensajeErrorServicio,
  pasosWorkflow,
  puedeEditarTextos,
  puedePlanificarRepuestos,
  textoCostoHistoricoRepuesto,
  textoProximaAccion,
  textosTecnicosSinCambios,
  tipoAccionWorkflow,
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
    expect(labelEstadoOrden('DIAGNOSTICADO')).toBe('Diagnosticado');
    expect(labelEstadoOrden('ESPERA_REPUESTO')).toBe('Espera repuesto');
    expect(labelEstadoOrden('REQUIERE_APROBACION_ADICIONAL')).toBe(
      'Requiere aprobación adicional'
    );
  });

  it('expone solo transiciones conocidas por el backend 3.15.5.2', () => {
    expect(transicionesDesde('RECEPCIONADO')).toEqual(['EN_DIAGNOSTICO', 'CANCELADO']);
    expect(transicionesDesde('EN_DIAGNOSTICO')).toEqual(['DIAGNOSTICADO', 'CANCELADO']);
    expect(transicionesDesde('DIAGNOSTICADO')).toEqual(['COTIZADO', 'CANCELADO']);
    expect(transicionesDesde('EN_REPARACION')).toEqual([
      'ESPERA_REPUESTO',
      'REQUIERE_APROBACION_ADICIONAL',
      'LISTO'
    ]);
    expect(transicionesDesde('REQUIERE_APROBACION_ADICIONAL')).toEqual([]);
    expect(transicionesDesde('CERRADO')).toEqual([]);
    expect(transicionesDesde('CANCELADO')).toEqual([]);
  });

  it('clasifica el tipo de acción por destino', () => {
    expect(tipoAccionWorkflow('EN_DIAGNOSTICO')).toBe('directa');
    expect(tipoAccionWorkflow('DIAGNOSTICADO')).toBe('completarDiagnostico');
    expect(tipoAccionWorkflow('LISTO')).toBe('completarReparacion');
    expect(tipoAccionWorkflow('ESPERA_REPUESTO')).toBe('esperaRepuesto');
    expect(tipoAccionWorkflow('REQUIERE_APROBACION_ADICIONAL')).toBe('nuevaFalla');
    expect(tipoAccionWorkflow('CANCELADO')).toBe('motivoCancelacion');
    expect(tipoAccionWorkflow('APROBADO')).toBe('confirmacion');
  });

  it('expone acción de nueva falla solo en reparación', () => {
    expect(accionNuevaFalla('EN_REPARACION')?.destino).toBe('REQUIERE_APROBACION_ADICIONAL');
    expect(accionNuevaFalla('ESPERA_REPUESTO')).toBeNull();
    expect(accionPrincipalDesde('EN_DIAGNOSTICO')?.destino).toBe('DIAGNOSTICADO');
    expect(accionPrincipalDesde('EN_DIAGNOSTICO')?.boton).toBe('Ir al diagnóstico');
    expect(accionPrincipalDesde('EN_REPARACION')?.destino).toBe('LISTO');
  });

  it('marca ESPERA y REQUIERE como paso especial sobre reparación', () => {
    const espera = pasosWorkflow('ESPERA_REPUESTO');
    const requiere = pasosWorkflow('REQUIERE_APROBACION_ADICIONAL');
    const reparacion = espera.find(p => p.estado === 'EN_REPARACION');
    const reparacionReq = requiere.find(p => p.estado === 'EN_REPARACION');
    expect(reparacion?.fase).toBe('especial');
    expect(reparacionReq?.fase).toBe('especial');
    expect(espera.some(p => p.estado === 'DIAGNOSTICADO')).toBeTrue();
  });

  it('bloquea edición de textos en estados terminales', () => {
    expect(puedeEditarTextos('RECEPCIONADO')).toBeTrue();
    expect(esEstadoTerminal('CERRADO')).toBeTrue();
    expect(puedeEditarTextos('CANCELADO')).toBeFalse();
  });

  it('destaca campos técnicos por estado sin ocultar el resto', () => {
    expect(campoTecnicoDestacado('RECEPCIONADO')).toBe('problemaReportado');
    expect(campoTecnicoDestacado('EN_DIAGNOSTICO')).toBe('diagnostico');
    expect(campoTecnicoDestacado('DIAGNOSTICADO')).toBe('diagnostico');
    expect(campoTecnicoDestacado('EN_REPARACION')).toBe('trabajoRealizado');
    expect(campoTecnicoDestacado('REQUIERE_APROBACION_ADICIONAL')).toBeNull();
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

  it('personaliza próxima acción con repuestos pendientes', () => {
    expect(textoProximaAccion('RECEPCIONADO')).toBe('Iniciar diagnóstico');
    expect(textoProximaAccion('EN_DIAGNOSTICO')).toBe('Completar ficha técnica');
    expect(textoProximaAccion('DIAGNOSTICADO')).toBe('Preparar cotización inicial');
    expect(textoProximaAccion('EN_REPARACION')).toBe('Continuar reparación');
    expect(textoProximaAccion('EN_REPARACION', { pendingRepuestos: 2 })).toContain(
      '2 repuestos pendientes'
    );
    expect(textoProximaAccion('ESPERA_REPUESTO')).toBe('Resolver repuestos pendientes');
    expect(textoProximaAccion('ESPERA_REPUESTO', { pendingRepuestos: 1 })).toContain(
      'Queda 1 pendiente'
    );
    expect(textoProximaAccion('REQUIERE_APROBACION_ADICIONAL')).toContain(
      'aprobación adicional'
    );
  });

  it('conoce estados de planificación de repuestos', () => {
    expect(puedePlanificarRepuestos('RECEPCIONADO')).toBeTrue();
    expect(puedePlanificarRepuestos('DIAGNOSTICADO')).toBeTrue();
    expect(puedePlanificarRepuestos('EN_REPARACION')).toBeTrue();
    expect(puedePlanificarRepuestos('REQUIERE_APROBACION_ADICIONAL')).toBeFalse();
    expect(puedePlanificarRepuestos('LISTO')).toBeFalse();
    expect(puedePlanificarRepuestos('CERRADO')).toBeFalse();
  });

  it('no inventa costo 0 cuando el histórico es desconocido', () => {
    expect(textoCostoHistoricoRepuesto({ costoConocido: false, costoHistorico: null })).toBe(
      'Costo histórico no disponible'
    );
    expect(textoCostoHistoricoRepuesto({ costoConocido: true, costoHistorico: 12000 })).toBeNull();
  });

  it('cuenta pendientes excluyendo anulados', () => {
    expect(
      contarRepuestosPendientes([
        { cantidadPendiente: 2 },
        { cantidadPendiente: 3, anulado: true },
        { cantidadPendiente: 1 }
      ])
    ).toBe(3);
  });

  it('asigna tonos de badge coherentes', () => {
    expect(toneEstadoOrden('LISTO')).toBe('success');
    expect(toneEstadoOrden('ESPERA_REPUESTO')).toBe('warning');
    expect(toneEstadoOrden('REQUIERE_APROBACION_ADICIONAL')).toBe('warning');
    expect(toneEstadoOrden('DIAGNOSTICADO')).toBe('neutral');
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
