const CHUNK_TARGET = 3.5 * 1024 * 1024; // 3.5 MB target — safe under Vercel's 4.5 MB limit
const MIN_PAGES = 1;

/**
 * Split a PDF file into smaller chunks so each chunk stays under Vercel's
 * serverless function payload limit (4.5 MB).  Returns the chunks as File
 * objects ready for upload, or a single-element array if no split is needed.
 */
export async function splitPdf(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });
  const pageCount = sourcePdf.getPageCount();

  if (pageCount <= MIN_PAGES) return [file];

  const avgPageSize = file.size / pageCount;
  const pagesPerChunk = Math.max(MIN_PAGES, Math.floor(CHUNK_TARGET / avgPageSize));

  if (pagesPerChunk >= pageCount) return [file];

  const totalChunks = Math.ceil(pageCount / pagesPerChunk);
  const chunks: File[] = [];

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const start = chunkIdx * pagesPerChunk;
    const end = Math.min(start + pagesPerChunk, pageCount);
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);

    const chunkDoc = await PDFDocument.create();
    const copied = await chunkDoc.copyPages(sourcePdf, pageIndices);
    copied.forEach((p) => chunkDoc.addPage(p));

    const chunkBytes = await chunkDoc.save();
    const partNum = chunkIdx + 1;
    const chunkFile = new File(
      [chunkBytes],
      file.name.replace(/\.pdf$/i, `_part${partNum}.pdf`),
      { type: 'application/pdf' },
    );
    chunks.push(chunkFile);
    onProgress?.(partNum, totalChunks);
  }

  return chunks;
}

type ParsePdfResult = { text: string; pages?: number };

async function parseChunk(file: File, fileName: string): Promise<ParsePdfResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('fileName', fileName);

  const res = await fetch('/api/brd/parse-pdf', {
    method: 'POST',
    body: form,
  });

  if (res.status === 413) {
    throw new Error(
      `PDF part "${fileName}" exceeds the server size limit. Try a smaller original file.`,
    );
  }

  if (!res.ok) {
    let msg = `Failed to parse "${fileName}"`;
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch {
      /* non-JSON Vercel error page */
    }
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Parse a PDF file on the server, transparently splitting it into smaller
 * chunks if it exceeds Vercel's function payload limit.  Returns the combined
 * extracted text.
 */
export async function parsePdfWithSplit(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ text: string; fileName: string }> {
  const chunks = await splitPdf(file, (done, total) => {
    onProgress?.(`Splitting PDF... part ${done}/${total}`);
  });

  // Single chunk — no splitting needed, but still enforce the 300 K char cap
  // that the mission-control page expects.
  const MAX_TEXT_CHARS = 300_000;
  if (chunks.length === 1) {
    const result = await parseChunk(chunks[0], file.name);
    return { text: (result.text || '').slice(0, MAX_TEXT_CHARS), fileName: file.name };
  }

  onProgress?.(`Uploading ${chunks.length} parts...`);

  const results = await Promise.allSettled(
    chunks.map((chunk, i) =>
      parseChunk(chunk, `${file.name} (part ${i + 1}/${chunks.length})`),
    ),
  );

  const texts: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      texts.push(r.value.text || '');
    } else {
      console.error('Chunk upload failed:', r.reason);
    }
  }

  const combined = texts.join('\n\n');
  if (!combined.trim()) {
    throw new Error('No text could be extracted from any part of the PDF.');
  }

  onProgress?.('Parts combined. Starting analysis...');
  return { text: combined.slice(0, MAX_TEXT_CHARS), fileName: file.name };
}
