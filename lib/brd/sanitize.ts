/**
 * Strips image references from text before sending to LLMs that don't
 * support vision/image input (e.g. DeepSeek).  Removes inline PDF image
 * objects, markdown/HTML image syntax, and any bare filename ending in a
 * common image extension.
 */
export function sanitizeImageReferences(text: string): string {
  return text
    // PDF inline image objects: /Im123 Do  or  /Im456
    .replace(/\/Im\d+\s+Do/gi, '[image]')
    .replace(/\/Im\d+/gi, '[image]')
    // Markdown image syntax: ![alt](path/to/file.png)
    .replace(/!\[[^\]]*\]\([^)]*\.(?:png|jpe?g|gif|bmp|svg|tiff?|webp)\)/gi, '[image]')
    // HTML <img> tags
    .replace(/<img\b[^>]*\/?>/gi, '[image]')
    // Explicit [image: ...] markers
    .replace(/\[image:\s*[^\]]+\]/gi, '[image]')
    // Any bare filename (no spaces) ending in an image extension
    .replace(/\S+\.(?:png|jpe?g|gif|bmp|svg|tiff?|webp)/gi, '[image]')
    // Collapse sequences of multiple [image] tokens
    .replace(/(?:\[image\]\s*){2,}/g, '[image]');
}
