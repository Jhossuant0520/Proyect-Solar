import {
  CondicionPagoProveedor,
  ContactoProveedorRequestDTO,
  ContactoProveedorResponseDTO,
  ProveedorRequestDTO,
  ProveedorResponseDTO,
  TipoContactoProveedor
} from '../../../core/models/proveedor.models';

export interface ContactoFormValores {
  id: number | null;
  nombre: string;
  cargo: string;
  telefono: string;
  celular: string;
  email: string;
  tipoContacto: TipoContactoProveedor;
  principal: boolean;
  activo: boolean;
}

export interface ProveedorFormValores {
  razonSocial: string;
  numeroDocumento: string;
  nombreComercial: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono: string;
  telefonoAlternativo: string;
  email: string;
  web: string;
  condicionPago: CondicionPagoProveedor | '';
  diasCredito: number | null;
  notas: string;
  activo: boolean;
  contactos: ContactoFormValores[];
}

function vacioANull(valor: string | null | undefined): string | null {
  const texto = valor?.trim() ?? '';
  return texto ? texto : null;
}

export function contactoVacio(): ContactoFormValores {
  return {
    id: null,
    nombre: '',
    cargo: '',
    telefono: '',
    celular: '',
    email: '',
    tipoContacto: 'COMERCIAL',
    principal: false,
    activo: true
  };
}

export function aContactoRequest(contacto: ContactoFormValores): ContactoProveedorRequestDTO {
  return {
    id: contacto.id,
    nombre: contacto.nombre.trim(),
    cargo: vacioANull(contacto.cargo),
    telefono: vacioANull(contacto.telefono),
    celular: vacioANull(contacto.celular),
    email: vacioANull(contacto.email),
    tipoContacto: contacto.tipoContacto,
    principal: contacto.principal,
    activo: contacto.activo
  };
}

export function aProveedorRequest(valores: ProveedorFormValores): ProveedorRequestDTO {
  const condicion = valores.condicionPago || null;
  return {
    razonSocial: valores.razonSocial.trim(),
    numeroDocumento: valores.numeroDocumento.trim(),
    nombreComercial: vacioANull(valores.nombreComercial),
    direccion: vacioANull(valores.direccion),
    ciudad: vacioANull(valores.ciudad),
    departamento: vacioANull(valores.departamento),
    telefono: vacioANull(valores.telefono),
    telefonoAlternativo: vacioANull(valores.telefonoAlternativo),
    email: vacioANull(valores.email),
    web: vacioANull(valores.web),
    condicionPago: condicion,
    diasCredito: condicion === 'CREDITO' ? valores.diasCredito : condicion === 'CONTADO' ? 0 : valores.diasCredito,
    notas: vacioANull(valores.notas),
    activo: valores.activo,
    contactos: valores.contactos
      .filter(c => c.nombre.trim())
      .map(aContactoRequest)
  };
}

export function aRequestConEstado(proveedor: ProveedorResponseDTO, activo: boolean): ProveedorRequestDTO {
  return {
    razonSocial: proveedor.razonSocial || proveedor.nombre,
    numeroDocumento: proveedor.numeroDocumento || proveedor.documento || '',
    nombreComercial: proveedor.nombreComercial,
    direccion: proveedor.direccion,
    ciudad: proveedor.ciudad,
    departamento: proveedor.departamento,
    telefono: proveedor.telefono,
    telefonoAlternativo: proveedor.telefonoAlternativo,
    email: proveedor.email,
    web: proveedor.web,
    condicionPago: proveedor.condicionPago,
    diasCredito: proveedor.diasCredito,
    notas: proveedor.notas,
    activo,
    contactos: (proveedor.contactos || []).map(desdeContactoResponse)
  };
}

function desdeContactoResponse(c: ContactoProveedorResponseDTO): ContactoProveedorRequestDTO {
  return {
    id: c.id,
    nombre: c.nombre,
    cargo: c.cargo,
    telefono: c.telefono,
    celular: c.celular,
    email: c.email,
    tipoContacto: c.tipoContacto,
    principal: c.principal,
    activo: c.activo
  };
}

export function valoresDesdeProveedor(proveedor: ProveedorResponseDTO): ProveedorFormValores {
  return {
    razonSocial: proveedor.razonSocial || proveedor.nombre || '',
    numeroDocumento: proveedor.numeroDocumento || proveedor.documento || '',
    nombreComercial: proveedor.nombreComercial ?? '',
    direccion: proveedor.direccion ?? '',
    ciudad: proveedor.ciudad ?? '',
    departamento: proveedor.departamento ?? '',
    telefono: proveedor.telefono ?? '',
    telefonoAlternativo: proveedor.telefonoAlternativo ?? '',
    email: proveedor.email ?? '',
    web: proveedor.web ?? '',
    condicionPago: proveedor.condicionPago ?? '',
    diasCredito: proveedor.diasCredito,
    notas: proveedor.notas ?? '',
    activo: proveedor.activo,
    contactos: (proveedor.contactos || []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      cargo: c.cargo ?? '',
      telefono: c.telefono ?? '',
      celular: c.celular ?? '',
      email: c.email ?? '',
      tipoContacto: c.tipoContacto,
      principal: c.principal,
      activo: c.activo
    }))
  };
}

export function rutaCompra(id: number | null | undefined): string[] | null {
  if (id == null) {
    return null;
  }
  return ['/compras', String(id)];
}
