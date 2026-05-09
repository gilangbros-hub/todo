'use client';

import { Task, TaskType } from '@/lib/types';
import { groupByType } from '@/lib/grouping';
import { safeHexColor } from '@/lib/security';
import QuestCard from './QuestCard';

interface FolderViewProps {
  tasks: Task[];
  types: TaskType[];
  onTaskClick: (id: string) => void;
}

export default function FolderView({ tasks, types, onTaskClick }: FolderViewProps) {
  const groups = groupByType(tasks, types);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 font-retro text-lg">No quests to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.type?.id ?? 'unassigned'} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2 py-1 border-b border-rpg-border">
            {group.type ? (
              <>
                <span
                  className="text-lg"
                  style={{ color: safeHexColor(group.type.color) }}
                  aria-hidden="true"
                >
                  {group.type.icon}
                </span>
                <h3
                  className="font-pixel text-xs"
                  style={{ color: safeHexColor(group.type.color) }}
                >
                  {group.name}
                </h3>
              </>
            ) : (
              <h3 className="font-pixel text-xs text-gray-400">
                Unassigned
              </h3>
            )}
            <span className="text-xs text-gray-500 font-retro">
              ({group.tasks.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
            {group.tasks.map((task) => (
              <QuestCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
