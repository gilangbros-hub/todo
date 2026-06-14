/**
 * Utility functions for chunking large text documents.
 */

export interface TextChunk {
  index: number;
  content: string;
  isLast: boolean;
}

/**
 * Splits a large text into overlapping chunks.
 * Uses a basic word/character-boundary splitting strategy.
 * 
 * @param text The full text to split.
 * @param chunkSize Maximum characters per chunk.
 * @param overlapSize Number of characters to overlap between chunks.
 * @returns Array of TextChunk objects.
 */
export function chunkText(text: string, chunkSize: number = 25000, overlapSize: number = 1000): TextChunk[] {
  if (!text) return [];
  
  const chunks: TextChunk[] = [];
  let currentIndex = 0;
  let chunkIndex = 0;

  while (currentIndex < text.length) {
    let endIndex = currentIndex + chunkSize;

    if (endIndex < text.length) {
      // Try to find a safe boundary (like a newline or double newline) within the last 500 chars of the chunk
      const searchStart = Math.max(currentIndex, endIndex - 500);
      const boundaryWindow = text.substring(searchStart, endIndex);
      
      const safeBoundary = Math.max(
        boundaryWindow.lastIndexOf('\n\n'),
        boundaryWindow.lastIndexOf('\n'),
        boundaryWindow.lastIndexOf('. ')
      );
      
      if (safeBoundary !== -1 && safeBoundary > 0) {
        endIndex = searchStart + safeBoundary + (boundaryWindow[safeBoundary] === '.' ? 1 : 0);
      }
    }

    const chunkContent = text.substring(currentIndex, endIndex);
    const isLast = endIndex >= text.length;

    chunks.push({
      index: chunkIndex,
      content: chunkContent.trim(),
      isLast,
    });

    const previousIndex = currentIndex;
    
    // Advance index, subtracting the overlap to ensure context continuity
    currentIndex = endIndex - overlapSize;
    chunkIndex++;

    // Prevent infinite loops if overlap is larger than progression
    if (currentIndex <= previousIndex) {
      currentIndex = endIndex; // Force progress if overlap ate our whole progression
    }

    if (isLast) break;
  }

  return chunks;
}
