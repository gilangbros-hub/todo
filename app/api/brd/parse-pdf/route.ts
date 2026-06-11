import { NextRequest, NextResponse } from 'next/server';

// Use formData upload instead of base64 JSON to stay under
// Vercel's 4.5 MB serverless function payload limit.
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

    return NextResponse.json({
      text: pdfData.text,
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
