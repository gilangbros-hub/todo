'use client';

interface ViewToggleProps {
  activeView: 'kanban' | 'folder';
  onChange: (view: 'kanban' | 'folder') => void;
}

export default function ViewToggle({ activeView, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-rpg-card border border-rpg-border rounded-pixel">
      <button
        type="button"
        onClick={() => onChange('kanban')}
        className={`px-3 py-1.5 font-pixel text-[10px] rounded-pixel transition-colors duration-100 ${
          activeView === 'kanban'
            ? 'bg-rpg-rare text-white'
            : 'text-gray-400 hover:text-white hover:bg-rpg-border'
        }`}
        aria-pressed={activeView === 'kanban'}
      >
        ⚔ Board
      </button>
      <button
        type="button"
        onClick={() => onChange('folder')}
        className={`px-3 py-1.5 font-pixel text-[10px] rounded-pixel transition-colors duration-100 ${
          activeView === 'folder'
            ? 'bg-rpg-rare text-white'
            : 'text-gray-400 hover:text-white hover:bg-rpg-border'
        }`}
        aria-pressed={activeView === 'folder'}
      >
        📁 Guilds
      </button>
    </div>
  );
}
