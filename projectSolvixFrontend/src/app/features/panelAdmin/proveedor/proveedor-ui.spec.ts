import {
  documentoVisible,
  filtrarProveedores,
  proveedorCoincideBusqueda,
  razonSocialVisible
} from './proveedor-ui';
import { aProveedorRequest, contactoVacio, valoresDesdeProveedor } from './proveedor-mapper';
import { ProveedorResponseDTO } from '../../../core/models/proveedor.models';

describe('proveedor-ui', () => {
  const base: ProveedorResponseDTO = {
    id: 1,
    nombre: 'Acme SAS',
    razonSocial: 'Acme SAS',
    tipoDocumento: 'NIT',
    documento: '9001234567',
    numeroDocumento: '9001234567',
    nombreComercial: 'Acme',
    direccion: null,
    ciudad: 'Medellín',
    departamento: null,
    telefono: '3001112233',
    telefonoAlternativo: null,
    email: 'compras@acme.test',
    web: null,
    condicionPago: 'CREDITO',
    diasCredito: 30,
    contacto: null,
    notas: null,
    activo: true,
    fechaRegistro: null,
    fechaActualizacion: null,
    contactos: []
  };

  it('muestra razón social y NIT', () => {
    expect(razonSocialVisible(base)).toBe('Acme SAS');
    expect(documentoVisible(base)).toBe('NIT 9001234567');
  });

  it('filtra por búsqueda y estado', () => {
    const inactivo = { ...base, id: 2, activo: false, razonSocial: 'Beta', nombre: 'Beta' };
    expect(proveedorCoincideBusqueda(base, 'acme')).toBeTrue();
    expect(filtrarProveedores([base, inactivo], { query: '', activo: 'true' })).toEqual([base]);
    expect(filtrarProveedores([base, inactivo], { query: 'beta', activo: '' })).toEqual([inactivo]);
  });
});

describe('proveedor-mapper', () => {
  it('arma request con contactos y crédito', () => {
    const request = aProveedorRequest({
      razonSocial: 'Proveedor X',
      numeroDocumento: '900.111.222-3',
      nombreComercial: '',
      direccion: '',
      ciudad: 'Bogotá',
      departamento: '',
      telefono: '301',
      telefonoAlternativo: '',
      email: '',
      web: '',
      condicionPago: 'CREDITO',
      diasCredito: 15,
      notas: '',
      activo: true,
      contactos: [
        { ...contactoVacio(), nombre: 'Ana', principal: true },
        { ...contactoVacio(), nombre: '  ' }
      ]
    });

    expect(request.razonSocial).toBe('Proveedor X');
    expect(request.diasCredito).toBe(15);
    expect(request.contactos?.length).toBe(1);
    expect(request.ciudad).toBe('Bogotá');
  });

  it('reconoce valores desde respuesta', () => {
    const valores = valoresDesdeProveedor({
      id: 9,
      nombre: 'Zeta',
      razonSocial: 'Zeta',
      tipoDocumento: 'NIT',
      documento: '1',
      numeroDocumento: '1',
      nombreComercial: null,
      direccion: null,
      ciudad: null,
      departamento: null,
      telefono: null,
      telefonoAlternativo: null,
      email: null,
      web: null,
      condicionPago: 'CONTADO',
      diasCredito: 0,
      contacto: null,
      notas: null,
      activo: false,
      fechaRegistro: null,
      fechaActualizacion: null,
      contactos: [{
        id: 3,
        nombre: 'Luis',
        cargo: null,
        telefono: null,
        celular: null,
        email: null,
        tipoContacto: 'COMERCIAL',
        principal: true,
        activo: true,
        fechaRegistro: null,
        fechaActualizacion: null
      }]
    });

    expect(valores.activo).toBeFalse();
    expect(valores.contactos.length).toBe(1);
    expect(valores.condicionPago).toBe('CONTADO');
  });
});
