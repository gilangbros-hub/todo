'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlayerStats } from '@/lib/types';
import { getPlayerStats } from '@/lib/services/player-stats';
import {
  ClipboardSession, ClipboardEntry,
  getSessions, createSession, deleteSession, renameSession,
  getEntries, createEntry, updateEntry, deleteEntry,
} from '@/lib/services/clipboard';
import Sidebar from '@/components/Sidebar';

export default function ClipboardPage() {
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: '', user_id: '', xp: 0, level: 1, streak: 0, last_completed_date: null,
  });
  const [sessions, setSessions] = useState<ClipboardSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  useEffect(() => {
    getPlayerStats().then(setPlayerStats).catch(console.error);
  }, []);

  const fetchSessions = useCallback(async () => {
    const data = await getSessions();
    setSessions(data);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Load entries when session changes
  useEffect(() => {
    if (!activeSessionId) { setEntries([]); return; }
    getEntries(activeSessionId).then(setEntries).catch(console.error);
  }, [activeSessionId]);

  const handleNewSession = async () => {
    const session = await createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setEntries([]);
    }
  };

  const handleRename = async (id: string) => {
    if (!renameTitle.trim()) return;
    await renameSession(id, renameTitle.trim());
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: renameTitle.trim() } : s));
    setRenamingId(null);
    setRenameTitle('');
  };

  const handleAddEntry = async () => {
    if (!newContent.trim() || !activeSessionId) return;
    const entry = await createEntry(activeSessionId, newContent.trim());
    setEntries((prev) => [...prev, entry]);
    setNewContent('');
  };

  const handleUpdateEntry = async (id: string) => {
    if (!editContent.trim()) return;
    await updateEntry(id, editContent.trim());
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, content: editContent.trim(), updated_at: new Date().toISOString() } : e));
    setEditingId(null);
    setEditContent('');
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCopyEntry = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div className="flex min-h-screen">
      <Sidebar playerStats={playerStats} activeRoute="/clipboard" />

      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-pixel text-lg text-rpg-legendary" style={{ textShadow: '2px 2px 0px #000' }}>
            📋 Clipboard
          </h1>
          <button
            onClick={handleNewSession}
            className="px-3 py-2 font-retro text-sm text-rpg-legendary pixel-border border-rpg-legendary hover:shadow-legendary transition-all cursor-pointer"
          >
            + New Session
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* Sessions List */}
          <div className="rpg-card p-4 overflow-y-auto max-h-[80vh]">
            <h3 className="font-pixel text-[9px] text-rpg-rare mb-3">Sessions</h3>
            {sessions.length === 0 ? (
              <p className="font-retro text-xs text-gray-500 italic">No sessions yet. Create one!</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded cursor-pointer transition-all ${
                      activeSessionId === session.id
                        ? 'bg-rpg-dark border border-rpg-legendary shadow-legendary'
                        : 'bg-rpg-dark/50 border border-rpg-border hover:border-rpg-rare'
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setActiveSessionId(session.id); }}
                  >
                    {renamingId === session.id ? (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(session.id); }}
                          className="flex-1 bg-rpg-dark text-white font-retro text-xs px-2 py-1 border border-rpg-border rounded"
                          autoFocus
                        />
                        <button onClick={() => handleRename(session.id)} className="font-retro text-xs text-green-400 cursor-pointer">✓</button>
                        <button onClick={() => setRenamingId(null)} className="font-retro text-xs text-gray-400 cursor-pointer">✕</button>
                      </div>
                    ) : (
                      <>
                        <p className="font-pixel text-[8px] text-white truncate">{session.title}</p>
                        <p className="font-retro text-[10px] text-gray-500 mt-1">
                          {new Date(session.created_at).toLocaleDateString('id-ID')} • {new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setRenamingId(session.id); setRenameTitle(session.title); }}
                            className="font-retro text-[10px] text-gray-400 hover:text-rpg-rare cursor-pointer"
                          >rename</button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="font-retro text-[10px] text-gray-400 hover:text-red-400 cursor-pointer"
                          >delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entries Panel */}
          <div className="rpg-card p-4 overflow-y-auto max-h-[80vh]">
            {!activeSession ? (
              <div className="text-center py-16">
                <p className="font-retro text-sm text-gray-500">Select or create a session to start.</p>
              </div>
            ) : (
              <>
                <h3 className="font-pixel text-[9px] text-rpg-rare mb-4">
                  {activeSession.title}
                </h3>

                {/* Entries */}
                <div className="space-y-3 mb-4">
                  {entries.map((entry) => (
                    <div key={entry.id} className="p-3 bg-rpg-dark/50 border border-rpg-border rounded group">
                      {editingId === entry.id ? (
                        <div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-rpg-dark text-white font-retro text-sm px-2 py-1 border border-rpg-border rounded resize-y min-h-[60px]"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleUpdateEntry(entry.id)} className="font-retro text-xs text-green-400 cursor-pointer">Save</button>
                            <button onClick={() => setEditingId(null)} className="font-retro text-xs text-gray-400 cursor-pointer">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-retro text-sm text-gray-200 whitespace-pre-wrap">{entry.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="font-retro text-[10px] text-gray-500">
                              {new Date(entry.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              {entry.updated_at !== entry.created_at && ' (edited)'}
                            </p>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleCopyEntry(entry.content)} className="font-retro text-[10px] text-rpg-rare hover:text-rpg-legendary cursor-pointer">copy</button>
                              <button onClick={() => { setEditingId(entry.id); setEditContent(entry.content); }} className="font-retro text-[10px] text-gray-400 hover:text-rpg-rare cursor-pointer">edit</button>
                              <button onClick={() => handleDeleteEntry(entry.id)} className="font-retro text-[10px] text-gray-400 hover:text-red-400 cursor-pointer">delete</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* New Entry Input */}
                <div className="border-t border-rpg-border pt-4">
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAddEntry();
                      }
                    }}
                    placeholder="Paste or type here... (Ctrl+Enter to save)"
                    rows={3}
                    className="w-full bg-rpg-dark text-white font-retro text-sm px-3 py-2 pixel-border focus:outline-none focus:shadow-rare resize-y"
                  />
                  <button
                    onClick={handleAddEntry}
                    disabled={!newContent.trim()}
                    className="mt-2 px-4 py-2 font-pixel text-[9px] bg-rpg-legendary text-rpg-dark pixel-border border-rpg-legendary hover:shadow-legendary transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    + Add Entry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
