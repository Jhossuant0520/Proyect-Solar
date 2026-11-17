import {
  mapCatalogoCategoria,
  mapCatalogoProducto,
  mapCatalogoProductos
} from './catalogo-mapper';

describe('catalogo-mapper', () => {
  it('mapea DTO público a modelo UI sin inventar campos admin', () => {
    const producto = mapCatalogoProducto({
      id: 7,
      nombre: 'Panel 550W',
      marca: 'Solvix',
      descripcion: 'Alta eficiencia',
      precioVentaActual: '410000',
      imagenUrl: '  https://cdn.example/panel.jpg  ',
      categoriaId: 2,
      categoriaNombre: 'Paneles',
      disponibilidad: 'DISPONIBLE'
    });

    expect(producto).toEqual({
      id: 7,
      nombre: 'Panel 550W',
      marca: 'Solvix',
      descripcion: 'Alta eficiencia',
      precioVentaActual: 410000,
      imagenUrl: 'https://cdn.example/panel.jpg',
      categoriaId: 2,
      categoriaNombre: 'Paneles',
      disponibilidad: 'DISPONIBLE'
    });
    expect((producto as unknown as Record<string, unknown>)['costoActual']).toBeUndefined();
    expect((producto as unknown as Record<string, unknown>)['stockActual']).toBeUndefined();
  });

  it('normaliza AGOTADO e imagen vacía', () => {
    const producto = mapCatalogoProducto({
      id: 1,
      nombre: 'X',
      marca: 'Y',
      precioVentaActual: 10,
      imagenUrl: '   ',
      disponibilidad: 'AGOTADO'
    });

    expect(producto.disponibilidad).toBe('AGOTADO');
    expect(producto.imagenUrl).toBeNull();
  });

  it('mapea listas y categorías', () => {
    expect(mapCatalogoProductos([])).toEqual([]);
    expect(mapCatalogoCategoria({ id: 3, codigo: 'SOL', nombre: 'Solar' })).toEqual({
      id: 3,
      codigo: 'SOL',
      nombre: 'Solar'
    });
  });
});
