import { describe, it, expect } from 'vitest';
import { buildCorePrompt } from '../../lib/brd/prompts/core';
import { buildAdvisoryPrompt } from '../../lib/brd/prompts/advisory';
import { buildExtractionPrompt } from '../../lib/brd/prompts/extract';

describe('Prompt Builders', () => {
  it('should build core prompt containing the injected text', () => {
    const text = 'This is a test BRD for core prompt.';
    const prompt = buildCorePrompt(text);
    expect(prompt).toContain(text);
    expect(prompt).toContain('features');
    expect(prompt).toContain('flow_process');
  });

  it('should build advisory prompt containing the injected text', () => {
    const text = 'This is a test BRD for advisory prompt.';
    const prompt = buildAdvisoryPrompt(text);
    expect(prompt).toContain(text);
    expect(prompt).toContain('IMPROVEMENTS');
    expect(prompt).toContain('QUESTIONS');
    expect(prompt).toContain('RISK_ANALYSIS');
  });

  it('should build extraction prompt containing the injected text and chunk info', () => {
    const text = 'This is chunk content.';
    const prompt = buildExtractionPrompt(text, 2, 5);
    expect(prompt).toContain(text);
    expect(prompt).toContain('bagian ke-3 dari 5'); // index is 0-based
    expect(prompt).toContain('ekstrak SEMUA fakta');
  });
});
