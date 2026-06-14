import { describe, it, expect } from 'vitest';
import { sanitizeMermaid } from '../../lib/brd/mermaid';

describe('sanitizeMermaid', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeMermaid('')).toBe('');
  });

  it('strips markdown code fences', () => {
    const input = '```mermaid\ngraph TD\n    A["Hello"]\n```';
    const result = sanitizeMermaid(input);
    expect(result).not.toContain('```');
    expect(result).toContain('graph TD');
  });

  it('parses and rebuilds a simple graph', () => {
    const input = `graph TD
    A["Node A"]
    B["Node B"]
    A --> B`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('graph TD');
    expect(result).toContain('A["Node A"]');
    expect(result).toContain('B["Node B"]');
    expect(result).toContain('A --> B');
  });

  it('handles subgraphs', () => {
    const input = `graph LR
    subgraph SG1["My Subgraph"]
    A["Node A"]
    end
    B["Node B"]
    A --> B`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('subgraph SG1');
    expect(result).toContain('My Subgraph');
    expect(result).toContain('end');
  });

  it('handles edges with labels', () => {
    const input = `graph TD
    A --> B
    A -->|"sends data"| C`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('A --> B');
    expect(result).toContain('sends data');
  });

  it('cleans garbage delimiters from LLM output', () => {
    const input = `graph TD
    A["Node A"])"]
    B["Node B"])"]`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('graph TD');
    // Should not throw and should produce valid-ish output
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles flowchart keyword', () => {
    const input = `flowchart LR
    X["Start"]
    Y["End"]
    X --> Y`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('graph LR');
    expect(result).toContain('X --> Y');
  });

  it('closes unclosed subgraphs gracefully', () => {
    const input = `graph TD
    subgraph SG["Group"]
    A["Node"]`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('subgraph');
    expect(result).toContain('end');
  });

  it('returns minimal output for unparseable garbage', () => {
    const input = 'completely invalid non-mermaid text!!!';
    const result = sanitizeMermaid(input);
    expect(typeof result).toBe('string');
  });

  it('preserves direction from source diagram', () => {
    for (const dir of ['TD', 'LR', 'BT', 'RL']) {
      const input = `graph ${dir}\n    A["Node"]`;
      const result = sanitizeMermaid(input);
      expect(result).toContain(`graph ${dir}`);
    }
  });

  it('handles plain node IDs without shape delimiters', () => {
    const input = `graph TD
    MyNode
    Another`;
    const result = sanitizeMermaid(input);
    expect(result).toContain('MyNode');
    expect(result).toContain('Another');
  });
});
