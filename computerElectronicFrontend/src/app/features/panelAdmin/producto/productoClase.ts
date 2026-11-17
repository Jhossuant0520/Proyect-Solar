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
  /** Identificador opcional. null/undefined = no registrado. Se trata como string. */
  codigoBarras?: string | null;
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

/** Body de POST/PUT /api/v1/productos. Nombres y tipos iguales al DTO Java. */
export interface ProductoRequestDTO {
  nombre: string;
  marca: string;
  categoriaId: number;
  precioVentaActual: number;
  costoActual?: number | null;
  stockInicial?: number | null;
  codigoBarras?: string | null;
  descripcion?: string | null;
  imagenUrl?: string | null;
  activo?: boolean | null;
}

export interface ProductoFiltros {
  marca?: string;
  categoriaId?: number;
  precioMin?: number;
  precioMax?: number;
  stockMin?: number;
  activo?: boolean;
}
