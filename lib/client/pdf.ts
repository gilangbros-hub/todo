// Vercel Hobby: 4.5 MB function payload.  FormData multipart encoding adds
// ~30 % overhead, so keep raw chunks under ~3.2 MB to stay well clear of 413s.
const MAX_CHUNK_BYTES = 3.2 * 1024 * 1024;
const STRIDE = 5; // trial-save every N pages to avoid O(n^2) for large docs

interface PdfLib {
  PDFDocument: {
    create: () => PdfDoc;
    load: (buf: ArrayBuffer, opts?: { ignoreEncryption?: boolean }) => Promise<PdfDoc>;
  };
}

interface PdfDoc {
  getPageCount: () => number;
  copyPages: (src: PdfDoc, indices: number[]) => Promise<PdfPage[]>;
  addPage: (page: PdfPage) => void;
  save: () => Promise<Uint8Array>;
}

interface PdfPage { /* opaque — used only through copyPages / addPage */ }

async function loadLib(): Promise<PdfLib> {
  return await import('pdf-lib') as unknown as PdfLib;
}

async function measureSubset(
  pdfLib: PdfLib,
  sourcePdf: PdfDoc,
  pageIndices: number[],
): Promise<number> {
  const doc = await pdfLib.PDFDocument.create();
  const copied = await doc.copyPages(sourcePdf, pageIndices);
  copied.forEach((pg) => doc.addPage(pg));
  const bytes = await doc.save();
  return bytes.byteLength;
}

async function saveSubset(
  pdfLib: PdfLib,
  sourcePdf: PdfDoc,
  pageIndices: number[],
  baseName: string,
  partNum: number,
): Promise<File> {
  const doc = await pdfLib.PDFDocument.create();
  const copied = await doc.copyPages(sourcePdf, pageIndices);
  copied.forEach((pg) => doc.addPage(pg));
  const bytes = await doc.save();
  return new File(
    [new Uint8Array(bytes)],
    baseName.replace(/\.pdf$/i, `_part${partNum}.pdf`),
    { type: 'application/pdf' },
  );
}

type ChunkSpec = { indices: number[] };

/**
 * Split a PDF file into smaller chunks so each chunk stays under Vercel's
 * serverless function payload limit.  Returns the chunks as File objects
 * ready for upload, or a single-element array if no split is needed.
 */
export async function splitPdf(
  file: File,
  onChunk?: (done: number) => void,
): Promise<File[]> {
  const pdfLib = await loadLib();
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await pdfLib.PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });
  const pageCount = sourcePdf.getPageCount();

  // Build chunks greedily: step forward STRIDE pages at a time, then
  // binary-search the exact split point when the accumulated size exceeds
  // the byte limit.
  const specs: ChunkSpec[] = [];
  let cursor = 0;

  while (cursor < pageCount) {
    let lo = cursor;
    let hi = pageCount + 1;

    for (let p = cursor; p < pageCount; p += STRIDE) {
      const trial = Array.from({ length: p + 1 - cursor }, (_, i) => cursor + i);
      const size = await measureSubset(pdfLib, sourcePdf, trial);
      if (size <= MAX_CHUNK_BYTES) {
        lo = p + 1;
      } else {
        hi = p + 1;
        break;
      }
    }
    if (hi > pageCount) hi = pageCount + 1;

    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      const trial = Array.from({ length: mid - cursor }, (_, i) => cursor + i);
      const size = await measureSubset(pdfLib, sourcePdf, trial);
      if (size <= MAX_CHUNK_BYTES) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    if (lo === cursor) {
      lo = cursor + 1;
    }

    const indices = Array.from({ length: lo - cursor }, (_, i) => cursor + i);
    specs.push({ indices });
    cursor = lo;
  }

  const chunks: File[] = [];
  for (let i = 0; i < specs.length; i++) {
    const chunkFile = await saveSubset(pdfLib, sourcePdf, specs[i].indices, file.name, i + 1);
    chunks.push(chunkFile);
    onChunk?.(i + 1);
  }

  return chunks.length > 0 ? chunks : [file];
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
  const chunks = await splitPdf(file, (done) => {
    onProgress?.(`Splitting PDF... part ${done}`);
  });

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
