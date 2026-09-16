import { CatalogoProducto, DisponibilidadCatalogo } from '../../../../core/models/catalogo.models';

export function labelDisponibilidad(disponibilidad: DisponibilidadCatalogo | string): string {
  return disponibilidad === 'AGOTADO' ? 'Agotado' : 'Disponible';
}

export function tonoDisponibilidad(disponibilidad: DisponibilidadCatalogo | string): 'success' | 'warning' {
  return disponibilidad === 'AGOTADO' ? 'warning' : 'success';
}

export function productoCoincideBusqueda(producto: CatalogoProducto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return producto.nombre.toLowerCase().includes(q)
    || producto.marca.toLowerCase().includes(q)
    || (producto.descripcion ?? '').toLowerCase().includes(q);
}

export function filtrarProductosCatalogo(
  productos: CatalogoProducto[],
  filtros: { categoriaId: number | null; query: string }
): CatalogoProducto[] {
  return productos.filter(producto => {
    if (filtros.categoriaId != null && producto.categoriaId !== filtros.categoriaId) {
      return false;
    }
    return productoCoincideBusqueda(producto, filtros.query);
  });
}

export function tieneImagen(producto: CatalogoProducto): boolean {
  return Boolean(producto.imagenUrl?.trim());
}

/** WhatsApp opcional en ficha. No es la fuente de identidad del producto. */
export function enlaceWhatsAppProducto(producto: CatalogoProducto, numero = '573172901206'): string {
  const precio = producto.precioVentaActual.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  const mensaje = `Hola. Estoy interesado en: ${producto.nombre} — $${precio}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
