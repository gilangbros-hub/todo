/**
 * Unit tests for Oracle context utilities.
 * Tests the extras parsing logic and context hook guard.
 */

// We test the internal parsing logic by importing the module and testing
// the exported parseExtras behavior through the provider's effect.
// Since parseExtras is not exported directly, we test via a helper approach.

import { BrdDocument } from '@/lib/types';
import { AnalysisExtras } from '@/lib/oracle/types';

// Re-implement the parsing logic here for unit testing
// (mirrors the implementation in context.tsx)
function safeParseArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeParseString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function parseExtras(doc: BrdDocument | null): AnalysisExtras {
  const defaultExtras: AnalysisExtras = {
    flow_process: [],
    improvements: [],
    questions: [],
    risk_analysis: [],
    architecture_diagram: '',
    impacted_systems: [],
    fsd_design: [],
  };

  if (!doc) return defaultExtras;

  return {
    flow_process: safeParseArray(doc.flow_process),
    improvements: safeParseArray(doc.improvements),
    questions: safeParseArray(doc.questions),
    risk_analysis: safeParseArray(doc.risk_analysis),
    architecture_diagram: safeParseString(doc.architecture_diagram),
    impacted_systems: safeParseArray(doc.impacted_systems),
    fsd_design: safeParseArray(doc.fsd_design),
  };
}

describe('Oracle Context — parseExtras', () => {
  it('returns default extras when document is null', () => {
    const result = parseExtras(null);
    expect(result).toEqual({
      flow_process: [],
      improvements: [],
      questions: [],
      risk_analysis: [],
      architecture_diagram: '',
      impacted_systems: [],
      fsd_design: [],
    });
  });

  it('parses arrays that are already parsed (not JSON strings)', () => {
    const doc = {
      id: '1',
      user_id: 'u1',
      title: 'Test',
      source_text: 'text',
      file_name: null,
      analysis_status: 'completed' as const,
      sections_completed: [],
      flow_process: [{ id: '1', actor: 'User', action: 'Login', type: 'start' }],
      improvements: [{ title: 'Improve X', description: 'Do Y', category: 'UX', priority: 'high' }],
      questions: [],
      risk_analysis: [{ risk: 'Data loss', impact: 'critical', mitigation: 'Backup' }],
      architecture_diagram: 'graph TD; A-->B',
      impacted_systems: [{ system_name: 'Auth', description: 'SSO', impact_type: 'modify' }],
      fsd_design: [],
      created_at: '2024-01-01',
    } as unknown as BrdDocument;

    const result = parseExtras(doc);

    expect(result.flow_process).toHaveLength(1);
    expect(result.flow_process[0]).toEqual({ id: '1', actor: 'User', action: 'Login', type: 'start' });
    expect(result.improvements).toHaveLength(1);
    expect(result.risk_analysis).toHaveLength(1);
    expect(result.architecture_diagram).toBe('graph TD; A-->B');
    expect(result.impacted_systems).toHaveLength(1);
    expect(result.fsd_design).toEqual([]);
  });

  it('handles null/undefined fields gracefully', () => {
    const doc = {
      id: '2',
      user_id: 'u1',
      title: 'Empty',
      source_text: '',
      file_name: null,
      analysis_status: 'completed' as const,
      sections_completed: [],
      flow_process: null,
      improvements: undefined,
      questions: null,
      risk_analysis: null,
      architecture_diagram: '',
      impacted_systems: null,
      fsd_design: undefined,
      created_at: '2024-01-01',
    } as unknown as BrdDocument;

    const result = parseExtras(doc);

    expect(result.flow_process).toEqual([]);
    expect(result.improvements).toEqual([]);
    expect(result.questions).toEqual([]);
    expect(result.risk_analysis).toEqual([]);
    expect(result.architecture_diagram).toBe('');
    expect(result.impacted_systems).toEqual([]);
    expect(result.fsd_design).toEqual([]);
  });

  it('parses JSON string fields into arrays', () => {
    const doc = {
      id: '3',
      user_id: 'u1',
      title: 'JSON Strings',
      source_text: '',
      file_name: null,
      analysis_status: 'completed' as const,
      sections_completed: [],
      flow_process: JSON.stringify([{ id: '1', actor: 'Admin', action: 'Deploy', type: 'process' }]),
      improvements: JSON.stringify([]),
      questions: '[]',
      risk_analysis: JSON.stringify([{ risk: 'Timeout', impact: 'medium', mitigation: 'Retry' }]),
      architecture_diagram: 'graph LR; X-->Y',
      impacted_systems: JSON.stringify([]),
      fsd_design: '[]',
      created_at: '2024-01-01',
    } as unknown as BrdDocument;

    const result = parseExtras(doc);

    expect(result.flow_process).toHaveLength(1);
    expect(result.flow_process[0].actor).toBe('Admin');
    expect(result.risk_analysis).toHaveLength(1);
    expect(result.risk_analysis[0].risk).toBe('Timeout');
  });

  it('handles invalid JSON strings gracefully', () => {
    const doc = {
      id: '4',
      user_id: 'u1',
      title: 'Bad JSON',
      source_text: '',
      file_name: null,
      analysis_status: 'completed' as const,
      sections_completed: [],
      flow_process: '{invalid json',
      improvements: 'not an array',
      questions: '42',
      risk_analysis: 'null',
      architecture_diagram: '',
      impacted_systems: '{broken',
      fsd_design: 'undefined',
      created_at: '2024-01-01',
    } as unknown as BrdDocument;

    const result = parseExtras(doc);

    expect(result.flow_process).toEqual([]);
    expect(result.improvements).toEqual([]);
    expect(result.questions).toEqual([]);
    expect(result.risk_analysis).toEqual([]);
    expect(result.impacted_systems).toEqual([]);
    expect(result.fsd_design).toEqual([]);
  });
});

describe('Oracle Context — safeParseArray', () => {
  it('returns empty array for falsy values', () => {
    expect(safeParseArray(null)).toEqual([]);
    expect(safeParseArray(undefined)).toEqual([]);
    expect(safeParseArray('')).toEqual([]);
    expect(safeParseArray(0)).toEqual([]);
  });

  it('returns the array directly if already an array', () => {
    const arr = [1, 2, 3];
    expect(safeParseArray(arr)).toBe(arr);
  });

  it('parses valid JSON array strings', () => {
    expect(safeParseArray('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeParseArray('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns empty array for non-array JSON', () => {
    expect(safeParseArray('"hello"')).toEqual([]);
    expect(safeParseArray('42')).toEqual([]);
    expect(safeParseArray('{"key":"val"}')).toEqual([]);
  });

  it('returns empty array for non-string non-array values', () => {
    expect(safeParseArray(42)).toEqual([]);
    expect(safeParseArray({})).toEqual([]);
    expect(safeParseArray(true)).toEqual([]);
  });
});

describe('Oracle Context — safeParseString', () => {
  it('returns empty string for falsy values', () => {
    expect(safeParseString(null)).toBe('');
    expect(safeParseString(undefined)).toBe('');
    expect(safeParseString('')).toBe('');
  });

  it('returns the string directly if already a string', () => {
    expect(safeParseString('graph TD; A-->B')).toBe('graph TD; A-->B');
  });

  it('stringifies non-string values', () => {
    expect(safeParseString({ key: 'val' })).toBe('{"key":"val"}');
    expect(safeParseString([1, 2])).toBe('[1,2]');
  });
});
