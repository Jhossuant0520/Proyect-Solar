export type CategoriaProducto =
  | 'GENERAL'
  | 'ELECTRONICA'
  | 'HERRAMIENTA'
  | 'SOFTWARE'
  | 'SERVICIO'
  | 'ACCESORIO'
  | 'OTRO';

export interface ProductoModel {
  id?: number;
  nombre: string;
  marca: string;
  categoria: CategoriaProducto;
  precio: number;
  cantidadStock: number;
  descripcion?: string;
  imagenUrl?: string;
  activo?: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export const CATEGORIAS_PRODUCTO: { value: CategoriaProducto; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ELECTRONICA', label: 'Electrónica' },
  { value: 'HERRAMIENTA', label: 'Herramienta' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'ACCESORIO', label: 'Accesorio' },
  { value: 'OTRO', label: 'Otro' }
];
