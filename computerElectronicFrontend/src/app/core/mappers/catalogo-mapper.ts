import {
  CatalogoCategoria,
  CatalogoProducto,
  DisponibilidadCatalogo
} from '../models/catalogo.models';

/** DTO crudo de la API pública (números pueden llegar como string desde JSON). */
export interface CatalogoProductoDto {
  id: number;
  nombre: string;
  marca: string;
  descripcion?: string | null;
  precioVentaActual: number | string;
  imagenUrl?: string | null;
  categoriaId?: number | null;
  categoriaNombre?: string | null;
  disponibilidad: DisponibilidadCatalogo | string;
}

export interface CatalogoCategoriaDto {
  id: number;
  codigo: string;
  nombre: string;
}

function aNumero(value: number | string | null | undefined): number {
  if (value == null || value === '') {
    return 0;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizarDisponibilidad(value: string | null | undefined): DisponibilidadCatalogo {
  return value === 'AGOTADO' ? 'AGOTADO' : 'DISPONIBLE';
}

/**
 * DTO público → modelo UI.
 * No calcula stock, costo, ganancia ni margen.
 */
export function mapCatalogoProducto(dto: CatalogoProductoDto): CatalogoProducto {
  return {
    id: dto.id,
    nombre: dto.nombre ?? '',
    marca: dto.marca ?? '',
    descripcion: dto.descripcion ?? null,
    precioVentaActual: aNumero(dto.precioVentaActual),
    imagenUrl: dto.imagenUrl?.trim() ? dto.imagenUrl.trim() : null,
    categoriaId: dto.categoriaId ?? null,
    categoriaNombre: dto.categoriaNombre ?? null,
    disponibilidad: normalizarDisponibilidad(dto.disponibilidad)
  };
}

export function mapCatalogoProductos(dtos: CatalogoProductoDto[]): CatalogoProducto[] {
  return (dtos ?? []).map(mapCatalogoProducto);
}

export function mapCatalogoCategoria(dto: CatalogoCategoriaDto): CatalogoCategoria {
  return {
    id: dto.id,
    codigo: dto.codigo ?? '',
    nombre: dto.nombre ?? ''
  };
}

export function mapCatalogoCategorias(dtos: CatalogoCategoriaDto[]): CatalogoCategoria[] {
  return (dtos ?? []).map(mapCatalogoCategoria);
}
