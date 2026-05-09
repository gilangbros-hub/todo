'use client';

import { useEffect, useState, useCallback } from 'react';
import { PIC } from '@/lib/types';
import { getPics, createPic, updatePic, deletePic } from '@/lib/services/pics';
import { getPlayerStats } from '@/lib/services/player-stats';
import { subscribeToPics } from '@/lib/services/realtime';
import { validateName } from '@/lib/validation';
import { PlayerStats } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';

const RPG_CLASSES = ['Warrior', 'Mage', 'Rogue', 'Healer', 'Ranger', 'Paladin'] as const;

const AVATAR_OPTIONS = ['⚔️', '🧙', '🗡️', '💚', '🏹', '🛡️', '👤', '🐉', '🦊', '🐺', '🧝', '🧛'] as const;

const CLASS_ICONS: Record<string, string> = {
  Warrior: '⚔️',
  Mage: '🧙',
  Rogue: '🗡️',
  Healer: '💚',
  Ranger: '🏹',
  Paladin: '🛡️',
};

interface PicFormData {
  name: string;
  avatar: string;
  rpg_class: string;
}

const DEFAULT_FORM: PicFormData = {
  name: '',
  avatar: '👤',
  rpg_class: 'Warrior',
};

export default function MasterPicsPage() {
  const [pics, setPics] = useState<PIC[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: '',
    user_id: '',
    xp: 0,
    level: 1,
    streak: 0,
    last_completed_date: null,
  });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PicFormData>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<PicFormData>(DEFAULT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPics = useCallback(async () => {
    const result = await getPics();
    if (!result.error) {
      setPics(result.data);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const [picsResult, stats] = await Promise.all([
        getPics(),
        getPlayerStats(),
      ]);
      if (!picsResult.error) {
        setPics(picsResult.data);
      }
      setPlayerStats(stats);
      setLoading(false);
    }
    init();
  }, []);

  // Real-time subscription for PIC changes
  useEffect(() => {
    const unsubscribe = subscribeToPics((event, record) => {
      switch (event) {
        case 'INSERT':
          setPics((prev) => [record, ...prev]);
          break;
        case 'UPDATE':
          setPics((prev) =>
            prev.map((p) => (p.id === record.id ? record : p))
          );
          break;
        case 'DELETE':
          setPics((prev) => prev.filter((p) => p.id !== record.id));
          break;
      }
    }, fetchPics);

    return () => unsubscribe();
  }, [fetchPics]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateName(formData.name);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid name');
      return;
    }

    if (!formData.avatar) {
      setFormError('Please select an avatar');
      return;
    }

    if (!formData.rpg_class) {
      setFormError('Please select an RPG class');
      return;
    }

    setIsSubmitting(true);
    const result = await createPic({
      name: formData.name.trim(),
      avatar: formData.avatar,
      rpg_class: formData.rpg_class,
    });

    if (result.error) {
      setFormError(result.error);
    } else {
      setFormData(DEFAULT_FORM);
    }
    setIsSubmitting(false);
  };

  const startEdit = (pic: PIC) => {
    setEditingId(pic.id);
    setEditData({
      name: pic.name,
      avatar: pic.avatar,
      rpg_class: pic.rpg_class,
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(DEFAULT_FORM);
    setEditError(null);
  };

  const handleUpdate = async (id: string) => {
    setEditError(null);

    const validation = validateName(editData.name);
    if (!validation.valid) {
      setEditError(validation.error || 'Invalid name');
      return;
    }

    if (!editData.avatar) {
      setEditError('Please select an avatar');
      return;
    }

    if (!editData.rpg_class) {
      setEditError('Please select an RPG class');
      return;
    }

    setIsSubmitting(true);
    const result = await updatePic(id, {
      name: editData.name.trim(),
      avatar: editData.avatar,
      rpg_class: editData.rpg_class,
    });

    if (result.error) {
      setEditError(result.error);
    } else {
      setEditingId(null);
      setEditData(DEFAULT_FORM);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    setIsSubmitting(true);

    const result = await deletePic(id);
    if (!result.success) {
      setDeleteError(result.error);
    }
    setDeleteConfirmId(null);
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen bg-rpg-dark">
      <Sidebar playerStats={playerStats} activeRoute="/master/pics" />

      <main className="flex-1 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1
            className="font-pixel text-lg text-white mb-2"
            style={{ textShadow: '2px 2px 0px #000' }}
          >
            ⚔️ Party Members
          </h1>
          <p className="font-retro text-lg text-gray-400">
            Manage your adventuring party — assign heroes to quests
          </p>
        </div>

        {/* Create PIC Form */}
        <form
          onSubmit={handleCreate}
          className="bg-rpg-card pixel-border p-6 mb-8"
        >
          <h2
            className="font-pixel text-xs text-rpg-rare mb-4"
            style={{ textShadow: '0 0 6px #4a9eff' }}
          >
            + Recruit New Member
          </h2>

          <div className="flex flex-col gap-4">
            {/* Name Input */}
            <div>
              <label
                htmlFor="pic-name"
                className="font-pixel text-[10px] text-gray-400 uppercase tracking-wider block mb-1"
              >
                Name
              </label>
              <input
                id="pic-name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter party member name..."
                maxLength={50}
                className="w-full bg-rpg-dark border-2 border-rpg-border rounded-pixel px-3 py-2 font-retro text-lg text-white placeholder-gray-600 focus:border-rpg-rare focus:outline-none transition-colors"
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="font-pixel text-[10px] text-gray-400 uppercase tracking-wider block mb-2">
                Avatar
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, avatar }))
                    }
                    className={`w-10 h-10 flex items-center justify-center rounded-pixel border-2 text-xl transition-all ${
                      formData.avatar === avatar
                        ? 'border-rpg-rare bg-rpg-dark shadow-rare scale-110'
                        : 'border-rpg-border bg-rpg-dark hover:border-gray-500'
                    }`}
                    style={{ imageRendering: 'pixelated' }}
                    aria-label={`Select avatar ${avatar}`}
                    aria-pressed={formData.avatar === avatar}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            {/* RPG Class Dropdown */}
            <div>
              <label
                htmlFor="pic-class"
                className="font-pixel text-[10px] text-gray-400 uppercase tracking-wider block mb-1"
              >
                RPG Class
              </label>
              <select
                id="pic-class"
                value={formData.rpg_class}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rpg_class: e.target.value }))
                }
                className="w-full bg-rpg-dark border-2 border-rpg-border rounded-pixel px-3 py-2 font-retro text-lg text-white focus:border-rpg-rare focus:outline-none transition-colors"
              >
                {RPG_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {CLASS_ICONS[cls]} {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Form Error */}
            {formError && (
              <p className="font-retro text-sm text-red-400" role="alert">
                ⚠️ {formError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="self-start bg-rpg-dark border-2 border-rpg-epic rounded-pixel px-6 py-2 font-pixel text-[10px] text-rpg-epic hover:bg-rpg-epic hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ textShadow: '0 0 4px #a78bfa' }}
            >
              {isSubmitting ? 'Recruiting...' : 'Recruit Member'}
            </button>
          </div>
        </form>

        {/* PIC List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="font-pixel text-xs text-gray-400 animate-pulse">
              Loading party members...
            </p>
          </div>
        ) : pics.length === 0 ? (
          <EmptyState
            message="No party members recruited yet. Add your first adventurer above!"
            icon="🧙"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pics.map((pic) => (
              <div
                key={pic.id}
                className="bg-rpg-card pixel-border p-4 flex items-center gap-4 hover:border-rpg-border transition-all"
              >
                {editingId === pic.id ? (
                  /* Inline Edit Mode */
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Edit Name */}
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        maxLength={50}
                        className="bg-rpg-dark border-2 border-rpg-border rounded-pixel px-3 py-1 font-retro text-lg text-white focus:border-rpg-rare focus:outline-none flex-1 min-w-[150px]"
                        aria-label="Edit PIC name"
                      />

                      {/* Edit Avatar */}
                      <div className="flex gap-1 flex-wrap">
                        {AVATAR_OPTIONS.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() =>
                              setEditData((prev) => ({ ...prev, avatar }))
                            }
                            className={`w-8 h-8 flex items-center justify-center rounded-pixel border-2 text-sm transition-all ${
                              editData.avatar === avatar
                                ? 'border-rpg-rare bg-rpg-dark shadow-rare'
                                : 'border-rpg-border bg-rpg-dark hover:border-gray-500'
                            }`}
                            aria-label={`Select avatar ${avatar}`}
                            aria-pressed={editData.avatar === avatar}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>

                      {/* Edit RPG Class */}
                      <select
                        value={editData.rpg_class}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            rpg_class: e.target.value,
                          }))
                        }
                        className="bg-rpg-dark border-2 border-rpg-border rounded-pixel px-3 py-1 font-retro text-lg text-white focus:border-rpg-rare focus:outline-none"
                        aria-label="Edit RPG class"
                      >
                        {RPG_CLASSES.map((cls) => (
                          <option key={cls} value={cls}>
                            {CLASS_ICONS[cls]} {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Edit Error */}
                    {editError && (
                      <p className="font-retro text-sm text-red-400" role="alert">
                        ⚠️ {editError}
                      </p>
                    )}

                    {/* Save/Cancel Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(pic.id)}
                        disabled={isSubmitting}
                        className="bg-rpg-dark border-2 border-green-500 rounded-pixel px-4 py-1 font-pixel text-[10px] text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-rpg-dark border-2 border-gray-500 rounded-pixel px-4 py-1 font-pixel text-[10px] text-gray-400 hover:bg-gray-500 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    {/* Avatar */}
                    <span
                      className="text-3xl"
                      role="img"
                      aria-label={`${pic.name} avatar`}
                      style={{ imageRendering: 'pixelated' }}
                    >
                      {pic.avatar}
                    </span>

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-retro text-xl text-white">
                        {pic.name}
                      </p>
                      <p className="font-pixel text-[10px] text-rpg-epic">
                        {CLASS_ICONS[pic.rpg_class] || '⚔️'} {pic.rpg_class}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(pic)}
                        className="bg-rpg-dark border-2 border-rpg-rare rounded-pixel px-3 py-1 font-pixel text-[10px] text-rpg-rare hover:bg-rpg-rare hover:text-white transition-all"
                        aria-label={`Edit ${pic.name}`}
                      >
                        Edit
                      </button>

                      {deleteConfirmId === pic.id ? (
                        <div className="flex gap-1 items-center">
                          <span className="font-retro text-sm text-red-400 mr-1">
                            Delete?
                          </span>
                          <button
                            onClick={() => handleDelete(pic.id)}
                            disabled={isSubmitting}
                            className="bg-rpg-dark border-2 border-red-500 rounded-pixel px-3 py-1 font-pixel text-[10px] text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                            aria-label={`Confirm delete ${pic.name}`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(null);
                              setDeleteError(null);
                            }}
                            className="bg-rpg-dark border-2 border-gray-500 rounded-pixel px-3 py-1 font-pixel text-[10px] text-gray-400 hover:bg-gray-500 hover:text-white transition-all"
                            aria-label="Cancel delete"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(pic.id)}
                          className="bg-rpg-dark border-2 border-red-500 rounded-pixel px-3 py-1 font-pixel text-[10px] text-red-400 hover:bg-red-500 hover:text-white transition-all"
                          aria-label={`Delete ${pic.name}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Delete Error (shown below the card) */}
                {deleteError && deleteConfirmId === null && pic.id === pics.find(p => deleteError)?.id && (
                  <p className="font-retro text-sm text-red-400 mt-2" role="alert">
                    ⚠️ {deleteError}
                  </p>
                )}
              </div>
            ))}

            {/* Global Delete Error */}
            {deleteError && (
              <div className="bg-rpg-card pixel-border p-3 border-red-500">
                <p className="font-retro text-sm text-red-400" role="alert">
                  ⚠️ {deleteError}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
