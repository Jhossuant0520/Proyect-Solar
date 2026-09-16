import { OrdenServicioRequestDTO, OrdenServicioResponseDTO } from '../../../core/models/orden-servicio.models';

export interface OrdenServicioFormValores {
  clienteId: number | null;
  equipoId: number | null;
  problemaReportado: string;
  diagnostico: string;
  trabajoRealizado: string;
  observaciones: string;
}

export function valoresVaciosOrden(): OrdenServicioFormValores {
  return {
    clienteId: null,
    equipoId: null,
    problemaReportado: '',
    diagnostico: '',
    trabajoRealizado: '',
    observaciones: ''
  };
}

export function valoresDesdeOrden(orden: OrdenServicioResponseDTO): OrdenServicioFormValores {
  return {
    clienteId: orden.clienteId,
    equipoId: orden.equipoId,
    problemaReportado: orden.problemaReportado ?? '',
    diagnostico: orden.diagnostico ?? '',
    trabajoRealizado: orden.trabajoRealizado ?? '',
    observaciones: orden.observaciones ?? ''
  };
}

/** DTO → request. Vacío → null. No genera número ni estado. */
export function aOrdenServicioRequest(valores: OrdenServicioFormValores): OrdenServicioRequestDTO {
  if (valores.clienteId == null || valores.equipoId == null) {
    throw new Error('Cliente y equipo son obligatorios.');
  }
  return {
    clienteId: valores.clienteId,
    equipoId: valores.equipoId,
    problemaReportado: textoONull(valores.problemaReportado),
    diagnostico: textoONull(valores.diagnostico),
    trabajoRealizado: textoONull(valores.trabajoRealizado),
    observaciones: textoONull(valores.observaciones)
  };
}

/**
 * PUT: conserva clienteId/equipoId de la orden; solo cambia textos.
 * No modifica estado.
 */
export function aRequestActualizacionTextos(
  orden: OrdenServicioResponseDTO,
  textos: Pick<
    OrdenServicioFormValores,
    'problemaReportado' | 'diagnostico' | 'trabajoRealizado' | 'observaciones'
  >
): OrdenServicioRequestDTO {
  return {
    clienteId: orden.clienteId,
    equipoId: orden.equipoId,
    problemaReportado: textoONull(textos.problemaReportado),
    diagnostico: textoONull(textos.diagnostico),
    trabajoRealizado: textoONull(textos.trabajoRealizado),
    observaciones: textoONull(textos.observaciones)
  };
}

function textoONull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}
