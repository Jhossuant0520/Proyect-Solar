export interface CategoriaProductoModel {
  id: number;
  codigo: string;
  nombre: string;
  activo?: boolean;
}

export interface ProductoModel {
  id?: number;
  nombre: string;
  marca: string;
  categoriaId: number;
  categoriaCodigo?: string;
  categoriaNombre?: string;
  precioVentaActual: number;
  /** null significa costo desconocido, no costo cero. */
  costoActual?: number | null;
  costoConocido?: boolean;
  stockActual?: number;
  /** Solo se envía al crear: genera un movimiento de carga inicial. */
  stockInicial?: number | null;
  descripcion?: string;
  imagenUrl?: string;
  activo?: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface ProductoFiltros {
  marca?: string;
  categoriaId?: number;
  precioMin?: number;
  precioMax?: number;
  stockMin?: number;
  activo?: boolean;
}
