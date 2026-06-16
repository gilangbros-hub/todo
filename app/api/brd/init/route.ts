import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeImageReferences } from '@/lib/brd/sanitize';

/**
 * Initialize a BRD analysis document.
 * Creates the document record and returns the ID for subsequent phases.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, title, fileName, model } = body as {
      text: string;
      title: string;
      fileName: string | null;
      model?: string;
    };

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Document text is too short (minimum 50 characters)' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Document title is required' },
        { status: 400 }
      );
    }

    const ALLOWED_MODELS = [
      'deepseek-v4-pro', 
      'deepseek-v4-flash', 
      'deepseek-chat', 
      'deepseek-reasoner'
    ];
    const selectedModel = model && ALLOWED_MODELS.includes(model) ? model : 'deepseek-v4-pro';

    // Sanitize input text
    let cleanText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // control chars
      .replace(/\r\n/g, '\n') // normalize line endings
      .replace(/\r/g, '\n')
      .trim();

    cleanText = sanitizeImageReferences(cleanText);

    if (cleanText.length < 50) {
      return NextResponse.json(
        { error: 'Document contains no readable text after sanitization' },
        { status: 400 }
      );
    }

    // Cap text size to prevent FUNCTION_PAYLOAD_TOO_LARGE errors
    const MAX_INPUT_CHARS = 300_000;
    if (cleanText.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Document text exceeds maximum length (${MAX_INPUT_CHARS} characters)` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create document record with status 'analyzing'
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .insert({
        title,
        source_text: cleanText,
        file_name: fileName,
        analysis_status: 'analyzing',
        sections_completed: [],
        extracted_text: '' // Initially empty, will be populated in extraction phase
      })
      .select()
      .single();

    if (docError) {
      console.error('Failed to create document:', docError);
      return NextResponse.json(
        { error: `Failed to create document: ${docError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId: doc.id,
      status: 'initialized',
      message: 'Document initialized successfully'
    });
  } catch (error) {
    console.error('BRD init error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Initialization failed: ${message}` },
      { status: 500 }
    );
  }
}