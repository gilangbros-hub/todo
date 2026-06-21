import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildExtractionPrompt } from '@/lib/brd/prompts/extract';
import { chunkText } from '@/lib/brd/chunking';
import { sanitizeImageReferences } from '@/lib/brd/sanitize';

const MAX_EXTRACTION_TIME = 300; // 5 minutes max for extraction

/**
 * Perform map-reduce chunking/extraction phase on a BRD document.
 * Processes large documents by extracting key content from chunks in parallel.
 */
export async function POST(request: NextRequest) {
  let documentId: string | undefined;
  try {
    const body = await request.json();
    const parsed = body as { documentId: string };
    documentId = parsed.documentId;

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Valid documentId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from('brd_documents')
      .select('id, source_text, extracted_text, user_id, sections_completed')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Failed to fetch document:', docError);
      return NextResponse.json(
        { error: `Document not found: ${docError.message}` },
        { status: 404 }
      );
    }

    // Check if user owns this document
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== doc.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized: Access denied to this document' },
        { status: 403 }
      );
    }

    // If extraction was already performed, return cached result
    if (doc.extracted_text && doc.extracted_text.trim()) {
      return NextResponse.json({
        status: 'cached',
        message: 'Extraction already completed',
        documentId,
        chunksProcessed: 0
      });
    }

    // Check if document needs extraction (large text)
    const textToProcess = doc.source_text;
    if (textToProcess.length <= 25000) {
      // No extraction needed, just update sections_completed
      const { error: updateError } = await supabase
        .from('brd_documents')
        .update({ 
          extracted_text: textToProcess,
          sections_completed: doc.sections_completed.includes('extraction') 
            ? doc.sections_completed 
            : [...doc.sections_completed, 'extraction']
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Failed to update document:', updateError);
        return NextResponse.json(
          { error: `Failed to update document: ${updateError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'skipped',
        message: 'Document is small, no extraction needed',
        documentId,
        chunksProcessed: 0
      });
    }

    // Proceed with chunking/extraction
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing DeepSeek API key' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });

    // Chunk the large text
    const chunks = chunkText(textToProcess, 25000, 1000);
    
    // Process extraction in parallel
    const extractionPromises = chunks.map(async (chunk) => {
      try {
        const res = await openai.chat.completions.create({
          model: 'deepseek-chat', // Fast model for extraction
          messages: [{ role: 'user', content: buildExtractionPrompt(chunk.content, chunk.index, chunks.length) }],
          temperature: 0.1,
        });
        return res.choices[0]?.message?.content || '';
      } catch (err) {
        console.error(`Chunk ${chunk.index} extraction failed:`, err);
        return ''; // Gracefully fail chunk
      }
    });

    const extractedContents = await Promise.all(extractionPromises);
    const finalExtractedText = extractedContents.filter(Boolean).join('\n\n---\n\n');
    
    // Sanitize the extracted text
    const sanitizedExtractedText = sanitizeImageReferences(finalExtractedText);

    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('brd_documents')
      .update({ 
        extracted_text: sanitizedExtractedText,
        sections_completed: doc.sections_completed.includes('extraction') 
          ? doc.sections_completed 
          : [...doc.sections_completed, 'extraction']
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document with extracted text:', updateError);
      return NextResponse.json(
        { error: `Failed to update document: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'extracted',
      message: 'Extraction completed successfully',
      documentId,
      chunksProcessed: chunks.length
    });
  } catch (error) {
    console.error('BRD extraction error:', error);
    
    // Update document status to failed
    try {
      if (documentId) {
        const supabase = await createClient();
        await supabase
          .from('brd_documents')
          .update({ analysis_status: 'failed' })
          .eq('id', documentId);
      }
    } catch (updateError) {
      console.error('Failed to update document status to failed:', updateError);
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Extraction failed: ${message}` },
      { status: 500 }
    );
  }
}