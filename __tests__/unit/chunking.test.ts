import { describe, it, expect } from 'vitest';
import { chunkText } from '../../lib/brd/chunking';

describe('Map-Reduce Chunking Utility', () => {
  it('should not split text smaller than maxChunkSize', () => {
    const text = 'Hello world, this is a small text.';
    const chunks = chunkText(text, 100, 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].index).toBe(0);
  });

  it('should split text larger than maxChunkSize', () => {
    // 50 characters total, splitting at 20 max, with 5 overlap.
    const text = '12345678901234567890123456789012345678901234567890';
    const chunks = chunkText(text, 20, 5);
    
    expect(chunks.length).toBeGreaterThan(1);
    
    // First chunk is exactly 20 chars
    expect(chunks[0].content).toBe('12345678901234567890');
    
    // Second chunk starts with overlap (last 5 chars of previous chunk: '67890')
    // followed by the next 15 chars (total 20).
    expect(chunks[1].content).toBe('67890123456789012345');
    
    // Third chunk starts with overlap of chunk 2 ('12345')
    // followed by the remaining 10 chars.
    expect(chunks[2].content).toBe('12345678901234567890');
  });

  it('should handle text that perfectly divides by maxChunkSize - overlapSize', () => {
    const text = '1234567890'; // 10 chars
    // max 6 chars, overlap 2.
    // Chunk 0: 0 to 6 => '123456'
    // Chunk 1: 4 to 10 => '567890'
    const chunks = chunkText(text, 6, 2);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toBe('123456');
    expect(chunks[1].content).toBe('567890');
  });

  it('should prevent infinite loops when maxChunkSize <= overlapSize', () => {
    const text = 'This is dangerous';
    // If overlap is greater or equal to maxChunkSize, chunking would never advance.
    // The utility should enforce maxChunkSize > overlapSize.
    const chunks = chunkText(text, 5, 5); // overlap defaults to 0 or handled gracefully
    expect(chunks).toBeDefined();
    
    // Should fallback to advancing by at least 1 character.
    // But realistically the code should prevent this. Let's ensure it doesn't crash.
  });
});
