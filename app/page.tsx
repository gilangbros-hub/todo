'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Task, TaskType, PIC, PlayerStats } from '@/lib/types';
import { TaskFilters, SortBy, SortOrder, filterTasks, sortTasks } from '@/lib/filters';
import { detectOverdueTasks } from '@/lib/overdue';
import { getTasks, createTask, updateOverdueTasks } from '@/lib/services/tasks';
import { getTypes } from '@/lib/services/types';
import { getPics } from '@/lib/services/pics';
import { getPlayerStats } from '@/lib/services/player-stats';
import {
  subscribeToTasks,
  subscribeToTypes,
  subscribeToPics,
  subscribeToPlayerStats,
  onConnectionStatusChange,
} from '@/lib/services/realtime';
import Sidebar from '@/components/Sidebar';
import ViewToggle from '@/components/ViewToggle';
import FilterBar from '@/components/FilterBar';
import SortControl from '@/components/SortControl';
import KanbanBoard from '@/components/KanbanBoard';
import FolderView from '@/components/FolderView';
import WizardModal, { CreateTaskData } from '@/components/WizardModal';
import EmptyState from '@/components/EmptyState';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function DashboardPage() {
  const router = useRouter();

  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [pics, setPics] = useState<PIC[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    id: '',
    user_id: '',
    xp: 0,
    level: 1,
    streak: 0,
    last_completed_date: null,
  });
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sortBy, setSortBy] = useState<SortBy>('deadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeView, setActiveView] = useState<'kanban' | 'folder'>('kanban');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);

  // Ref to track the bounce animation timeout
  const bounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Data Fetching ---
  const fetchAllData = useCallback(async () => {
    try {
      const [tasksData, typesResult, picsResult, statsData] = await Promise.all([
        getTasks(),
        getTypes(),
        getPics(),
        getPlayerStats(),
      ]);
      setTasks(tasksData as Task[]);
      setTypes(typesResult.data);
      setPics(picsResult.data);
      setPlayerStats(statsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Real-time Subscriptions ---
  useEffect(() => {
    const unsubTasks = subscribeToTasks((event, payload) => {
      setTasks((prev) => {
        if (event === 'INSERT') {
          return [...prev, payload];
        }
        if (event === 'UPDATE') {
          return prev.map((t) => (t.id === payload.id ? payload : t));
        }
        if (event === 'DELETE') {
          return prev.filter((t) => t.id !== payload.id);
        }
        return prev;
      });
    }, fetchAllData);

    const unsubTypes = subscribeToTypes((event, payload) => {
      setTypes((prev) => {
        if (event === 'INSERT') {
          return [...prev, payload];
        }
        if (event === 'UPDATE') {
          return prev.map((t) => (t.id === payload.id ? payload : t));
        }
        if (event === 'DELETE') {
          return prev.filter((t) => t.id !== payload.id);
        }
        return prev;
      });
    }, fetchAllData);

    const unsubPics = subscribeToPics((event, payload) => {
      setPics((prev) => {
        if (event === 'INSERT') {
          return [...prev, payload];
        }
        if (event === 'UPDATE') {
          return prev.map((p) => (p.id === payload.id ? payload : p));
        }
        if (event === 'DELETE') {
          return prev.filter((p) => p.id !== payload.id);
        }
        return prev;
      });
    }, fetchAllData);

    const unsubStats = subscribeToPlayerStats((event, payload) => {
      if (event === 'INSERT' || event === 'UPDATE') {
        setPlayerStats(payload);
      }
    }, fetchAllData);

    const unsubConnection = onConnectionStatusChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubTasks();
      unsubTypes();
      unsubPics();
      unsubStats();
      unsubConnection();
    };
  }, [fetchAllData]);

  // --- Overdue Detection Timer (60s interval) ---
  useEffect(() => {
    const checkOverdue = async () => {
      const overdueIds = detectOverdueTasks(tasks, new Date());
      if (overdueIds.length > 0) {
        try {
          await updateOverdueTasks(overdueIds);
          // Update local state immediately
          setTasks((prev) =>
            prev.map((t) =>
              overdueIds.includes(t.id) ? { ...t, status: 'overdue' as const } : t
            )
          );
        } catch (error) {
          console.error('Failed to update overdue tasks:', error);
        }
      }
    };

    // Run immediately on mount
    checkOverdue();

    // Set up 60-second interval
    const interval = setInterval(checkOverdue, 60_000);

    return () => clearInterval(interval);
  }, [tasks]);

  // --- Clear bounce animation after delay ---
  useEffect(() => {
    if (newTaskId) {
      bounceTimeoutRef.current = setTimeout(() => {
        setNewTaskId(null);
      }, 1000);
    }
    return () => {
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current);
      }
    };
  }, [newTaskId]);

  // --- Handlers ---
  const handleTaskClick = (id: string) => {
    router.push(`/tasks/${id}`);
  };

  const handleSortChange = (newSortBy: SortBy, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleCreateTask = async (data: CreateTaskData) => {
    const newTask = await createTask({
      title: data.title,
      description: data.description,
      priority: data.priority,
      type_id: data.type_id,
      pic_id: data.pic_id,
      deadline: data.deadline,
    });

    // Add to local state immediately
    setTasks((prev) => [...prev, newTask as Task]);
    setNewTaskId(newTask.id);
    setIsWizardOpen(false);
  };

  // --- Derived Data ---
  const filteredTasks = filterTasks(tasks, filters);
  const sortedTasks = sortTasks(filteredTasks, sortBy, sortOrder);
  const hasNoTasks = tasks.length === 0;
  const hasNoMatches = !hasNoTasks && sortedTasks.length === 0;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar playerStats={playerStats} activeRoute="/" />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="font-pixel text-lg text-rpg-legendary"
            style={{ textShadow: '2px 2px 0px #000' }}
          >
            ⚔ Quest Board
          </h1>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 font-retro text-sm bg-rpg-legendary text-rpg-dark pixel-border border-rpg-legendary hover:shadow-legendary transition-all"
          >
            + New Quest
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <ViewToggle activeView={activeView} onChange={setActiveView} />
            <FilterBar
              filters={filters}
              onChange={setFilters}
              types={types}
              pics={pics}
            />
          </div>
          <SortControl
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={handleSortChange}
          />
        </div>

        {/* Content Area */}
        {hasNoTasks ? (
          <EmptyState
            message="No quests yet. Create your first quest to begin your adventure!"
            icon="📜"
          />
        ) : hasNoMatches ? (
          <EmptyState
            message="No quests match your current filters. Try adjusting your search criteria."
            icon="🔍"
          />
        ) : (
          <div className={newTaskId ? 'animate-bounce-once' : ''}>
            {activeView === 'kanban' ? (
              <KanbanBoard tasks={sortedTasks} onTaskClick={handleTaskClick} />
            ) : (
              <FolderView
                tasks={sortedTasks}
                types={types}
                onTaskClick={handleTaskClick}
              />
            )}
          </div>
        )}
      </main>

      {/* Wizard Modal */}
      <WizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSubmit={handleCreateTask}
        types={types}
        pics={pics}
      />

      {/* Connection Status */}
      <ConnectionStatus isConnected={isConnected} />
    </div>
  );
}
