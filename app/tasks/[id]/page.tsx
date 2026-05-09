'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Task, BranchType } from '@/lib/types';
import { getTaskById, completeTask, createSubtask, updateTask } from '@/lib/services/tasks';
import { awardXp, AwardXpResult } from '@/lib/services/player-stats';
import { calculateXpReward } from '@/lib/xp';
import SubtaskTree from '@/components/SubtaskTree';
import XpToast from '@/components/XpToast';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import { safeHexColor, isUuid } from '@/lib/security';

// Priority color mapping
const PRIORITY_COLORS: Record<string, string> = {
  normal: '#6b7280',
  rare: '#4a9eff',
  epic: '#a78bfa',
  legendary: '#f0c040',
};

const PRIORITY_GLOW: Record<string, string> = {
  normal: 'glow-normal',
  rare: 'glow-rare',
  epic: 'glow-epic',
  legendary: 'glow-legendary',
};

const STATUS_BADGES: Record<string, string> = {
  todo: '[ TODO ]',
  in_progress: '[ IN PROGRESS ]',
  done: '[ COMPLETE ]',
  overdue: '[ OVERDUE ]',
};

export default function TaskDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [task, setTask] = useState<(Task & { subtasks?: Task[]; types?: any; pics?: any }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // XP Toast state
  const [xpToastAmount, setXpToastAmount] = useState<number | null>(null);

  // Level-up overlay state
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  // Fetch task on mount
  const fetchTask = useCallback(async () => {
    // Validate the route param before querying the DB (A03 defense-in-depth).
    if (!isUuid(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getTaskById(id);
      setTask(data as any);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // Handle task completion
  const handleComplete = async () => {
    if (!task || task.status === 'done' || isCompleting) return;

    setIsCompleting(true);
    try {
      // 1. Complete the task
      await completeTask(id);

      // 2. Calculate XP reward
      const completedAt = new Date().toISOString();
      const isSubtask = task.parent_task_id !== null;
      const xpAmount = calculateXpReward(task.priority, task.deadline, completedAt, isSubtask);

      // 3. Award XP
      const result: AwardXpResult = await awardXp(xpAmount);

      // 4. Show XP toast
      setXpToastAmount(xpAmount);

      // 5. If leveled up, show overlay
      if (result.leveledUp) {
        setLevelUpLevel(result.stats.level);
      }

      // 6. Card flip animation
      setIsFlipped(true);

      // Update local task state
      setTask((prev) =>
        prev ? { ...prev, status: 'done', completed_at: completedAt } : prev
      );
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle subtask completion
  const handleSubtaskComplete = async (subtaskId: string) => {
    try {
      await completeTask(subtaskId);

      // Find the subtask to calculate XP
      const subtask = task?.subtasks?.find((s) => s.id === subtaskId);
      if (subtask && subtask.status !== 'done') {
        const completedAt = new Date().toISOString();
        const xpAmount = calculateXpReward(subtask.priority, subtask.deadline, completedAt, true);
        const result = await awardXp(xpAmount);

        setXpToastAmount(xpAmount);

        if (result.leveledUp) {
          setLevelUpLevel(result.stats.level);
        }
      }

      // Re-fetch task to update subtask list
      await fetchTask();
    } catch (error) {
      console.error('Failed to complete subtask:', error);
    }
  };

  // Handle adding a subtask
  const handleAddSubtask = async (title: string) => {
    if (!task) return;
    await createSubtask(id, { title, priority: task.priority });
    await fetchTask();
  };

  // Handle branch type change
  const handleBranchTypeChange = async (type: BranchType) => {
    if (!task) return;
    await updateTask(id, { branch_type: type });
    setTask((prev) => (prev ? { ...prev, branch_type: type } : prev));
  };

  // Loading state
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-pixel text-sm text-gray-400 animate-pulse">
          Loading quest...
        </p>
      </main>
    );
  }

  // Not found state
  if (notFound || !task) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-pixel text-sm text-red-400">
            ⚠ Quest not found
          </p>
          <p className="font-retro text-gray-400">
            The quest you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 font-pixel text-[10px] bg-rpg-card pixel-border text-yellow-400 hover:bg-rpg-dark hover:border-yellow-500 transition-colors"
          >
            ← BACK TO QUEST BOARD
          </Link>
        </div>
      </main>
    );
  }

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
  const priorityGlow = PRIORITY_GLOW[task.priority] || PRIORITY_GLOW.normal;
  const statusBadge = STATUS_BADGES[task.status] || '[ UNKNOWN ]';
  const isDone = task.status === 'done';

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/"
        className="inline-block mb-6 font-pixel text-[10px] text-gray-400 hover:text-yellow-400 transition-colors"
      >
        ← BACK TO QUEST BOARD
      </Link>

      {/* Task Card with flip animation */}
      <div
        className={`relative transition-transform duration-500 ${
          isFlipped ? 'animate-card-flip' : ''
        }`}
        style={{ perspective: '1000px' }}
      >
        <div
          className={`rpg-card p-6 space-y-6 ${priorityGlow}`}
          style={{
            borderColor: priorityColor,
            boxShadow: `0 0 10px ${priorityColor}40`,
          }}
        >
          {/* Completion stamp overlay */}
          {isDone && (
            <div className="absolute top-4 right-4 rotate-[-15deg] pointer-events-none">
              <span
                className="font-pixel text-lg text-green-400 border-2 border-green-400 px-3 py-1 opacity-80"
                style={{ textShadow: '1px 1px 0px #000' }}
              >
                COMPLETE
              </span>
            </div>
          )}

          {/* Header: Title + Status */}
          <div className="space-y-2">
            <h1
              className="font-pixel text-sm md:text-base text-white"
              style={{ textShadow: '2px 2px 0px #000' }}
            >
              {task.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="font-pixel text-[10px]"
                style={{ color: isDone ? '#4ade80' : task.status === 'overdue' ? '#ef4444' : '#f0c040' }}
              >
                {statusBadge}
              </span>
              <span
                className="font-pixel text-[10px]"
                style={{ color: priorityColor }}
              >
                ★ {task.priority.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-1">
              <h2 className="font-pixel text-[10px] text-gray-400">DESCRIPTION</h2>
              <p className="font-retro text-sm text-gray-200 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-1">
              <h3 className="font-pixel text-[10px] text-gray-400">GUILD (TYPE)</h3>
              <p className="font-retro text-sm text-gray-200">
                {task.types ? (
                  <span style={{ color: safeHexColor(task.types.color) }}>
                    {task.types.icon} {task.types.name}
                  </span>
                ) : (
                  <span className="text-gray-500">Unassigned</span>
                )}
              </p>
            </div>

            {/* PIC */}
            <div className="space-y-1">
              <h3 className="font-pixel text-[10px] text-gray-400">PARTY MEMBER (PIC)</h3>
              <p className="font-retro text-sm text-gray-200">
                {task.pics ? (
                  <span>
                    {task.pics.avatar} {task.pics.name}
                    <span className="text-gray-400 ml-1">({task.pics.rpg_class})</span>
                  </span>
                ) : (
                  <span className="text-gray-500">Unassigned</span>
                )}
              </p>
            </div>

            {/* Deadline */}
            <div className="space-y-1">
              <h3 className="font-pixel text-[10px] text-gray-400">DEADLINE</h3>
              <p className="font-retro text-sm text-gray-200">
                {task.deadline ? (
                  new Date(task.deadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                ) : (
                  <span className="text-gray-500">No deadline</span>
                )}
              </p>
            </div>

            {/* XP Reward */}
            <div className="space-y-1">
              <h3 className="font-pixel text-[10px] text-gray-400">XP REWARD</h3>
              <p className="font-pixel text-sm" style={{ color: '#f0c040' }}>
                +{task.xp_reward} XP
              </p>
            </div>
          </div>

          {/* Complete Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isDone || isCompleting}
              className={`w-full py-3 font-pixel text-[11px] pixel-border transition-all duration-200 ${
                isDone
                  ? 'bg-gray-800 text-gray-500 border-gray-600 cursor-not-allowed'
                  : isCompleting
                  ? 'bg-yellow-900 text-yellow-200 border-yellow-600 cursor-wait opacity-70'
                  : 'bg-green-800 text-green-200 border-green-500 hover:bg-green-700 hover:border-green-400 hover:shadow-lg'
              }`}
            >
              {isDone ? '✓ QUEST COMPLETE' : isCompleting ? 'COMPLETING...' : '⚔ MARK QUEST AS DONE'}
            </button>
          </div>
        </div>
      </div>

      {/* Subtask Tree Section */}
      <div className="mt-8 rpg-card p-6">
        <h2
          className="font-pixel text-[11px] text-white mb-4"
          style={{ textShadow: '2px 2px 0px #000' }}
        >
          SUBTASK TREE
        </h2>
        <SubtaskTree
          subtasks={task.subtasks || []}
          branchType={task.branch_type}
          onAdd={handleAddSubtask}
          onComplete={handleSubtaskComplete}
          onBranchTypeChange={handleBranchTypeChange}
          allTasks={task.subtasks || []}
        />
      </div>

      {/* XP Toast */}
      {xpToastAmount !== null && (
        <XpToast
          amount={xpToastAmount}
          onDismiss={() => setXpToastAmount(null)}
        />
      )}

      {/* Level Up Overlay */}
      {levelUpLevel !== null && (
        <LevelUpOverlay
          newLevel={levelUpLevel}
          onDismiss={() => setLevelUpLevel(null)}
        />
      )}

      {/* Card flip animation style */}
      <style jsx>{`
        @keyframes card-flip {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(90deg);
          }
          100% {
            transform: rotateY(0deg);
          }
        }
        .animate-card-flip {
          animation: card-flip 0.6s ease-in-out;
        }
      `}</style>
    </main>
  );
}
