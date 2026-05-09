'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { TaskType, PlayerStats } from '@/lib/types';
import { getTypes, createType, updateType, deleteType } from '@/lib/services/types';
import { getPlayerStats } from '@/lib/services/player-stats';
import { subscribeToTypes, RealtimeEvent } from '@/lib/services/realtime';
import { validateName } from '@/lib/validation';
import { safeHexColor, validateHexColor } from '@/lib/security';

// --- Hex color validation ---
function isValidHexColor(value: string): boolean {
  return validateHexColor(value).valid;
}

export default function MasterTypesPage() {
  const [types, setTypes] = useState<TaskType[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: '',
    xp: 0,
    level: 1,
    streak: 0,
    last_completed_date: null,
  });
  const [loading, setLoading] = useState(true);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchTypes = useCallback(async () => {
    const result = await getTypes();
    if (!result.error) {
      setTypes(result.data);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [typesResult, stats] = await Promise.all([
        getTypes(),
        getPlayerStats(),
      ]);
      if (!typesResult.error) {
        setTypes(typesResult.data);
      }
      setPlayerStats(stats);
      setLoading(false);
    }
    init();
  }, []);

  // --- Real-time Subscription ---
  useEffect(() => {
    const unsubscribe = subscribeToTypes(
      (event: RealtimeEvent, payload: TaskType) => {
        switch (event) {
          case 'INSERT':
            setTypes((prev) => [...prev, payload]);
            break;
          case 'UPDATE':
            setTypes((prev) =>
              prev.map((t) => (t.id === payload.id ? payload : t))
            );
            break;
          case 'DELETE':
            setTypes((prev) => prev.filter((t) => t.id !== payload.id));
            break;
        }
      },
      fetchTypes
    );

    return () => unsubscribe();
  }, [fetchTypes]);

  // --- Create Handler ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    const nameValidation = validateName(newName);
    if (!nameValidation.valid) {
      setCreateError(nameValidation.error || 'Invalid name');
      return;
    }

    if (!newIcon.trim()) {
      setCreateError('Icon is required');
      return;
    }

    if (!isValidHexColor(newColor)) {
      setCreateError('Color must be a valid hex value (e.g. #ff0000)');
      return;
    }

    setCreating(true);
    const result = await createType({
      name: newName.trim(),
      icon: newIcon.trim(),
      color: newColor,
    });

    if (result.error) {
      setCreateError(result.error);
    } else {
      setNewName('');
      setNewIcon('');
      setNewColor('#6b7280');
    }
    setCreating(false);
  }

  // --- Edit Handlers ---
  function startEdit(type: TaskType) {
    setEditingId(type.id);
    setEditName(type.name);
    setEditIcon(type.icon);
    setEditColor(type.color);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setEditError(null);

    const nameValidation = validateName(editName);
    if (!nameValidation.valid) {
      setEditError(nameValidation.error || 'Invalid name');
      return;
    }

    if (!editIcon.trim()) {
      setEditError('Icon is required');
      return;
    }

    if (!isValidHexColor(editColor)) {
      setEditError('Color must be a valid hex value (e.g. #ff0000)');
      return;
    }

    setSaving(true);
    const result = await updateType(editingId, {
      name: editName.trim(),
      icon: editIcon.trim(),
      color: editColor,
    });

    if (result.error) {
      setEditError(result.error);
    } else {
      setEditingId(null);
    }
    setSaving(false);
  }

  // --- Delete Handler ---
  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);

    const result = await deleteType(id);
    if (!result.success) {
      setDeleteError(result.error);
    }
    setDeletingId(null);
  }

  // --- Render ---
  return (
    <div className="flex min-h-screen">
      <Sidebar playerStats={playerStats} activeRoute="/master/types" />

      <main className="flex-1 p-8">
        <h1 className="font-pixel text-rpg-legendary text-lg mb-8" style={{ textShadow: '0 0 8px #f0c040' }}>
          ⚔️ Guild Management
        </h1>

        {/* Create Form */}
        <form
          onSubmit={handleCreate}
          className="rpg-card p-4 mb-8 flex flex-col gap-4"
        >
          <h2 className="font-pixel text-[10px] text-rpg-rare uppercase tracking-wider">
            Create New Guild
          </h2>

          <div className="flex flex-wrap gap-4 items-end">
            {/* Icon Input */}
            <div className="flex flex-col gap-1">
              <label className="font-pixel text-[8px] text-gray-400 uppercase">
                Icon
              </label>
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="⚔️"
                className="w-16 h-10 bg-rpg-dark pixel-border text-center text-xl text-white font-retro focus:outline-none focus:border-rpg-rare"
                maxLength={10}
              />
            </div>

            {/* Name Input */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="font-pixel text-[8px] text-gray-400 uppercase">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Guild name..."
                className="h-10 bg-rpg-dark pixel-border px-3 text-white font-retro text-lg focus:outline-none focus:border-rpg-rare"
                maxLength={50}
              />
            </div>

            {/* Color Input */}
            <div className="flex flex-col gap-1">
              <label className="font-pixel text-[8px] text-gray-400 uppercase">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-10 h-10 bg-rpg-dark pixel-border cursor-pointer"
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="#6b7280"
                  className="w-24 h-10 bg-rpg-dark pixel-border px-2 text-white font-retro text-sm focus:outline-none focus:border-rpg-rare"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={creating}
              className="h-10 px-4 bg-rpg-dark pixel-border font-pixel text-[10px] text-rpg-rare uppercase tracking-wider hover:bg-rpg-card hover:border-rpg-rare transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : '+ Add Guild'}
            </button>
          </div>

          {createError && (
            <p className="font-retro text-sm text-red-400">⚠️ {createError}</p>
          )}
        </form>

        {/* Types List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="font-retro text-lg text-gray-400 animate-pulse">Loading guilds...</p>
          </div>
        ) : types.length === 0 ? (
          <div className="rpg-card p-8 flex flex-col items-center justify-center gap-4">
            <span className="text-4xl">🏰</span>
            <p className="font-retro text-lg text-gray-400">No guilds created yet</p>
            <p className="font-retro text-sm text-gray-500">Create your first guild above to categorize quests</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="rpg-card p-4 flex items-center gap-4 transition-all duration-100 hover:border-rpg-border"
                style={{ borderColor: editingId === type.id ? safeHexColor(type.color) : undefined }}
              >
                {editingId === type.id ? (
                  /* Edit Mode */
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-4 items-end">
                      {/* Edit Icon */}
                      <div className="flex flex-col gap-1">
                        <label className="font-pixel text-[8px] text-gray-400 uppercase">
                          Icon
                        </label>
                        <input
                          type="text"
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="w-16 h-10 bg-rpg-dark pixel-border text-center text-xl text-white font-retro focus:outline-none focus:border-rpg-rare"
                          maxLength={10}
                        />
                      </div>

                      {/* Edit Name */}
                      <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                        <label className="font-pixel text-[8px] text-gray-400 uppercase">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-10 bg-rpg-dark pixel-border px-3 text-white font-retro text-lg focus:outline-none focus:border-rpg-rare"
                          maxLength={50}
                        />
                      </div>

                      {/* Edit Color */}
                      <div className="flex flex-col gap-1">
                        <label className="font-pixel text-[8px] text-gray-400 uppercase">
                          Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-10 h-10 bg-rpg-dark pixel-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-24 h-10 bg-rpg-dark pixel-border px-2 text-white font-retro text-sm focus:outline-none focus:border-rpg-rare"
                            maxLength={7}
                          />
                        </div>
                      </div>

                      {/* Save / Cancel */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="h-10 px-3 bg-rpg-dark pixel-border font-pixel text-[9px] text-green-400 uppercase hover:border-green-400 transition-all duration-100 disabled:opacity-50"
                        >
                          {saving ? '...' : '✓ Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="h-10 px-3 bg-rpg-dark pixel-border font-pixel text-[9px] text-gray-400 uppercase hover:border-gray-400 transition-all duration-100"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>

                    {editError && (
                      <p className="font-retro text-sm text-red-400">⚠️ {editError}</p>
                    )}
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    {/* Icon */}
                    <span className="text-2xl w-10 text-center" style={{ imageRendering: 'pixelated' }}>
                      {type.icon}
                    </span>

                    {/* Name */}
                    <span className="font-retro text-lg text-white flex-1">
                      {type.name}
                    </span>

                    {/* Color Swatch */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 pixel-border"
                        style={{ backgroundColor: safeHexColor(type.color), borderColor: safeHexColor(type.color) }}
                      />
                      <span className="font-retro text-sm text-gray-400">
                        {type.color}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(type)}
                        className="px-3 py-1 bg-rpg-dark pixel-border font-pixel text-[8px] text-rpg-rare uppercase hover:border-rpg-rare transition-all duration-100"
                        aria-label={`Edit ${type.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        disabled={deletingId === type.id}
                        className="px-3 py-1 bg-rpg-dark pixel-border font-pixel text-[8px] text-red-400 uppercase hover:border-red-400 transition-all duration-100 disabled:opacity-50"
                        aria-label={`Delete ${type.name}`}
                      >
                        {deletingId === type.id ? '...' : 'Del'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Error Toast */}
        {deleteError && (
          <div className="fixed bottom-6 right-6 rpg-card p-4 border-red-400 max-w-sm animate-bounce">
            <div className="flex items-start gap-3">
              <span className="text-xl">💀</span>
              <div className="flex-1">
                <p className="font-pixel text-[9px] text-red-400 uppercase mb-1">Cannot Delete</p>
                <p className="font-retro text-sm text-gray-300">{deleteError}</p>
              </div>
              <button
                onClick={() => setDeleteError(null)}
                className="font-pixel text-[10px] text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
