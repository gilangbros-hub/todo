'use client';

import { SortBy, SortOrder } from '@/lib/filters';

interface SortControlProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Created' },
];

export default function SortControl({ sortBy, sortOrder, onChange }: SortControlProps) {
  const handleSortByChange = (value: string) => {
    onChange(value as SortBy, sortOrder);
  };

  const handleSortOrderChange = (value: string) => {
    onChange(sortBy, value as SortOrder);
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-rpg-rare">Sort:</label>

      {/* Sort Key */}
      <select
        value={sortBy}
        onChange={(e) => handleSortByChange(e.target.value)}
        className="bg-rpg-card text-white font-retro text-sm px-3 py-1.5 pixel-border focus:outline-none focus:shadow-rare appearance-none cursor-pointer"
        aria-label="Sort by"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Sort Order */}
      <select
        value={sortOrder}
        onChange={(e) => handleSortOrderChange(e.target.value)}
        className="bg-rpg-card text-white font-retro text-sm px-3 py-1.5 pixel-border focus:outline-none focus:shadow-rare appearance-none cursor-pointer"
        aria-label="Sort order"
      >
        <option value="asc">↑ Asc</option>
        <option value="desc">↓ Desc</option>
      </select>
    </div>
  );
}
