'use client';

import { TaskFilters } from '@/lib/filters';
import { TaskType, PIC, STATUSES, PRIORITIES, Status, Priority } from '@/lib/types';

interface FilterBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  types: TaskType[];
  pics: PIC[];
}

export default function FilterBar({ filters, onChange, types, pics }: FilterBarProps) {
  const handleStatusChange = (value: string) => {
    onChange({
      ...filters,
      status: value === '' ? undefined : (value as Status),
    });
  };

  const handlePriorityChange = (value: string) => {
    onChange({
      ...filters,
      priority: value === '' ? undefined : (value as Priority),
    });
  };

  const handleTypeChange = (value: string) => {
    onChange({
      ...filters,
      type_id: value === '' ? undefined : value,
    });
  };

  const handlePicChange = (value: string) => {
    onChange({
      ...filters,
      pic_id: value === '' ? undefined : value,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-xs text-rpg-rare">Filters:</label>

      {/* Status Filter */}
      <select
        value={filters.status ?? ''}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="bg-rpg-card text-white font-retro text-sm px-3 py-1.5 pixel-border focus:outline-none focus:shadow-rare appearance-none cursor-pointer"
        aria-label="Filter by status"
      >
        <option value="">All Status</option>
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace('_', ' ').toUpperCase()}
          </option>
        ))}
      </select>

      {/* Priority Filter */}
      <select
        value={filters.priority ?? ''}
        onChange={(e) => handlePriorityChange(e.target.value)}
        className="bg-rpg-card text-white font-retro text-sm px-3 py-1.5 pixel-border focus:outline-none focus:shadow-rare appearance-none cursor-pointer"
        aria-label="Filter by priority"
      >
        <option value="">All Priority</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </option>
        ))}
      </select>

      {/* Type Filter */}
      <select
        value={filters.type_id ?? ''}
        onChange={(e) => handleTypeChange(e.target.value)}
        className="bg-rpg-card text-white font-retro text-sm px-3 py-1.5 pixel-border focus:outline-none focus:shadow-rare appearance-none cursor-pointer"
        aria-label="Filter by type"
      >
        <option value="">All Types</option>
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {type.icon} {type.name}
          </option>
        ))}
      </select>

      {/* PIC Filter */}
      <select
        value={filters.pic_id ?? ''}
        onChange={(e) => handlePicChange(e.target.value)}
        className="bg-rpg-card text-white font-retro text-sm px-3 py-1.5 pixel-border focus:outline-none focus:shadow-rare appearance-none cursor-pointer"
        aria-label="Filter by PIC"
      >
        <option value="">All PICs</option>
        {pics.map((pic) => (
          <option key={pic.id} value={pic.id}>
            {pic.name}
          </option>
        ))}
      </select>
    </div>
  );
}
