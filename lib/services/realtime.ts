import { supabase } from '@/lib/supabase';
import type { Task, TaskType, PIC, PlayerStats } from '@/lib/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// --- Types ---

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';
export type RealtimeCallback<T> = (event: RealtimeEvent, payload: T) => void;
export type ConnectionStatusCallback = (connected: boolean) => void;

// --- Connection Status Tracking ---

let connectionStatus = false;
const connectionStatusListeners: Set<ConnectionStatusCallback> = new Set();

function setConnectionStatus(connected: boolean) {
  if (connectionStatus !== connected) {
    connectionStatus = connected;
    connectionStatusListeners.forEach((cb) => cb(connected));
  }
}

/**
 * Returns the current real-time connection status.
 */
export function getConnectionStatus(): boolean {
  return connectionStatus;
}

/**
 * Subscribe to connection status changes.
 * Returns an unsubscribe function.
 */
export function onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
  connectionStatusListeners.add(callback);
  // Immediately notify with current status
  callback(connectionStatus);
  return () => {
    connectionStatusListeners.delete(callback);
  };
}

// --- Generic Subscription Helper ---

function subscribeToTable<T extends Record<string, any>>(
  table: string,
  callback: RealtimeCallback<T>,
  onReconnect?: () => void
): () => void {
  const channelName = `realtime-${table}-${Date.now()}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload: RealtimePostgresChangesPayload<T>) => {
        const event = payload.eventType as RealtimeEvent;
        const record = (
          event === 'DELETE' ? payload.old : payload.new
        ) as T;
        callback(event, record);
      }
    )
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus(true);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnectionStatus(false);
      } else if (status === 'TIMED_OUT') {
        setConnectionStatus(false);
        // Trigger reconnect with full data re-fetch
        onReconnect?.();
      }
    });

  // Handle system-level reconnection events
  channel.on('system', {}, (payload) => {
    if (payload?.extension === 'postgres_changes') {
      // Re-established after disconnect — trigger full re-fetch
      setConnectionStatus(true);
      onReconnect?.();
    }
  });

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// --- Table-Specific Subscriptions ---

/**
 * Subscribe to tasks table INSERT/UPDATE/DELETE events.
 * Returns an unsubscribe function.
 */
export function subscribeToTasks(
  callback: RealtimeCallback<Task>,
  onReconnect?: () => void
): () => void {
  return subscribeToTable<Task>('tasks', callback, onReconnect);
}

/**
 * Subscribe to types table INSERT/UPDATE/DELETE events.
 * Returns an unsubscribe function.
 */
export function subscribeToTypes(
  callback: RealtimeCallback<TaskType>,
  onReconnect?: () => void
): () => void {
  return subscribeToTable<TaskType>('types', callback, onReconnect);
}

/**
 * Subscribe to pics table INSERT/UPDATE/DELETE events.
 * Returns an unsubscribe function.
 */
export function subscribeToPics(
  callback: RealtimeCallback<PIC>,
  onReconnect?: () => void
): () => void {
  return subscribeToTable<PIC>('pics', callback, onReconnect);
}

/**
 * Subscribe to player_stats table INSERT/UPDATE/DELETE events.
 * Returns an unsubscribe function.
 */
export function subscribeToPlayerStats(
  callback: RealtimeCallback<PlayerStats>,
  onReconnect?: () => void
): () => void {
  return subscribeToTable<PlayerStats>('player_stats', callback, onReconnect);
}
