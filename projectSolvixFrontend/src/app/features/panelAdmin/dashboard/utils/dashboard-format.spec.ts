import { formatImporte } from '../../venta/venta-ui';
import { formatMoney } from './dashboard-format';

describe('formatMoney / formatImporte (presentación COP)', () => {
  it('muestra enteros con separador de miles y sin ,00', () => {
    expect(formatMoney(100_000)).toBe('$100.000');
    expect(formatMoney(250_000)).toBe('$250.000');
    expect(formatMoney(1_500_000)).toBe('$1.500.000');
    expect(formatMoney(0)).toBe('$0');
  });

  it('formatImporte reutiliza el mismo formateador', () => {
    expect(formatImporte(168_000)).toBe('$168.000');
    expect(formatImporte(null)).toBe('—');
  });

  it('no altera el valor numérico de negocio (solo presentación)', () => {
    const precio = 125_000;
    const cantidad = 3;
    const subtotal = precio * cantidad;
    expect(subtotal).toBe(375_000);
    expect(formatMoney(subtotal)).toBe('$375.000');
    expect(formatMoney(subtotal)).not.toContain(',00');
  });
});
