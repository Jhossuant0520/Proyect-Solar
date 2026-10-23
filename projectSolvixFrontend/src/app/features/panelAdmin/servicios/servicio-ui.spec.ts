import { HttpErrorResponse } from '@angular/common/http';
import { OrdenServicioResponseDTO } from '../../../core/models/orden-servicio.models';
import { aOrdenServicioRequest, aRequestActualizacionTextos } from './servicio-mapper';
import {
  accionNuevaFalla,
  accionPrincipalDesde,
  calcularDiasCalendarioDesde,
  calcularDistribucionAntiguedad,
  calcularPrioridadPorAntiguedad,
  campoTecnicoDestacado,
  construirColaAtencion,
  construirTrazabilidadOperativa,
  motivoAtencionOrden,
  contarRepuestosPendientes,
  equipoResumen,
  esEstadoTerminal,
  esResumenTecnicoCompleto,
  filtrarOrdenesLocal,
  labelEstadoOrden,
  mensajeCambioEstado,
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
    expect(labelEstadoOrden('PENDIENTE_APROBACION')).toBe('Pendiente de aprobación');
    expect(labelEstadoOrden('ESPERA_REPUESTO')).toBe('Espera repuesto');
    expect(labelEstadoOrden('REQUIERE_APROBACION_ADICIONAL')).toBe(
      'Requiere aprobación adicional'
    );
  });

  it('expone solo transiciones conocidas por el backend 3.15.7', () => {
    expect(transicionesDesde('RECEPCIONADO')).toEqual(['EN_DIAGNOSTICO', 'CANCELADO']);
    expect(transicionesDesde('EN_DIAGNOSTICO')).toEqual(['DIAGNOSTICADO', 'CANCELADO']);
    expect(transicionesDesde('DIAGNOSTICADO')).toEqual(['COTIZADO', 'CANCELADO']);
    expect(transicionesDesde('COTIZADO')).toEqual(['PENDIENTE_APROBACION', 'CANCELADO']);
    expect(transicionesDesde('PENDIENTE_APROBACION')).toEqual([
      'APROBADO',
      'EN_REPARACION',
      'COTIZADO',
      'REQUIERE_APROBACION_ADICIONAL',
      'CANCELADO'
    ]);
    expect(transicionesDesde('EN_REPARACION')).toEqual([
      'ESPERA_REPUESTO',
      'REQUIERE_APROBACION_ADICIONAL',
      'LISTO'
    ]);
    expect(transicionesDesde('REQUIERE_APROBACION_ADICIONAL')).toEqual(['PENDIENTE_APROBACION']);
    expect(transicionesDesde('CERRADO')).toEqual([]);
    expect(transicionesDesde('CANCELADO')).toEqual([]);
  });

  it('clasifica el tipo de acción por destino', () => {
    expect(tipoAccionWorkflow('EN_DIAGNOSTICO')).toBe('directa');
    expect(tipoAccionWorkflow('DIAGNOSTICADO')).toBe('completarDiagnostico');
    expect(tipoAccionWorkflow('LISTO')).toBe('completarReparacion');
    expect(tipoAccionWorkflow('ENTREGADO')).toBe('gestionarEntrega');
    expect(tipoAccionWorkflow('ESPERA_REPUESTO')).toBe('esperaRepuesto');
    expect(tipoAccionWorkflow('REQUIERE_APROBACION_ADICIONAL')).toBe('nuevaFalla');
    expect(tipoAccionWorkflow('CANCELADO')).toBe('motivoCancelacion');
    expect(tipoAccionWorkflow('COTIZADO')).toBe('crearCotizacion');
    expect(tipoAccionWorkflow('PENDIENTE_APROBACION')).toBe('presentarCotizacion');
    expect(tipoAccionWorkflow('APROBADO')).toBe('aprobarCotizacion');
    expect(tipoAccionWorkflow('CERRADO')).toBe('confirmacion');
  });

  it('expone acción de nueva falla solo en reparación', () => {
    expect(accionNuevaFalla('EN_REPARACION')?.destino).toBe('REQUIERE_APROBACION_ADICIONAL');
    expect(accionNuevaFalla('ESPERA_REPUESTO')).toBeNull();
    expect(accionPrincipalDesde('EN_DIAGNOSTICO')?.destino).toBe('DIAGNOSTICADO');
    expect(accionPrincipalDesde('EN_DIAGNOSTICO')?.boton).toBe('Registrar diagnóstico');
    expect(accionPrincipalDesde('DIAGNOSTICADO')?.destino).toBe('COTIZADO');
    expect(accionPrincipalDesde('DIAGNOSTICADO')?.boton).toBe('Preparar cotización');
    expect(accionPrincipalDesde('COTIZADO')?.destino).toBe('PENDIENTE_APROBACION');
    expect(accionPrincipalDesde('COTIZADO')?.boton).toBe('Presentar cotización');
    expect(accionPrincipalDesde('PENDIENTE_APROBACION')?.destino).toBe('APROBADO');
    expect(accionPrincipalDesde('PENDIENTE_APROBACION')?.boton).toBe(
      'Registrar respuesta del cliente'
    );
    expect(accionPrincipalDesde('REQUIERE_APROBACION_ADICIONAL')?.boton).toBe(
      'Preparar cotización adicional'
    );
    expect(accionPrincipalDesde('APROBADO')?.destino).toBe('EN_REPARACION');
    expect(accionPrincipalDesde('EN_REPARACION')?.destino).toBe('LISTO');
    expect(accionPrincipalDesde('LISTO')?.destino).toBe('ENTREGADO');
    expect(accionPrincipalDesde('LISTO')?.boton).toBe('Gestionar entrega');
    expect(accionPrincipalDesde('ENTREGADO')).toBeNull();
    expect(accionPrincipalDesde('CERRADO')).toBeNull();
  });

  it('marca ESPERA y REQUIERE como paso especial sobre reparación', () => {
    const espera = pasosWorkflow('ESPERA_REPUESTO');
    const requiere = pasosWorkflow('REQUIERE_APROBACION_ADICIONAL');
    const reparacion = espera.find(p => p.estado === 'EN_REPARACION');
    const reparacionReq = requiere.find(p => p.estado === 'EN_REPARACION');
    expect(reparacion?.fase).toBe('especial');
    expect(reparacionReq?.fase).toBe('especial');
    expect(espera.some(p => p.estado === 'DIAGNOSTICADO')).toBeTrue();
    expect(pasosWorkflow('PENDIENTE_APROBACION').some(p => p.estado === 'PENDIENTE_APROBACION')).toBeTrue();
    const pendiente = pasosWorkflow('PENDIENTE_APROBACION').find(p => p.estado === 'PENDIENTE_APROBACION');
    expect(pendiente?.fase).toBe('actual');
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
    expect(textoProximaAccion('RECEPCIONADO')).toBe('Iniciar el diagnóstico técnico.');
    expect(textoProximaAccion('EN_DIAGNOSTICO')).toBe('Registrar el diagnóstico técnico.');
    expect(textoProximaAccion('DIAGNOSTICADO')).toBe('Preparar la cotización inicial.');
    expect(textoProximaAccion('COTIZADO')).toBe('Presentar la cotización al cliente.');
    expect(textoProximaAccion('PENDIENTE_APROBACION')).toBe(
      'Registrar la respuesta del cliente (aprobar o rechazar).'
    );
    expect(textoProximaAccion('APROBADO')).toBe('Iniciar la reparación.');
    expect(textoProximaAccion('EN_REPARACION')).toBe(
      'Completar el trabajo y marcar la orden como lista.'
    );
    expect(textoProximaAccion('EN_REPARACION', { pendingRepuestos: 2 })).toContain(
      '2 repuestos pendientes'
    );
    expect(textoProximaAccion('ESPERA_REPUESTO')).toContain('continuar la reparación');
    expect(textoProximaAccion('ESPERA_REPUESTO', { pendingRepuestos: 1 })).toContain(
      'Queda 1 pendiente'
    );
    expect(textoProximaAccion('REQUIERE_APROBACION_ADICIONAL')).toContain('cotización adicional');
    expect(textoProximaAccion('LISTO')).toBe('Gestionar la entrega al cliente.');
    expect(textoProximaAccion('ENTREGADO')).toContain('No hay acciones pendientes');
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
    expect(toneEstadoOrden('PENDIENTE_APROBACION')).toBe('warning');
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
    expect(
      equipoResumen({
        tipoEquipo: 'PORTATIL',
        marca: 'Dell',
        modelo: 'XPS',
        referenciaInterna: 'Laptop Contabilidad'
      })
    ).toContain('Laptop Contabilidad');
    expect(
      equipoResumen({
        tipoEquipo: 'PORTATIL',
        marca: 'Dell',
        nombre: 'Legacy alias'
      })
    ).toContain('Legacy alias');
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
    const zxing = new HttpErrorResponse({
      status: 500,
      error: { message: 'com/google/zxing/EncodeHintType' }
    });
    expect(mensajeErrorServicio(zxing, 'No pudimos crear la orden.')).toBe(
      'No pudimos crear la orden.'
    );
  });

  it('calcula prioridad operativa por antigüedad (0-3 Baja, 4-7 Media, 8-15 Alta, 16+ Muy alta)', () => {
    const hoy = new Date(2026, 2, 20, 14, 0, 0); // 20 Mar 2026
    expect(calcularDiasCalendarioDesde('2026-03-20T09:00:00', hoy)).toBe(0);
    expect(calcularPrioridadPorAntiguedad('2026-03-18T10:00:00', 'EN_DIAGNOSTICO', hoy)?.codigo).toBe(
      'BAJA'
    );
    expect(calcularPrioridadPorAntiguedad('2026-03-15T10:00:00', 'PENDIENTE_APROBACION', hoy)?.codigo).toBe(
      'MEDIA'
    );
    expect(calcularPrioridadPorAntiguedad('2026-03-10T10:00:00', 'PENDIENTE_APROBACION', hoy)?.codigo).toBe(
      'ALTA'
    );
    // Frontera exacta entre 15 días (Alta) y 16 días (Muy alta)
    const dia15 = calcularPrioridadPorAntiguedad('2026-03-05T10:00:00', 'EN_REPARACION', hoy);
    expect(dia15?.dias).toBe(15);
    expect(dia15?.codigo).toBe('ALTA');
    expect(dia15?.labelCorto).toBe('Alta');
    expect(dia15?.activa).toBeTrue();

    const dia16 = calcularPrioridadPorAntiguedad('2026-03-04T10:00:00', 'EN_REPARACION', hoy);
    expect(dia16?.dias).toBe(16);
    expect(dia16?.codigo).toBe('MUY_ALTA');
    expect(dia16?.labelCorto).toBe('Muy alta');
    expect(dia16?.activa).toBeTrue();

    expect(calcularPrioridadPorAntiguedad('2026-03-01T10:00:00', 'EN_REPARACION', hoy)?.codigo).toBe(
      'MUY_ALTA'
    );

    // Órdenes finalizadas no se presentan como activas críticas
    const entregada = calcularPrioridadPorAntiguedad('2026-01-01T10:00:00', 'ENTREGADO', hoy);
    expect(entregada?.activa).toBeFalse();
    expect(entregada?.tone).toBe('neutral');
  });

  it('arma el toast de cambio de estado con nombres legibles', () => {
    expect(mensajeCambioEstado('RECEPCIONADO', 'EN_DIAGNOSTICO')).toBe(
      'Recepcionado → En diagnóstico'
    );
  });

  it('distribuye antigüedad solo con órdenes activas y reutiliza umbrales de prioridad', () => {
    const hoy = new Date(2026, 2, 20, 14, 0, 0);
    const dist = calcularDistribucionAntiguedad(
      [
        orden({ id: 1, fechaRecepcion: '2026-03-19T10:00:00', estado: 'RECEPCIONADO' }),
        orden({ id: 2, fechaRecepcion: '2026-03-14T10:00:00', estado: 'EN_REPARACION' }),
        orden({ id: 3, fechaRecepcion: '2026-03-01T10:00:00', estado: 'PENDIENTE_APROBACION' }),
        orden({ id: 4, fechaRecepcion: '2026-01-01T10:00:00', estado: 'ENTREGADO' })
      ],
      hoy
    );
    expect(dist.totalActivas).toBe(3);
    expect(dist.grupos.find(g => g.codigo === 'BAJA')?.cantidad).toBe(1);
    expect(dist.grupos.find(g => g.codigo === 'MEDIA')?.cantidad).toBe(1);
    expect(dist.grupos.find(g => g.codigo === 'MUY_ALTA')?.cantidad).toBe(1);
    // 33+33+34 o 33×3 por redondeo; cada barra refleja cantidad/total.
    const sumaPct = dist.grupos.reduce((s, g) => s + g.porcentaje, 0);
    expect(sumaPct).toBeGreaterThanOrEqual(99);
    expect(sumaPct).toBeLessThanOrEqual(100);
  });

  it('arma cola de atención sin duplicados y con motivos reales de estado', () => {
    const hoy = new Date(2026, 2, 20, 14, 0, 0);
    expect(motivoAtencionOrden(orden({ estado: 'PENDIENTE_APROBACION' }))).toContain('Aprobación');
    expect(motivoAtencionOrden(orden({ estado: 'ESPERA_REPUESTO' }))).toContain('repuesto');
    const cola = construirColaAtencion(
      [
        orden({
          id: 10,
          numero: 'OS-A',
          estado: 'PENDIENTE_APROBACION',
          fechaRecepcion: '2026-03-01T10:00:00'
        }),
        orden({
          id: 11,
          numero: 'OS-B',
          estado: 'ESPERA_REPUESTO',
          fechaRecepcion: '2026-03-08T10:00:00'
        }),
        orden({
          id: 12,
          numero: 'OS-C',
          estado: 'RECEPCIONADO',
          fechaRecepcion: '2026-03-19T10:00:00'
        }),
        orden({
          id: 13,
          numero: 'OS-D',
          estado: 'ENTREGADO',
          fechaRecepcion: '2026-01-01T10:00:00'
        })
      ],
      5,
      hoy
    );
    expect(cola.length).toBeGreaterThan(0);
    expect(cola.some(c => c.numero === 'OS-D')).toBeFalse();
    expect(new Set(cola.map(c => c.id)).size).toBe(cola.length);
    expect(cola[0].numero).toBe('OS-A');
  });

  it('construye las 5 etapas de trazabilidad operativa con estados y bloqueos reales', () => {
    const base = orden({ estado: 'PENDIENTE_APROBACION', diagnostico: 'Cortocircuito en VRM' });
    const etapas = construirTrazabilidadOperativa(base, [
      { estadoNuevo: 'DIAGNOSTICADO', fechaCambio: '2026-03-01T11:45:00' }
    ]);
    expect(etapas.length).toBe(5);
    expect(etapas[0].estadoVisual).toBe('completada');
    expect(etapas[1].estadoVisual).toBe('completada');
    expect(etapas[2].estadoVisual).toBe('actual');
    expect(etapas[3].estadoVisual).toBe('bloqueada');
    expect(etapas[3].detalleTexto).toContain('aprobación');
    expect(etapas[4].estadoVisual).toBe('pendiente');
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
