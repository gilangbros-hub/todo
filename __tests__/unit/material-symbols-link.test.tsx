import { MaterialSymbolsLink } from '@/components/oracle/MaterialSymbolsLink';

describe('MaterialSymbolsLink', () => {
  it('renders a link element with correct rel attribute', () => {
    const result = MaterialSymbolsLink();
    expect(result.type).toBe('link');
    expect(result.props.rel).toBe('stylesheet');
  });

  it('points to Google Fonts Material Symbols Outlined', () => {
    const result = MaterialSymbolsLink();
    expect(result.props.href).toContain('fonts.googleapis.com');
    expect(result.props.href).toContain('Material+Symbols+Outlined');
  });

  it('includes variable font axes (opsz, wght, FILL, GRAD)', () => {
    const result = MaterialSymbolsLink();
    expect(result.props.href).toContain('opsz');
    expect(result.props.href).toContain('FILL');
    expect(result.props.href).toContain('GRAD');
  });
});
