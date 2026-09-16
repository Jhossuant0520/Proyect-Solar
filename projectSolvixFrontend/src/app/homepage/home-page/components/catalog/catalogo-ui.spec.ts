import {
  enlaceWhatsAppProducto,
  filtrarProductosCatalogo,
  labelDisponibilidad,
  productoCoincideBusqueda,
  tonoDisponibilidad
} from './catalogo-ui';
import { CatalogoProducto } from '../../../../core/models/catalogo.models';

const base: CatalogoProducto = {
  id: 1,
  nombre: 'Panel Solar 550W',
  marca: 'JA Solar',
  descripcion: 'Módulo monocristalino',
  precioVentaActual: 410000,
  imagenUrl: 'https://cdn.example/a.jpg',
  categoriaId: 10,
  categoriaNombre: 'Paneles',
  disponibilidad: 'DISPONIBLE'
};

describe('catalogo-ui', () => {
  it('etiqueta y tono de disponibilidad del backend', () => {
    expect(labelDisponibilidad('DISPONIBLE')).toBe('Disponible');
    expect(labelDisponibilidad('AGOTADO')).toBe('Agotado');
    expect(tonoDisponibilidad('DISPONIBLE')).toBe('success');
    expect(tonoDisponibilidad('AGOTADO')).toBe('warning');
  });

  it('filtra por categoría localmente', () => {
    const productos = [
      base,
      { ...base, id: 2, categoriaId: 20, nombre: 'Inversor' }
    ];
    expect(filtrarProductosCatalogo(productos, { categoriaId: 10, query: '' }).length).toBe(1);
    expect(filtrarProductosCatalogo(productos, { categoriaId: null, query: '' }).length).toBe(2);
  });

  it('busca localmente por nombre, marca y descripción', () => {
    expect(productoCoincideBusqueda(base, 'panel')).toBeTrue();
    expect(productoCoincideBusqueda(base, 'ja solar')).toBeTrue();
    expect(productoCoincideBusqueda(base, 'monocristalino')).toBeTrue();
    expect(productoCoincideBusqueda(base, 'xyz')).toBeFalse();
  });

  it('arma contacto WhatsApp sin inventar datos ajenos', () => {
    const url = enlaceWhatsAppProducto(base);
    expect(url).toContain('wa.me/573172901206');
    expect(decodeURIComponent(url)).toContain('Panel Solar 550W');
  });
});
