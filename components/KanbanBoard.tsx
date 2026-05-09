'use client';

import { Task, Status } from '@/lib/types';
import { groupByStatus } from '@/lib/grouping';
import QuestCard from './QuestCard';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (id: string) => void;
}

const COLUMN_CONFIG: { status: Status; label: string; color: string }[] = [
  { status: 'todo', label: 'TODO', color: 'text-rpg-normal' },
  { status: 'in_progress', label: 'IN PROGRESS', color: 'text-rpg-rare' },
  { status: 'done', label: 'DONE', color: 'text-green-400' },
  { status: 'overdue', label: 'OVERDUE', color: 'text-red-400' },
];

export default function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const grouped = groupByStatus(tasks);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMN_CONFIG.map(({ status, label, color }) => (
        <div key={status} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2 py-1">
            <h3 className={`font-pixel text-xs ${color}`}>[ {label} ]</h3>
            <span className="text-xs text-gray-500 font-retro">
              ({grouped[status].length})
            </span>
          </div>
          <div className="flex flex-col gap-3 min-h-[200px] p-2 border border-rpg-border rounded-pixel bg-rpg-dark/50 transition-all duration-300">
            {grouped[status].length === 0 ? (
              <p className="text-gray-600 text-sm font-retro text-center py-8">
                No quests
              </p>
            ) : (
              grouped[status].map((task) => (
                <div key={task.id} className="transition-all duration-300">
                  <QuestCard
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
