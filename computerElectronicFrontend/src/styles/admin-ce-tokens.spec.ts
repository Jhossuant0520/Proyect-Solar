/**
 * Guarda contra la regresión de aliases circulares en el shell C&E.
 * Verifica valores efectivos de --color-* / tipografía en light y dark.
 */
describe('Admin C&E tokens (shell aliases)', () => {
  let host: HTMLElement;
  let shell: HTMLElement;
  const previousTheme = document.documentElement.getAttribute('data-theme');

  function token(el: Element, name: string): string {
    return getComputedStyle(el).getPropertyValue(name).trim();
  }

  function mountShell(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
    host = document.createElement('div');
    shell = document.createElement('div');
    shell.className = 'admin-shell';
    host.appendChild(shell);
    document.body.appendChild(host);
  }

  afterEach(() => {
    host?.remove();
    if (previousTheme) {
      document.documentElement.setAttribute('data-theme', previousTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  it('tema light: --color-* resuelven a identidad C&E (sin ciclos vacíos)', () => {
    mountShell('light');

    expect(token(shell, '--color-bg')).toBe('#f4f8fc');
    expect(token(shell, '--color-surface-1')).toBe('#ffffff');
    expect(token(shell, '--color-primary')).toBe('#006194');
    expect(token(shell, '--color-primary-soft')).toBe('#cce5ff');
    expect(token(shell, '--color-border')).toBe('#d7e3f0');
    expect(token(shell, '--color-text-primary')).toBe('#131b2e');
    expect(token(shell, '--ce-deep')).toBe('#004b73');
    expect(token(shell, '--ce-neon')).toBe('#006194');
    expect(token(shell, '--font-sans').toLowerCase()).toContain('space grotesk');

    const bg = getComputedStyle(shell).backgroundColor;
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).toBe('rgb(244, 248, 252)');
  });

  it('tema dark: --color-* resuelven a identidad C&E oscura (no neón SOLVIX root)', () => {
    mountShell('dark');

    expect(token(shell, '--color-bg')).toBe('#0b1520');
    expect(token(shell, '--color-primary')).toBe('#5eb3e0');
    expect(token(shell, '--solvix-bg')).toBe('#0b1520');
    expect(token(shell, '--solvix-primary')).toBe('#5eb3e0');
    expect(token(shell, '--ce-neon')).toBe('#5eb3e0');
    expect(token(shell, '--font-sans').toLowerCase()).toContain('space grotesk');

    // Root global SOLVIX no debe “ganar” dentro del shell
    expect(token(shell, '--color-primary')).not.toBe('#4fd1ff');
    expect(token(shell, '--color-bg')).not.toBe('#020617');
  });

  it('no deja --color-primary / --color-bg vacíos (regresión ciclo CSS)', () => {
    mountShell('light');
    expect(token(shell, '--color-bg').length).toBeGreaterThan(0);
    expect(token(shell, '--color-primary').length).toBeGreaterThan(0);
    expect(token(shell, '--color-surface-1').length).toBeGreaterThan(0);
    expect(token(shell, '--color-border').length).toBeGreaterThan(0);
    expect(token(shell, '--font-sans').length).toBeGreaterThan(0);
  });
});
