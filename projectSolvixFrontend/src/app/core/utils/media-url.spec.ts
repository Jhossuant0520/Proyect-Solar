import { API_ORIGIN, resolverUrlMedia } from './media-url';

describe('resolverUrlMedia', () => {
  it('retorna null si no hay URL', () => {
    expect(resolverUrlMedia(null)).toBeNull();
    expect(resolverUrlMedia('')).toBeNull();
    expect(resolverUrlMedia('   ')).toBeNull();
  });

  it('conserva URLs externas y blob', () => {
    expect(resolverUrlMedia('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(resolverUrlMedia('blob:http://localhost/x')).toBe('blob:http://localhost/x');
  });

  it('resuelve rutas relativas de SOLVIX con el origen del API', () => {
    expect(resolverUrlMedia('/api/v1/productos/imagenes/uuid.jpg'))
      .toBe(`${API_ORIGIN}/api/v1/productos/imagenes/uuid.jpg`);
  });
});
