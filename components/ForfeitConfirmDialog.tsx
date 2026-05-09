'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ForfeitConfirmDialogProps {
  isOpen: boolean;
  taskTitle: string;
  penaltyAmount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Truncates a string to 50 characters with ellipsis if longer.
 */
export function truncateTitle(title: string): string {
  if (title.length > 50) {
    return title.slice(0, 50) + '\u2026';
  }
  return title;
}

export default function ForfeitConfirmDialog({
  isOpen,
  taskTitle,
  penaltyAmount,
  onConfirm,
  onCancel,
}: ForfeitConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element and focus the dialog when opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the cancel button by default (safer action)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);
    } else {
      // Restore focus when dialog closes
      previousFocusRef.current?.focus();
      // Reset state when dialog closes
      setIsProcessing(false);
      setError(null);
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || isProcessing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    // Start 15-second timeout
    timeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
      setError('Operation timed out. Please try again.');
    }, 15000);

    try {
      await onConfirm();
      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (err) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : 'Could not forfeit quest. Please try again.');
    }
  }, [onConfirm]);

  if (!isOpen) return null;

  const displayTitle = truncateTitle(taskTitle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={!isProcessing ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="forfeit-dialog-title"
        aria-describedby="forfeit-dialog-description"
        className="relative w-full max-w-md mx-4 bg-rpg-card pixel-border p-6"
      >
        {/* Title */}
        <h2
          id="forfeit-dialog-title"
          className="font-pixel text-sm text-red-400 mb-4"
        >
          Forfeit Quest
        </h2>

        {/* Description */}
        <div id="forfeit-dialog-description" className="space-y-3 mb-6">
          <p className="font-retro text-base text-white">
            Are you sure you want to forfeit{' '}
            <span className="text-rpg-legendary">&quot;{displayTitle}&quot;</span>?
          </p>
          <p className="font-retro text-sm text-gray-400">
            This action is permanent. All subtasks and battle log entries will be deleted.
          </p>
          <p className="font-pixel text-sm text-red-400">
            -{penaltyAmount} XP
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="pixel-border border-red-500 p-3 mb-4">
            <p className="font-retro text-sm text-red-400">⚠ {error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 font-retro text-sm text-gray-300 hover:text-white pixel-border hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-4 py-2 font-retro text-sm text-red-400 bg-red-900/30 pixel-border border-red-500 hover:bg-red-900/50 hover:shadow-overdue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              'Confirm Forfeit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
