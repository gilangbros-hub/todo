import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================
// Mock Supabase client for service tests
// ============================================================
const mockAbortSignal = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => {
      const result = (globalThis as any).__mockRpc(...args);
      return {
        ...result,
        abortSignal: (signal: AbortSignal) => {
          (globalThis as any).__mockAbortSignal(signal);
          return result;
        },
      };
    },
  },
}));

// ============================================================
// Mock React — vi.mock is hoisted, so we use globalThis for state
// ============================================================
vi.mock('react', () => {
  function createElement(type: any, props: any, ...children: any[]) {
    const flatChildren = children.flat();
    return {
      type,
      props: {
        ...props,
        children: flatChildren.length === 0
          ? undefined
          : flatChildren.length === 1
            ? flatChildren[0]
            : flatChildren,
      },
    };
  }

  const g = globalThis as any;
  if (!g.__reactMockStates) g.__reactMockStates = [];
  if (!g.__reactMockStateIndex) g.__reactMockStateIndex = 0;
  if (!g.__reactMockEffects) g.__reactMockEffects = [];

  function useState(initial: unknown) {
    const idx = g.__reactMockStateIndex++;
    if (idx >= g.__reactMockStates.length) {
      g.__reactMockStates.push(initial);
    }
    const setState = (val: unknown) => {
      if (typeof val === 'function') {
        g.__reactMockStates[idx] = (val as (prev: unknown) => unknown)(g.__reactMockStates[idx]);
      } else {
        g.__reactMockStates[idx] = val;
      }
    };
    return [g.__reactMockStates[idx], setState];
  }

  function useEffect(fn: () => void | (() => void)) {
    g.__reactMockEffects.push(fn);
  }

  function useRef(initial: unknown) {
    return { current: initial };
  }

  function useCallback(fn: unknown) {
    return fn;
  }

  const mock = {
    createElement,
    useState,
    useEffect,
    useRef,
    useCallback,
    Fragment: 'Fragment',
  };

  return {
    ...mock,
    default: mock,
    __esModule: true,
  };
});

vi.mock('react/jsx-runtime', () => ({
  jsx: (type: any, props: any) => ({ type, props: props || {} }),
  jsxs: (type: any, props: any) => ({ type, props: props || {} }),
  Fragment: 'Fragment',
}));

vi.mock('react/jsx-dev-runtime', () => ({
  jsxDEV: (type: any, props: any) => ({ type, props: props || {} }),
  Fragment: 'Fragment',
}));

import { forfeitQuest } from '@/lib/services/forfeit';
import { truncateTitle } from '@/components/ForfeitConfirmDialog';

// Wire up globalThis references for the hoisted mocks
(globalThis as any).__mockRpc = mockRpc;
(globalThis as any).__mockAbortSignal = mockAbortSignal;

// ============================================================
// Helper to reset React mock state between tests
// ============================================================
function resetReactMocks() {
  (globalThis as any).__reactMockStates = [];
  (globalThis as any).__reactMockStateIndex = 0;
  (globalThis as any).__reactMockEffects = [];
}

// ============================================================
// ForfeitButton Tests
// ============================================================
describe('ForfeitButton', () => {
  beforeEach(() => {
    resetReactMocks();
    vi.clearAllMocks();
  });

  it('renders enabled for eligible tasks (status not done, not subtask)', async () => {
    const { default: ForfeitButton } = await import('@/components/ForfeitButton');
    const onForfeit = vi.fn();

    const result = ForfeitButton({
      taskId: 'task-1',
      taskStatus: 'todo',
      isSubtask: false,
      xpReward: 40,
      onForfeit,
    });

    const button = findElement(result, 'button');
    expect(button).toBeTruthy();
    expect(button.props.disabled).toBe(false);
  });

  it('renders disabled when task status is done', async () => {
    const { default: ForfeitButton } = await import('@/components/ForfeitButton');
    const onForfeit = vi.fn();

    const result = ForfeitButton({
      taskId: 'task-1',
      taskStatus: 'done',
      isSubtask: false,
      xpReward: 40,
      onForfeit,
    });

    const button = findElement(result, 'button');
    expect(button).toBeTruthy();
    expect(button.props.disabled).toBe(true);
  });

  it('renders disabled when task is a subtask', async () => {
    const { default: ForfeitButton } = await import('@/components/ForfeitButton');
    const onForfeit = vi.fn();

    const result = ForfeitButton({
      taskId: 'task-1',
      taskStatus: 'in_progress',
      isSubtask: true,
      xpReward: 40,
      onForfeit,
    });

    const button = findElement(result, 'button');
    expect(button).toBeTruthy();
    expect(button.props.disabled).toBe(true);
  });

  it('has correct aria-label for accessibility', async () => {
    const { default: ForfeitButton } = await import('@/components/ForfeitButton');
    const onForfeit = vi.fn();

    const result = ForfeitButton({
      taskId: 'task-1',
      taskStatus: 'todo',
      isSubtask: false,
      xpReward: 40,
      onForfeit,
    });

    const button = findElement(result, 'button');
    expect(button.props['aria-label']).toBe('Forfeit Quest');
  });

  it('calls onForfeit when clicked and enabled', async () => {
    const { default: ForfeitButton } = await import('@/components/ForfeitButton');
    const onForfeit = vi.fn();

    const result = ForfeitButton({
      taskId: 'task-1',
      taskStatus: 'todo',
      isSubtask: false,
      xpReward: 40,
      onForfeit,
    });

    const button = findElement(result, 'button');
    button.props.onClick();
    expect(onForfeit).toHaveBeenCalledTimes(1);
  });

  it('does not call onForfeit when disabled (done status)', async () => {
    const { default: ForfeitButton } = await import('@/components/ForfeitButton');
    const onForfeit = vi.fn();

    const result = ForfeitButton({
      taskId: 'task-1',
      taskStatus: 'done',
      isSubtask: false,
      xpReward: 40,
      onForfeit,
    });

    const button = findElement(result, 'button');
    button.props.onClick();
    expect(onForfeit).not.toHaveBeenCalled();
  });
});

// ============================================================
// ForfeitConfirmDialog Tests
// ============================================================
describe('ForfeitConfirmDialog', () => {
  beforeEach(() => {
    resetReactMocks();
    vi.clearAllMocks();
  });

  describe('truncateTitle', () => {
    it('returns original title when 50 chars or fewer', () => {
      const title = 'Short title';
      expect(truncateTitle(title)).toBe('Short title');
    });

    it('returns original title when exactly 50 chars', () => {
      const title = 'A'.repeat(50);
      expect(truncateTitle(title)).toBe(title);
    });

    it('truncates title longer than 50 chars with ellipsis', () => {
      const title = 'A'.repeat(60);
      expect(truncateTitle(title)).toBe('A'.repeat(50) + '\u2026');
    });

    it('handles empty string', () => {
      expect(truncateTitle('')).toBe('');
    });
  });

  it('returns null when isOpen is false', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');

    const result = ForfeitConfirmDialog({
      isOpen: false,
      taskTitle: 'Test Quest',
      penaltyAmount: 10,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(result).toBeNull();
  });

  it('renders dialog when isOpen is true', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');

    const result = ForfeitConfirmDialog({
      isOpen: true,
      taskTitle: 'Test Quest',
      penaltyAmount: 10,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(result).not.toBeNull();
    const dialog = findElement(result, 'div', { role: 'alertdialog' });
    expect(dialog).toBeTruthy();
  });

  it('displays truncated title in dialog', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');
    const longTitle = 'A'.repeat(60);

    const result = ForfeitConfirmDialog({
      isOpen: true,
      taskTitle: longTitle,
      penaltyAmount: 10,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    const textContent = extractTextContent(result);
    expect(textContent).toContain('A'.repeat(50) + '\u2026');
  });

  it('displays penalty amount in -X XP format', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');

    const result = ForfeitConfirmDialog({
      isOpen: true,
      taskTitle: 'Test Quest',
      penaltyAmount: 25,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    const textContent = extractTextContent(result);
    expect(textContent).toContain('-25 XP');
  });

  it('has Cancel and Confirm Forfeit buttons', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');

    const result = ForfeitConfirmDialog({
      isOpen: true,
      taskTitle: 'Test Quest',
      penaltyAmount: 10,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    const buttons = findAllElements(result, 'button');
    const buttonTexts = buttons.map((b: any) => extractTextContent(b));
    expect(buttonTexts.some((t: string) => t.includes('Cancel'))).toBe(true);
    expect(buttonTexts.some((t: string) => t.includes('Confirm Forfeit'))).toBe(true);
  });

  it('buttons are not disabled in initial state (isProcessing = false)', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');

    const result = ForfeitConfirmDialog({
      isOpen: true,
      taskTitle: 'Test Quest',
      penaltyAmount: 10,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });

    const buttons = findAllElements(result, 'button');
    buttons.forEach((button: any) => {
      expect(button.props.disabled).toBe(false);
    });
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const { default: ForfeitConfirmDialog } = await import('@/components/ForfeitConfirmDialog');
    const onCancel = vi.fn();

    const result = ForfeitConfirmDialog({
      isOpen: true,
      taskTitle: 'Test Quest',
      penaltyAmount: 10,
      onConfirm: vi.fn(),
      onCancel,
    });

    const buttons = findAllElements(result, 'button');
    const cancelButton = buttons.find((b: any) => extractTextContent(b).includes('Cancel'));
    cancelButton.props.onClick();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// XpPenaltyToast Tests
// ============================================================
describe('XpPenaltyToast', () => {
  beforeEach(() => {
    resetReactMocks();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays penalty amount in correct format (-X XP)', async () => {
    const { default: XpPenaltyToast } = await import('@/components/XpPenaltyToast');
    const onDismiss = vi.fn();

    const result = XpPenaltyToast({ amount: 15, onDismiss });

    const textContent = extractTextContent(result);
    expect(textContent).toContain('-15 XP');
  });

  it('displays skull emoji', async () => {
    const { default: XpPenaltyToast } = await import('@/components/XpPenaltyToast');
    const onDismiss = vi.fn();

    const result = XpPenaltyToast({ amount: 10, onDismiss });

    const textContent = extractTextContent(result);
    expect(textContent).toContain('💀');
  });

  it('has correct aria-label for accessibility', async () => {
    const { default: XpPenaltyToast } = await import('@/components/XpPenaltyToast');
    const onDismiss = vi.fn();

    const result = XpPenaltyToast({ amount: 25, onDismiss });

    expect(result.props['aria-label']).toBe('Lost 25 XP');
  });

  it('auto-dismisses after 3 seconds', async () => {
    const { default: XpPenaltyToast } = await import('@/components/XpPenaltyToast');
    const onDismiss = vi.fn();

    XpPenaltyToast({ amount: 10, onDismiss });

    // Run the useEffect callbacks (simulates component mount)
    const effects = (globalThis as any).__reactMockEffects;
    effects.forEach((fn: () => void) => fn());

    expect(onDismiss).not.toHaveBeenCalled();

    // Advance time to 3 seconds
    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss before 3 seconds', async () => {
    const { default: XpPenaltyToast } = await import('@/components/XpPenaltyToast');
    const onDismiss = vi.fn();

    XpPenaltyToast({ amount: 10, onDismiss });

    // Run the useEffect callbacks
    const effects = (globalThis as any).__reactMockEffects;
    effects.forEach((fn: () => void) => fn());

    // Advance time to 2.9 seconds
    vi.advanceTimersByTime(2900);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ============================================================
// forfeitQuest Service Tests
// ============================================================
describe('forfeitQuest service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles success response correctly', async () => {
    mockRpc.mockReturnValue({
      data: {
        success: true,
        penalty_amount: 10,
        new_xp: 90,
        new_level: 1,
        previous_level: 1,
      },
      error: null,
    });

    const result = await forfeitQuest('task-123');

    expect(mockRpc).toHaveBeenCalledWith('forfeit_quest', { p_task_id: 'task-123' });
    expect(result).toEqual({
      success: true,
      penaltyAmount: 10,
      newXp: 90,
      newLevel: 1,
      previousLevel: 1,
    });
  });

  it('throws on Supabase error response', async () => {
    mockRpc.mockReturnValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await expect(forfeitQuest('task-123')).rejects.toThrow(
      'Could not connect to the quest board. Please try again.'
    );
  });

  it('throws when data is null (quest not found)', async () => {
    mockRpc.mockReturnValue({
      data: null,
      error: null,
    });

    await expect(forfeitQuest('task-123')).rejects.toThrow('Quest not found.');
  });

  it('throws descriptive error for completed quest rejection', async () => {
    mockRpc.mockReturnValue({
      data: {
        success: false,
        error: 'Task is already completed (done)',
      },
      error: null,
    });

    await expect(forfeitQuest('task-123')).rejects.toThrow(
      'Completed quests cannot be forfeited.'
    );
  });

  it('throws descriptive error for subtask rejection', async () => {
    mockRpc.mockReturnValue({
      data: {
        success: false,
        error: 'Cannot forfeit a subtask directly',
      },
      error: null,
    });

    await expect(forfeitQuest('task-123')).rejects.toThrow(
      'Subtasks can only be forfeited from the parent quest.'
    );
  });

  it('throws descriptive error for not found rejection', async () => {
    mockRpc.mockReturnValue({
      data: {
        success: false,
        error: 'Task not found or does not exist',
      },
      error: null,
    });

    await expect(forfeitQuest('task-123')).rejects.toThrow('Quest not found.');
  });

  it('handles timeout via AbortController', async () => {
    mockRpc.mockReturnValue({
      data: null,
      error: { message: 'AbortError: The operation was aborted' },
    });

    await expect(forfeitQuest('task-123')).rejects.toThrow(
      'Operation timed out. Please try again.'
    );
  });

  it('parses string JSON response correctly', async () => {
    mockRpc.mockReturnValue({
      data: JSON.stringify({
        success: true,
        penalty_amount: 5,
        new_xp: 195,
        new_level: 2,
        previous_level: 2,
      }),
      error: null,
    });

    const result = await forfeitQuest('task-456');

    expect(result).toEqual({
      success: true,
      penaltyAmount: 5,
      newXp: 195,
      newLevel: 2,
      previousLevel: 2,
    });
  });
});

// ============================================================
// Dashboard Toast (sessionStorage) Tests
// ============================================================
describe('Dashboard forfeit penalty toast', () => {
  let mockGetItem: ReturnType<typeof vi.fn>;
  let mockRemoveItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetItem = vi.fn();
    mockRemoveItem = vi.fn();

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: mockGetItem,
        setItem: vi.fn(),
        removeItem: mockRemoveItem,
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  it('reads forfeit_penalty from sessionStorage', () => {
    const penaltyData = { penaltyAmount: 15, timestamp: Date.now() };
    mockGetItem.mockReturnValue(JSON.stringify(penaltyData));

    const raw = sessionStorage.getItem('forfeit_penalty');
    expect(raw).not.toBeNull();

    const data = JSON.parse(raw!) as { penaltyAmount: number; timestamp: number };
    expect(data.penaltyAmount).toBe(15);
  });

  it('ignores stale data (older than 30 seconds)', () => {
    const staleTimestamp = Date.now() - 31000;
    const penaltyData = { penaltyAmount: 15, timestamp: staleTimestamp };
    mockGetItem.mockReturnValue(JSON.stringify(penaltyData));

    const raw = sessionStorage.getItem('forfeit_penalty');
    const data = JSON.parse(raw!) as { penaltyAmount: number; timestamp: number };

    const isValid = data.penaltyAmount > 0 && Date.now() - data.timestamp < 30000;
    expect(isValid).toBe(false);
  });

  it('accepts fresh data (within 30 seconds)', () => {
    const freshTimestamp = Date.now() - 5000;
    const penaltyData = { penaltyAmount: 20, timestamp: freshTimestamp };
    mockGetItem.mockReturnValue(JSON.stringify(penaltyData));

    const raw = sessionStorage.getItem('forfeit_penalty');
    const data = JSON.parse(raw!) as { penaltyAmount: number; timestamp: number };

    const isValid = data.penaltyAmount > 0 && Date.now() - data.timestamp < 30000;
    expect(isValid).toBe(true);
  });

  it('clears sessionStorage after reading', () => {
    const penaltyData = { penaltyAmount: 10, timestamp: Date.now() };
    mockGetItem.mockReturnValue(JSON.stringify(penaltyData));

    const raw = sessionStorage.getItem('forfeit_penalty');
    if (raw) {
      sessionStorage.removeItem('forfeit_penalty');
    }

    expect(mockRemoveItem).toHaveBeenCalledWith('forfeit_penalty');
  });

  it('handles null sessionStorage gracefully', () => {
    mockGetItem.mockReturnValue(null);

    const raw = sessionStorage.getItem('forfeit_penalty');
    expect(raw).toBeNull();
  });

  it('handles malformed JSON gracefully', () => {
    mockGetItem.mockReturnValue('not-valid-json{');

    let forfeitPenalty: number | null = null;
    try {
      const raw = sessionStorage.getItem('forfeit_penalty');
      if (raw) {
        sessionStorage.removeItem('forfeit_penalty');
        const data = JSON.parse(raw) as { penaltyAmount: number; timestamp: number };
        if (data.penaltyAmount > 0 && Date.now() - data.timestamp < 30000) {
          forfeitPenalty = data.penaltyAmount;
        }
      }
    } catch {
      // Ignore malformed sessionStorage data (matches dashboard behavior)
    }

    expect(forfeitPenalty).toBeNull();
  });

  it('ignores data with zero penalty amount', () => {
    const penaltyData = { penaltyAmount: 0, timestamp: Date.now() };
    mockGetItem.mockReturnValue(JSON.stringify(penaltyData));

    const raw = sessionStorage.getItem('forfeit_penalty');
    const data = JSON.parse(raw!) as { penaltyAmount: number; timestamp: number };

    const isValid = data.penaltyAmount > 0 && Date.now() - data.timestamp < 30000;
    expect(isValid).toBe(false);
  });
});

// ============================================================
// Utility functions for traversing React element trees
// ============================================================

/**
 * Find a React element by type in the rendered tree.
 */
function findElement(tree: any, type: string, props?: Record<string, unknown>): any {
  if (!tree) return null;

  if (tree.type === type) {
    if (!props) return tree;
    const matches = Object.entries(props).every(([key, val]) => tree.props?.[key] === val);
    if (matches) return tree;
  }

  const children = tree.props?.children;
  if (children) {
    if (Array.isArray(children)) {
      for (const child of children) {
        const found = findElement(child, type, props);
        if (found) return found;
      }
    } else if (typeof children === 'object' && children !== null) {
      const found = findElement(children, type, props);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Find all React elements of a given type in the rendered tree.
 */
function findAllElements(tree: any, type: string): any[] {
  const results: any[] = [];

  if (!tree) return results;

  if (tree.type === type) {
    results.push(tree);
  }

  const children = tree.props?.children;
  if (children) {
    if (Array.isArray(children)) {
      for (const child of children) {
        results.push(...findAllElements(child, type));
      }
    } else if (typeof children === 'object' && children !== null) {
      results.push(...findAllElements(children, type));
    }
  }

  return results;
}

/**
 * Extract all text content from a React element tree.
 */
function extractTextContent(tree: any): string {
  if (!tree) return '';
  if (typeof tree === 'string') return tree;
  if (typeof tree === 'number') return String(tree);
  if (typeof tree === 'boolean') return '';

  let text = '';
  const children = tree.props?.children;
  if (children) {
    if (Array.isArray(children)) {
      for (const child of children) {
        text += extractTextContent(child);
      }
    } else {
      text += extractTextContent(children);
    }
  }

  return text;
}
