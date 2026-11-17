import {
  CODIGOS_ESTADO_ORDEN,
  destacarContactoPublico,
  estadoOrdenUx,
  progresoFasesPublicas,
  seccionesAbiertasPorEstado
} from './estado-orden-ux';

describe('estado-orden-ux (FASE C.2)', () => {
  it('cubre los 13 códigos reales', () => {
    expect(CODIGOS_ESTADO_ORDEN).toHaveSize(13);
    for (const codigo of CODIGOS_ESTADO_ORDEN) {
      const ux = estadoOrdenUx(codigo);
      expect(ux.codigo).toBe(codigo);
      expect(ux.tituloCliente).toBeTruthy();
      expect(ux.descripcionCliente).toBeTruthy();
      expect(ux.siguienteCliente).toBeTruthy();
      expect(ux.fase).toBeTruthy();
      expect(ux.icono).toBeTruthy();
      expect(ux.tono).toBeTruthy();
    }
  });

  it('usa los títulos cliente mandados en C.2', () => {
    expect(estadoOrdenUx('RECEPCIONADO').tituloCliente).toBe('Recibimos tu equipo');
    expect(estadoOrdenUx('EN_DIAGNOSTICO').tituloCliente).toBe('Estamos revisando tu equipo');
    expect(estadoOrdenUx('DIAGNOSTICADO').tituloCliente).toBe('Preparando tu cotización');
    expect(estadoOrdenUx('COTIZADO').tituloCliente).toBe('Preparando tu cotización');
    expect(estadoOrdenUx('PENDIENTE_APROBACION').tituloCliente).toBe('Necesitamos tu aprobación');
    expect(estadoOrdenUx('APROBADO').tituloCliente).toBe('Aprobaste la reparación');
    expect(estadoOrdenUx('EN_REPARACION').tituloCliente).toBe('Estamos reparando tu equipo');
    expect(estadoOrdenUx('ESPERA_REPUESTO').tituloCliente).toBe('Esperando un repuesto');
    expect(estadoOrdenUx('REQUIERE_APROBACION_ADICIONAL').tituloCliente).toBe(
      'Encontramos algo adicional'
    );
    expect(estadoOrdenUx('LISTO').tituloCliente).toBe('¡Tu equipo está listo!');
    expect(estadoOrdenUx('ENTREGADO').tituloCliente).toBe('Servicio finalizado');
    expect(estadoOrdenUx('CERRADO').tituloCliente).toBe('Servicio finalizado');
    expect(estadoOrdenUx('CANCELADO').tituloCliente).toBe('Servicio cancelado');
  });

  it('resuelve siempre por codigo, no por etiqueta', () => {
    const porCodigo = estadoOrdenUx('DIAGNOSTICADO');
    expect(porCodigo.tituloCliente).toBe('Preparando tu cotización');
    // Una etiqueta no es un código válido → fallback, no mapeo por texto.
    const porEtiqueta = estadoOrdenUx('Diagnóstico listo');
    expect(porEtiqueta.tituloCliente).not.toBe(porCodigo.tituloCliente);
  });

  it('calcula progreso de 5 fases por codigo', () => {
    const recepcion = progresoFasesPublicas('RECEPCIONADO');
    expect(recepcion.map(f => f.estado)).toEqual([
      'actual',
      'futura',
      'futura',
      'futura',
      'futura'
    ]);

    const pendiente = progresoFasesPublicas('PENDIENTE_APROBACION');
    expect(pendiente.map(f => f.estado)).toEqual([
      'completada',
      'completada',
      'actual',
      'futura',
      'futura'
    ]);

    const listo = progresoFasesPublicas('LISTO');
    expect(listo.map(f => f.estado)).toEqual([
      'completada',
      'completada',
      'completada',
      'completada',
      'actual'
    ]);

    const cancelado = progresoFasesPublicas('CANCELADO');
    expect(cancelado.every(f => f.estado === 'inactiva')).toBeTrue();
  });

  it('marca acción del cliente solo donde corresponde', () => {
    expect(estadoOrdenUx('PENDIENTE_APROBACION').requiereAccionCliente).toBeTrue();
    expect(estadoOrdenUx('PENDIENTE_APROBACION').accionCliente).toBe('Ver cotización');
    expect(estadoOrdenUx('LISTO').requiereAccionCliente).toBeTrue();
    expect(estadoOrdenUx('REQUIERE_APROBACION_ADICIONAL').requiereAccionCliente).toBeTrue();
    expect(estadoOrdenUx('EN_REPARACION').requiereAccionCliente).toBeFalse();
    expect(estadoOrdenUx('RECEPCIONADO').accionCliente).toBeNull();
  });

  it('expone CTA y textos de taller para el detalle interno', () => {
    expect(estadoOrdenUx('RECEPCIONADO').botonPrincipal).toBe('Iniciar diagnóstico');
    expect(estadoOrdenUx('EN_DIAGNOSTICO').botonPrincipal).toBe('Registrar diagnóstico');
    expect(estadoOrdenUx('PENDIENTE_APROBACION').botonPrincipal).toBe(
      'Registrar respuesta del cliente'
    );
    expect(estadoOrdenUx('REQUIERE_APROBACION_ADICIONAL').botonPrincipal).toBe(
      'Preparar cotización adicional'
    );
    expect(estadoOrdenUx('CERRADO').botonPrincipal).toBeNull();
    expect(estadoOrdenUx('EN_DIAGNOSTICO').descripcionTaller).toContain('revisando');
  });

  it('abre las secciones correctas por estado', () => {
    expect(seccionesAbiertasPorEstado('RECEPCIONADO').tecnico).toBeTrue();
    expect(seccionesAbiertasPorEstado('DIAGNOSTICADO').cotizaciones).toBeTrue();
    expect(seccionesAbiertasPorEstado('ESPERA_REPUESTO').tecnico).toBeTrue();
    expect(seccionesAbiertasPorEstado('EN_REPARACION').tecnico).toBeTrue();
    expect(seccionesAbiertasPorEstado('LISTO').documentos).toBeTrue();
    expect(seccionesAbiertasPorEstado('CANCELADO').actividad).toBeTrue();
  });

  it('destaca contacto en estados que lo necesitan', () => {
    expect(destacarContactoPublico('PENDIENTE_APROBACION')).toBeTrue();
    expect(destacarContactoPublico('REQUIERE_APROBACION_ADICIONAL')).toBeTrue();
    expect(destacarContactoPublico('LISTO')).toBeTrue();
    expect(destacarContactoPublico('EN_DIAGNOSTICO')).toBeFalse();
  });
});
