import { OracleIcon } from '@/components/oracle/OracleIcon';

describe('OracleIcon', () => {
  it('renders a span with material-symbols-outlined class and icon name', () => {
    const result = OracleIcon({ name: 'upload_file' });
    expect(result.type).toBe('span');
    expect(result.props.className).toBe('material-symbols-outlined');
    expect(result.props.children).toBe('upload_file');
  });

  it('merges additional className', () => {
    const result = OracleIcon({ name: 'visibility', className: 'text-oracle-gold' });
    expect(result.props.className).toBe('material-symbols-outlined text-oracle-gold');
  });

  it('applies filled font-variation-settings when filled prop is true', () => {
    const result = OracleIcon({ name: 'shield', filled: true });
    expect(result.props.style).toEqual({ fontVariationSettings: "'FILL' 1" });
  });

  it('applies font-size when size prop is provided', () => {
    const result = OracleIcon({ name: 'map', size: 32 });
    expect(result.props.style).toEqual({ fontSize: '32px' });
  });

  it('applies both filled and size styles together', () => {
    const result = OracleIcon({ name: 'warning', filled: true, size: 24 });
    expect(result.props.style).toEqual({
      fontVariationSettings: "'FILL' 1",
      fontSize: '24px',
    });
  });

  it('has empty style object when no filled or size props', () => {
    const result = OracleIcon({ name: 'route' });
    expect(result.props.style).toEqual({});
  });
});
