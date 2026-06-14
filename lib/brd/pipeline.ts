import OpenAI from 'openai';
import { chunkText } from './chunking';
import { buildExtractionPrompt } from './prompts/extract';
import { sanitizeImageReferences } from './sanitize';

/**
 * Run the map-reduce chunking extraction for large documents.
 * Splits text into chunks, extracts key info via a fast model in parallel,
 * then joins the results.
 *
 * Returns the original text unchanged if it's small enough.
 */
export async function runChunkExtraction(
  openai: OpenAI,
  text: string,
  chunkSize = 25000,
  overlapSize = 1000,
): Promise<string> {
  if (text.length <= chunkSize) return text;

  const chunks = chunkText(text, chunkSize, overlapSize);
  const extractionPromises = chunks.map(async (chunk) => {
    try {
      const res = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: buildExtractionPrompt(chunk.content, chunk.index, chunks.length) }],
        temperature: 0.1,
      });
      return res.choices[0]?.message?.content || '';
    } catch (err) {
      console.error(`Chunk ${chunk.index} failed:`, err);
      return '';
    }
  });

  const extractedContents = await Promise.all(extractionPromises);
  let result = extractedContents.filter(Boolean).join('\n\n---\n\n');
  result = sanitizeImageReferences(result);
  return result;
}
