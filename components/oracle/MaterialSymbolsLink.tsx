/**
 * Renders the <link> tag for Google Material Symbols Outlined icon font.
 * Include this component in the Oracle layout to load the icon font.
 *
 * Material Symbols cannot be loaded via next/font (it's an icon font, not a text font),
 * so we use a standard <link> tag approach.
 */
export function MaterialSymbolsLink() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
    />
  );
}
