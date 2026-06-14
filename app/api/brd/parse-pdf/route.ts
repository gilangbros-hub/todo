import { NextRequest, NextResponse } from 'next/server';
import { sanitizeImageReferences } from '@/lib/brd/sanitize';

// Use formData upload instead of base64 JSON to stay under
// Vercel's 4.5 MB serverless function payload limit.
// NOTE: Files larger than ~4 MB will be rejected by Vercel's edge
// before reaching this handler. The client-side validation enforces a
// 4 MB cap with a descriptive error message.
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileName = (formData.get('fileName') as string | null) ?? 'document.pdf';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Read directly from the Web API File → ArrayBuffer → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to avoid bundling issues with pdf-parse
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || pdfData.text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be image-based or empty.' },
        { status: 422 }
      );
    }

    // Sanitize extracted text: strip control characters, PDF artifacts, and image references
    let cleanText = pdfData.text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // control chars except \t\n\r
      .replace(/\r\n/g, '\n') // normalize line endings
      .replace(/\r/g, '\n')
      .replace(/<<\/[A-Za-z]+\s*\/[A-Za-z]+\s*\d+\s*\d+\s*R>>/g, '') // PDF object refs
      .replace(/\/[A-Za-z]+\s+\d+\s+\d+\s+R/gi, '') // PDF reference patterns
      .replace(/[^\S\n]+/g, ' ') // collapse multiple spaces (preserve newlines)
      .replace(/\n{3,}/g, '\n\n'); // collapse multiple blank lines

    cleanText = sanitizeImageReferences(cleanText).trim();

    if (cleanText.length < 10) {
      return NextResponse.json(
        { error: 'No readable text could be extracted from this PDF. The file may be scanned/image-based.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: cleanText,
      pages: pdfData.numpages,
      fileName,
    });
  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF file' },
      { status: 500 }
    );
  }
}
