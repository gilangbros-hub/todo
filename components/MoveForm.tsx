'use client';

import { useState } from 'react';
import { MoveType, MOVE_TYPES, MOVE_TYPE_CONFIG } from '@/lib/types';
import { validateMoveNote } from '@/lib/validation';

interface MoveFormProps {
  onSubmit: (moveType: MoveType, note: string) => Promise<void>;
  disabled: boolean;
}

export default function MoveForm({ onSubmit, disabled }: MoveFormProps) {
  const [selectedType, setSelectedType] = useState<MoveType>('attack');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNoteChange = (value: string) => {
    setNote(value);
    // Clear error when user starts typing
    if (error) {
      const validation = validateMoveNote(value);
      if (validation.valid) {
        setError(null);
      }
    }
  };

  const handleSubmit = async () => {
    const validation = validateMoveNote(note);
    if (!validation.valid) {
      setError(validation.error || 'Invalid note');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(selectedType, note.trim());
      setNote('');
      setSelectedType('attack');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record move. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <div className="pixel-border p-4 text-center opacity-60">
        <p className="font-pixel text-xs text-gray-400">Quest Complete</p>
        <p className="font-retro text-sm text-gray-500 mt-1">
          No more moves can be recorded.
        </p>
      </div>
    );
  }

  const trimmedLength = note.trim().length;
  const isOverLimit = trimmedLength > 300;

  return (
    <div className="space-y-4">
      {/* Move Type Selector */}
      <div>
        <label className="block text-xs font-pixel text-rpg-rare mb-2">
          Move Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MOVE_TYPES.map((type) => {
            const config = MOVE_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-3 py-2 font-retro text-sm pixel-border transition-all ${
                  selectedType === type
                    ? 'border-rpg-rare text-rpg-rare shadow-rare'
                    : 'border-rpg-border text-gray-400 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-pressed={selectedType === type}
              >
                <span className="text-base">{config.emoji}</span>
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Note Input */}
      <div>
        <label className="block text-xs font-pixel text-rpg-rare mb-2">
          Battle Note
        </label>
        <textarea
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Describe your move..."
          rows={3}
          maxLength={350}
          disabled={isSubmitting}
          className={`w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : ''
          }`}
          aria-label="Move note"
          aria-invalid={!!error}
        />
        <div className="flex items-center justify-between mt-1">
          {error && (
            <p className="text-xs font-retro text-red-400">{error}</p>
          )}
          {!error && <span />}
          <p className={`text-xs font-retro ${isOverLimit ? 'text-red-400' : 'text-gray-500'}`}>
            {trimmedLength}/300
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full px-4 py-2 font-retro text-sm bg-rpg-rare text-white pixel-border border-rpg-rare hover:shadow-rare transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Recording...' : '⚔ Record Move'}
      </button>
    </div>
  );
}
