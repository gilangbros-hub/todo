import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64, fileName } = body as { base64: string; fileName: string };

    if (!base64 || typeof base64 !== 'string') {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 });
    }

    // Convert base64 back to Buffer
    const buffer = Buffer.from(base64, 'base64');

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
