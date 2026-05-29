import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildAnalysisPrompt, validateAnalysisResponse } from '@/lib/brd/prompt';

const MAX_INPUT_CHARS = 100_000; // ~100k chars max input

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, title, fileName } = body as {
      text: string;
      title: string;
      fileName: string | null;
    };

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No document text provided' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'No document title provided' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 50) {
      return NextResponse.json(
        { error: 'Document text is too short (minimum 50 characters)' },
        { status: 400 }
      );
    }

    if (trimmedText.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Document text exceeds maximum length (${MAX_INPUT_CHARS} characters)` },
        { status: 400 }
      );
    }

    // Call Gemini
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Oracle is not configured. Missing API key.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = buildAnalysisPrompt(trimmedText);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // Parse JSON from response (strip markdown code fences if present)
    let parsed: unknown;
    try {
      const cleaned = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'The Oracle could not decipher this scroll. Please try again.' },
        { status: 422 }
      );
    }

    // Validate structure
    const features = validateAnalysisResponse(parsed);

    return NextResponse.json({
      features,
      title: title.trim().slice(0, 200),
      fileName: fileName || null,
      sourceText: trimmedText,
    });
  } catch (error) {
    console.error('BRD analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Oracle failed: ${message}` },
      { status: 500 }
    );
  }
}
