/**
 * Contratos del catálogo público. Alineados con CatalogoProductoResponseDTO
 * y CatalogoCategoriaResponseDTO. No incluyen datos administrativos.
 */

export type DisponibilidadCatalogo = 'DISPONIBLE' | 'AGOTADO';

export interface CatalogoProducto {
  id: number;
  nombre: string;
  marca: string;
  descripcion: string | null;
  precioVentaActual: number;
  imagenUrl: string | null;
  categoriaId: number | null;
  categoriaNombre: string | null;
  disponibilidad: DisponibilidadCatalogo;
}

export interface CatalogoCategoria {
  id: number;
  codigo: string;
  nombre: string;
}
