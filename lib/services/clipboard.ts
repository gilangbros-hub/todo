/**
 * Clipboard — Data access layer for sessions and entries.
 */

import { supabase } from '@/lib/supabase';

export interface ClipboardSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface ClipboardEntry {
  id: string;
  user_id: string;
  session_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// --- Sessions ---

export async function getSessions(): Promise<ClipboardSession[]> {
  const { data, error } = await supabase
    .from('clipboard_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as ClipboardSession[];
}

export async function createSession(title?: string): Promise<ClipboardSession> {
  const { data, error } = await supabase
    .from('clipboard_sessions')
    .insert({ title: title || `Session ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ClipboardSession;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('clipboard_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function renameSession(id: string, title: string): Promise<void> {
  const { error } = await supabase.from('clipboard_sessions').update({ title }).eq('id', id);
  if (error) throw new Error(error.message);
}

// --- Entries ---

export async function getEntries(sessionId: string): Promise<ClipboardEntry[]> {
  const { data, error } = await supabase
    .from('clipboard_entries')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as ClipboardEntry[];
}

export async function createEntry(sessionId: string, content: string): Promise<ClipboardEntry> {
  const { data, error } = await supabase
    .from('clipboard_entries')
    .insert({ session_id: sessionId, content })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ClipboardEntry;
}

export async function updateEntry(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('clipboard_entries')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('clipboard_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
