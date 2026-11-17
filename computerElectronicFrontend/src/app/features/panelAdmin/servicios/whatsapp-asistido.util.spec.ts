import {
  MSG_TELEFONO_INVALIDO_WHATSAPP,
  construirMensajeWhatsAppAsistido,
  enlaceClickToChat,
  mensajeCotizacion,
  mensajeEquipoListo,
  mensajeRecepcion,
  normalizarTelefonoWa,
  puedePlantillaCotizacion,
  puedePlantillaEquipoListo,
  puedePlantillaRecepcion,
  urlConsultaOtPublica
} from './whatsapp-asistido.util';

describe('whatsapp-asistido.util', () => {
  describe('normalizarTelefonoWa', () => {
    it('convierte celular CO de 10 dígitos', () => {
      expect(normalizarTelefonoWa('3001234567')).toBe('573001234567');
    });

    it('acepta espacios y guiones', () => {
      expect(normalizarTelefonoWa('300 123 4567')).toBe('573001234567');
      expect(normalizarTelefonoWa('300-123-4567')).toBe('573001234567');
    });

    it('acepta +57 y 57 ya presente', () => {
      expect(normalizarTelefonoWa('+57 300 123 4567')).toBe('573001234567');
      expect(normalizarTelefonoWa('573001234567')).toBe('573001234567');
      expect(normalizarTelefonoWa('00573001234567')).toBe('573001234567');
    });

    it('rechaza null, vacío e inválido', () => {
      expect(normalizarTelefonoWa(null)).toBeNull();
      expect(normalizarTelefonoWa('')).toBeNull();
      expect(normalizarTelefonoWa('   ')).toBeNull();
      expect(normalizarTelefonoWa('abc')).toBeNull();
      expect(normalizarTelefonoWa('12345')).toBeNull();
    });
  });

  describe('urlConsultaOtPublica', () => {
    it('arma exactamente base/consulta/ot/token sin slash doble', () => {
      expect(
        urlConsultaOtPublica('https://test.computerelectroniccentersas.com/', 'abc123')
      ).toBe('https://test.computerelectroniccentersas.com/consulta/ot/abc123');
    });
  });

  describe('enlaceClickToChat', () => {
    it('incluye número y text encodeURIComponent', () => {
      const mensaje = 'Hola José\nlínea 2 — ñ';
      const url = enlaceClickToChat('573001234567', mensaje);
      expect(url.startsWith('https://wa.me/573001234567?text=')).toBeTrue();
      expect(url).toContain(encodeURIComponent(mensaje));
      expect(decodeURIComponent(url.split('text=')[1])).toBe(mensaje);
    });
  });

  describe('mensajes', () => {
    const url = 'https://test.example/consulta/ot/tok';

    it('recepción reemplaza placeholders sin undefined', () => {
      const msg = mensajeRecepcion({
        nombre: 'Ana',
        ordenNumero: 'OS-1',
        urlConsulta: url
      });
      expect(msg).toContain('Ana');
      expect(msg).toContain('👋');
      expect(msg).toContain('OS-1');
      expect(msg).toContain(url);
      expect(msg).not.toContain('undefined');
      expect(msg).not.toContain('null');
      expect(msg).not.toContain('[object Object]');
      expect(msg.toLowerCase()).not.toContain('documento');
      expect(msg.toLowerCase()).not.toContain('jwt');
      expect(msg).not.toMatch(/\$\d/);
    });

    it('cotización e equipo listo sin PII sensible', () => {
      const cot = mensajeCotizacion({
        nombre: 'Ana',
        ordenNumero: 'OS-1',
        cotizacionNumero: 'COT-9',
        urlConsulta: url
      });
      expect(cot).toContain('COT-9');
      expect(cot).toContain(url);
      expect(cot.toLowerCase()).not.toContain('telefono');
      expect(cot.toLowerCase()).not.toContain('teléfono');
      expect(cot).not.toMatch(/precio/i);

      const listo = mensajeEquipoListo({
        nombre: null,
        ordenNumero: 'OS-1',
        urlConsulta: url
      });
      expect(listo).toContain('Estimado/a cliente');
      expect(listo).not.toContain('recogerlo hoy');
      expect(listo).not.toContain('undefined');
    });

    it('construirMensajeWhatsAppAsistido por plantilla', () => {
      const msg = construirMensajeWhatsAppAsistido('recepcion', {
        nombre: 'Luis',
        ordenNumero: 'OS-2',
        urlConsulta: url
      });
      expect(msg).toContain('Luis');
    });
  });

  describe('disponibilidad por estado', () => {
    it('habilita recepción / cotización / listo según reglas', () => {
      expect(puedePlantillaRecepcion('RECEPCIONADO')).toBeTrue();
      expect(puedePlantillaRecepcion('EN_DIAGNOSTICO')).toBeTrue();
      expect(puedePlantillaRecepcion('CANCELADO')).toBeFalse();
      expect(puedePlantillaCotizacion('PENDIENTE_APROBACION')).toBeTrue();
      expect(puedePlantillaCotizacion('LISTO')).toBeFalse();
      expect(puedePlantillaCotizacion('COTIZADO')).toBeFalse();
      expect(puedePlantillaEquipoListo('LISTO')).toBeTrue();
      expect(puedePlantillaEquipoListo('EN_REPARACION')).toBeFalse();
      expect(puedePlantillaEquipoListo('ENTREGADO')).toBeFalse();
    });
  });

  describe('url / click-to-chat invariants', () => {
    it('no usa api paths en URL de consulta', () => {
      const url = urlConsultaOtPublica(
        'https://test.computerelectroniccentersas.com',
        'tokendeprueba1234567890abcdef12'
      );
      expect(url).toBe(
        'https://test.computerelectroniccentersas.com/consulta/ot/tokendeprueba1234567890abcdef12'
      );
      expect(url).not.toContain('api.');
      expect(url).not.toContain('/api/');
      expect(url).not.toContain('localhost');
    });

    it('codifica emoji y saltos en wa.me', () => {
      const mensaje = mensajeRecepcion({
        nombre: 'José',
        ordenNumero: 'OS-1',
        urlConsulta: 'https://x/consulta/ot/t'
      });
      const href = enlaceClickToChat('573001234567', mensaje);
      expect(href).toContain(encodeURIComponent('👋'));
      expect(decodeURIComponent(href.split('text=')[1])).toContain('\n');
    });
  });

  it('expone mensaje de teléfono inválido estable', () => {
    expect(MSG_TELEFONO_INVALIDO_WHATSAPP).toContain('teléfono válido');
  });
});
