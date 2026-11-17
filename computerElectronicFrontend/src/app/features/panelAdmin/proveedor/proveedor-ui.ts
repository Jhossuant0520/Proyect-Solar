import { HttpErrorResponse } from '@angular/common/http';
import {
  CondicionPagoProveedor,
  ProveedorResponseDTO,
  TipoContactoProveedor
} from '../../../core/models/proveedor.models';

export const MENSAJE_NIT_DUPLICADO = 'Ya existe un proveedor con ese NIT.';

export const TIPOS_CONTACTO: { id: TipoContactoProveedor; label: string }[] = [
  { id: 'COMERCIAL', label: 'Comercial' },
  { id: 'FACTURACION', label: 'Facturación' },
  { id: 'LOGISTICA', label: 'Logística' },
  { id: 'SOPORTE', label: 'Soporte' },
  { id: 'OTRO', label: 'Otro' }
];

export const CONDICIONES_PAGO: { id: CondicionPagoProveedor; label: string }[] = [
  { id: 'CONTADO', label: 'Contado' },
  { id: 'CREDITO', label: 'Crédito' }
];

export function razonSocialVisible(proveedor: {
  razonSocial?: string | null;
  nombre?: string | null;
}): string {
  return (proveedor.razonSocial || proveedor.nombre || '—').trim() || '—';
}

export function documentoVisible(proveedor: {
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  documento?: string | null;
}): string {
  const numero = (proveedor.numeroDocumento || proveedor.documento || '').trim();
  if (!numero) {
    return 'Sin NIT';
  }
  return `NIT ${numero}`;
}

export function labelCondicionPago(valor: string | null | undefined): string {
  return CONDICIONES_PAGO.find(item => item.id === valor)?.label ?? (valor || '—');
}

export function labelTipoContacto(valor: string | null | undefined): string {
  return TIPOS_CONTACTO.find(item => item.id === valor)?.label ?? (valor || '—');
}

export function puedeDesactivarProveedor(proveedor: { activo?: boolean }): boolean {
  return proveedor.activo !== false;
}

export function proveedorCoincideBusqueda(proveedor: ProveedorResponseDTO, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const campos = [
    proveedor.razonSocial,
    proveedor.nombre,
    proveedor.nombreComercial,
    proveedor.numeroDocumento,
    proveedor.documento,
    proveedor.email,
    proveedor.telefono,
    proveedor.ciudad
  ];
  return campos.some(campo => (campo || '').toLowerCase().includes(q));
}

export function filtrarProveedores(
  proveedores: ProveedorResponseDTO[],
  opts: { query: string; activo: '' | 'true' | 'false' }
): ProveedorResponseDTO[] {
  return proveedores.filter(proveedor => {
    if (opts.activo === 'true' && !proveedor.activo) {
      return false;
    }
    if (opts.activo === 'false' && proveedor.activo) {
      return false;
    }
    return proveedorCoincideBusqueda(proveedor, opts.query);
  });
}

export function mensajeErrorProveedor(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object') {
      const msg = (body as { message?: string; mensaje?: string }).message
        || (body as { mensaje?: string }).mensaje;
      if (msg) {
        return msg;
      }
    }
    if (error.status === 409 || error.status === 400) {
      return MENSAJE_NIT_DUPLICADO;
    }
  }
  return 'No pudimos completar la operación con el proveedor.';
}
