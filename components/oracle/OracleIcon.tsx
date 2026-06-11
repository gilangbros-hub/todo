interface OracleIconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
}

export function OracleIcon({ name, className, filled, size }: OracleIconProps) {
  const style: React.CSSProperties = {
    ...(filled && { fontVariationSettings: "'FILL' 1" }),
    ...(size && { fontSize: `${size}px` }),
  };

  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`}
      style={style}
    >
      {name}
    </span>
  );
}
