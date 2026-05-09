'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { checkNestingDepth } from '@/lib/validation';
import { calculateSubtaskProgress } from '@/lib/progress';

interface SubtaskTreeProps {
  subtasks: Task[];
  branchType: 'sequential' | 'parallel' | null;
  onAdd: (title: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onBranchTypeChange: (type: 'sequential' | 'parallel') => void;
  depth?: number;
  allTasks?: Task[];
}

export default function SubtaskTree({
  subtasks,
  branchType,
  onAdd,
  onComplete,
  onBranchTypeChange,
  depth = 0,
  allTasks = [],
}: SubtaskTreeProps) {
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const progress = calculateSubtaskProgress(subtasks);
  const canAddSubtask = depth < 3;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = newTitle.trim();
    if (trimmed.length < 3) {
      setError('Subtask title must be at least 3 characters');
      return;
    }

    if (!canAddSubtask) {
      setError('Maximum nesting depth of 3 levels reached');
      return;
    }

    setIsAdding(true);
    try {
      await onAdd(trimmed);
      setNewTitle('');
    } catch {
      setError('Failed to add subtask');
    } finally {
      setIsAdding(false);
    }
  };

  const getChildSubtasks = (parentId: string): Task[] => {
    return allTasks.filter((t) => t.parent_task_id === parentId);
  };

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="font-pixel text-[10px] text-gray-400">
            SUBTASK PROGRESS
          </span>
          <span className="font-pixel text-[10px] text-gray-400">
            {progress}%
          </span>
        </div>
        <div
          className="w-full h-3 bg-rpg-dark pixel-border overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Subtask progress: ${progress}%`}
        >
          <div
            className="h-full transition-all duration-300 ease-in-out"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? '#4ade80' : '#f0c040',
            }}
          />
        </div>
      </div>

      {/* Branch Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onBranchTypeChange('sequential')}
          className={`px-3 py-1 font-pixel text-[10px] pixel-border transition-colors ${
            branchType === 'sequential'
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-rpg-dark text-gray-400 hover:text-white'
          }`}
        >
          ⟶ SEQUENTIAL
        </button>
        <button
          type="button"
          onClick={() => onBranchTypeChange('parallel')}
          className={`px-3 py-1 font-pixel text-[10px] pixel-border transition-colors ${
            branchType === 'parallel'
              ? 'bg-purple-600 text-white border-purple-400'
              : 'bg-rpg-dark text-gray-400 hover:text-white'
          }`}
        >
          ⫘ PARALLEL
        </button>
      </div>

      {/* Subtask List */}
      <div className="space-y-0">
        {subtasks.map((subtask, index) => {
          const childSubtasks = getChildSubtasks(subtask.id);
          const nestingResult =
            allTasks.length > 0
              ? checkNestingDepth(subtask.id, allTasks)
              : { allowed: depth + 1 < 3, currentDepth: depth + 1 };

          return (
            <div key={subtask.id} className="relative">
              {/* Pixel-art connecting line */}
              <div className="flex items-stretch">
                {depth > 0 && (
                  <div
                    className="flex-shrink-0 w-4 relative"
                    aria-hidden="true"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-1/2 border-l-2 border-b-2 border-gray-600 w-full"
                      style={{ borderStyle: 'dashed' }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Subtask Item */}
                  <div className="flex items-center gap-2 py-1.5 px-2 group">
                    {/* Connector dot */}
                    <div className="flex-shrink-0 w-2 h-2 bg-gray-600 border border-gray-500" />

                    {/* Order indicator */}
                    {branchType === 'sequential' ? (
                      <span className="font-pixel text-[10px] text-yellow-400 flex-shrink-0 w-5">
                        {index + 1}.
                      </span>
                    ) : (
                      <span className="font-pixel text-[10px] text-purple-400 flex-shrink-0 w-5">
                        ◆
                      </span>
                    )}

                    {/* Completion button */}
                    <button
                      type="button"
                      onClick={() => onComplete(subtask.id)}
                      disabled={subtask.status === 'done'}
                      className={`flex-shrink-0 w-4 h-4 pixel-border flex items-center justify-center text-[8px] transition-colors ${
                        subtask.status === 'done'
                          ? 'bg-green-700 border-green-500 text-green-200 cursor-default'
                          : 'bg-rpg-dark hover:bg-green-900 hover:border-green-600 cursor-pointer'
                      }`}
                      aria-label={
                        subtask.status === 'done'
                          ? `${subtask.title} - completed`
                          : `Complete ${subtask.title}`
                      }
                    >
                      {subtask.status === 'done' ? '✓' : ''}
                    </button>

                    {/* Title */}
                    <span
                      className={`font-retro text-sm truncate ${
                        subtask.status === 'done'
                          ? 'text-gray-500 line-through'
                          : 'text-gray-200'
                      }`}
                    >
                      {subtask.title}
                    </span>

                    {/* XP badge */}
                    <span className="font-pixel text-[8px] text-yellow-500 flex-shrink-0 ml-auto">
                      +{subtask.xp_reward}XP
                    </span>
                  </div>

                  {/* Recursive children */}
                  {childSubtasks.length > 0 && (
                    <div className="ml-4 border-l-2 border-dashed border-gray-700 pl-2">
                      <SubtaskTree
                        subtasks={childSubtasks}
                        branchType={subtask.branch_type}
                        onAdd={onAdd}
                        onComplete={onComplete}
                        onBranchTypeChange={onBranchTypeChange}
                        depth={depth + 1}
                        allTasks={allTasks}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subtask Form */}
      {canAddSubtask ? (
        <form onSubmit={handleAdd} className="flex gap-2 items-start mt-2">
          <div className="flex-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                setError(null);
              }}
              placeholder="New subtask title..."
              className="w-full px-3 py-1.5 bg-rpg-dark pixel-border font-retro text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
              aria-label="New subtask title"
              minLength={3}
            />
            {error && (
              <p className="font-pixel text-[9px] text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="px-3 py-1.5 font-pixel text-[10px] bg-green-800 text-green-200 pixel-border hover:bg-green-700 hover:border-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? '...' : '+ ADD'}
          </button>
        </form>
      ) : (
        <p className="font-pixel text-[9px] text-red-400 mt-2">
          ⚠ Maximum nesting depth of 3 levels reached. Cannot add more subtasks.
        </p>
      )}
    </div>
  );
}
