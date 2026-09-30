import { routes } from './app.routes';

function flattenRoutes(
  list: typeof routes,
  parent = ''
): Array<{ fullPath: string; route: (typeof routes)[number] }> {
  const out: Array<{ fullPath: string; route: (typeof routes)[number] }> = [];
  for (const route of list) {
    const segment = route.path ?? '';
    const fullPath = [parent, segment].filter(Boolean).join('/');
    out.push({ fullPath, route });
    if (route.children?.length) {
      out.push(...flattenRoutes(route.children as typeof routes, fullPath));
    }
  }
  return out;
}

describe('Rutas públicas consulta OT (D.12)', () => {
  const flat = flattenRoutes(routes);

  it('declara consulta/ot/:token sin authGuard ni adminGuard', () => {
    const match = flat.find(r => r.fullPath === 'consulta/ot/:token');
    expect(match).toBeTruthy();
    expect(match!.route.canActivate).toBeUndefined();
    expect(match!.route.loadComponent).toBeTruthy();
  });

  it('declara otras consultas públicas sin autenticación', () => {
    for (const path of ['consulta/documento/:token', 'consulta/cotizacion/:token']) {
      const match = flat.find(r => r.fullPath === path);
      expect(match).withContext(path).toBeTruthy();
      expect(match!.route.canActivate).withContext(path).toBeUndefined();
    }
  });

  it('no anida consulta/ot bajo AdminLayout con authGuard', () => {
    const adminShell = routes.find(
      r => r.component && r.canActivate && Array.isArray(r.children)
    );
    expect(adminShell).toBeTruthy();
    const nested = (adminShell!.children ?? []).some(
      c => (c.path ?? '').includes('consulta')
    );
    expect(nested).toBeFalse();
  });
});
