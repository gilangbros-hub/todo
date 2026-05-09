'use client';

import { Task, TaskType, PIC, Priority, Status } from '@/lib/types';
import { formatDeadlineCountdown } from '@/lib/formatting';
import { safeHexColor } from '@/lib/security';

interface QuestCardProps {
  task: Task & { types?: TaskType | null; pics?: PIC | null; subtasks?: Task[] };
  onClick?: () => void;
}

const PRIORITY_BORDER_COLORS: Record<Priority, string> = {
  normal: '#6b7280',
  rare: '#4a9eff',
  epic: '#a78bfa',
  legendary: '#f0c040',
};

const PRIORITY_SHADOW: Record<Priority, string> = {
  normal: '0 0 8px #6b7280',
  rare: '0 0 8px #4a9eff',
  epic: '0 0 8px #a78bfa',
  legendary: '0 0 8px #f0c040',
};

const PRIORITY_SHADOW_HOVER: Record<Priority, string> = {
  normal: '0 0 12px #6b7280',
  rare: '0 0 12px #4a9eff',
  epic: '0 0 12px #a78bfa',
  legendary: '0 0 12px #f0c040',
};

const STATUS_BADGES: Record<Status, string> = {
  todo: '[ TODO ]',
  in_progress: '[ IN PROGRESS ]',
  done: '[ COMPLETE ]',
  overdue: '[ OVERDUE ]',
};

export default function QuestCard({ task, onClick }: QuestCardProps) {
  const isOverdue = task.status === 'overdue';
  const borderColor = isOverdue ? '#ef4444' : PRIORITY_BORDER_COLORS[task.priority];
  const shadow = isOverdue ? '0 0 8px #ef4444' : PRIORITY_SHADOW[task.priority];
  const shadowHover = isOverdue ? '0 0 12px #ef4444' : PRIORITY_SHADOW_HOVER[task.priority];

  const deadlineDisplay = task.deadline
    ? formatDeadlineCountdown(task.deadline, new Date().toISOString())
    : null;

  const subtaskCount = task.subtasks?.length ?? 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="bg-[#1a1a2e] rounded-[2px] p-3 cursor-pointer select-none quest-card"
      style={{
        border: `4px solid ${borderColor}`,
        boxShadow: shadow,
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = shadow;
      }}
    >
      {/* Title */}
      <h3 className="font-pixel text-white text-xs mb-2 leading-relaxed truncate">
        {task.title}
      </h3>

      {/* Status Badge */}
      <div className="mb-2">
        <span className="font-retro text-sm text-gray-300">
          {STATUS_BADGES[task.status]}
        </span>
      </div>

      {/* Type Badge */}
      {task.types && (
        <div className="mb-2">
          {(() => {
            const typeColor = safeHexColor(task.types.color);
            return (
              <span
                className="font-retro text-xs px-2 py-0.5 rounded-[2px] inline-block"
                style={{
                  backgroundColor: typeColor + '22',
                  color: typeColor,
                  border: `1px solid ${typeColor}`,
                }}
              >
                {task.types.icon} {task.types.name}
              </span>
            );
          })()}
        </div>
      )}

      {/* PIC */}
      {task.pics && (
        <div className="mb-2 flex items-center gap-1">
          <span className="font-retro text-xs text-gray-400">
            🧙 {task.pics.name}
          </span>
        </div>
      )}

      {/* Bottom row: deadline, subtasks, XP */}
      <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
        {/* Deadline countdown */}
        {deadlineDisplay && (
          <span
            className={`font-retro text-xs ${
              deadlineDisplay === 'OVERDUE' ? 'text-red-400' : 'text-yellow-300'
            }`}
          >
            ⏳ {deadlineDisplay}
          </span>
        )}

        {/* Subtask count */}
        {subtaskCount > 0 && (
          <span className="font-retro text-xs text-gray-400">
            📋 {subtaskCount}
          </span>
        )}

        {/* XP reward */}
        <span className="font-retro text-xs text-yellow-400">
          ✨ {task.xp_reward} XP
        </span>
      </div>

      {/* Overdue skull icon */}
      {isOverdue && (
        <div className="mt-2 text-center">
          <span className="text-sm" role="img" aria-label="overdue">
            💀
          </span>
        </div>
      )}
    </div>
  );
}
