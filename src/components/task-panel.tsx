'use client';

import { useState, useEffect } from 'react';

export interface Task {
  id: string;
  name: string;
  estimatedFish: number;
  completedFish: number;
  done: boolean;
  createdAt: number;
}

export interface FocusRecord {
  date: string; // YYYY-MM-DD
  fishCount: number;
  focusMinutes: number;
  tasks: { name: string; fish: number }[];
}

interface TaskPanelProps {
  currentTask: Task | null;
  onCurrentTaskChange: (task: Task | null) => void;
  onFishEarned: (fish: number, taskName: string) => void;
  focusSessions: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const STORAGE_KEY = 'deep-sea-tasks';

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function TaskPanel({
  currentTask,
  onCurrentTaskChange,
  onFishEarned,
  focusSessions,
  collapsed,
  onToggleCollapse,
}: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskEstimate, setNewTaskEstimate] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const prevSessionsRef = useState(focusSessions)[0];

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // When a focus session completes, add a fish to current task
  useEffect(() => {
    if (focusSessions > prevSessionsRef && currentTask) {
      setTasks(prev =>
        prev.map(t =>
          t.id === currentTask.id
            ? { ...t, completedFish: Math.min(t.completedFish + 1, t.estimatedFish) }
            : t
        )
      );
      onFishEarned(1, currentTask.name);
    }
  }, [focusSessions]);

  const addTask = () => {
    if (!newTaskName.trim()) return;
    const task: Task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: newTaskName.trim(),
      estimatedFish: Math.max(1, newTaskEstimate),
      completedFish: 0,
      done: false,
      createdAt: Date.now(),
    };
    setTasks(prev => [task, ...prev]);
    setNewTaskName('');
    setNewTaskEstimate(1);
    setShowForm(false);
    if (!currentTask) onCurrentTaskChange(task);
  };

  const toggleDone = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (currentTask?.id === id) onCurrentTaskChange(null);
  };

  const selectTask = (task: Task) => {
    onCurrentTaskChange(task.id === currentTask?.id ? null : task);
  };

  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const totalFish = tasks.reduce((sum, t) => sum + t.completedFish, 0);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.1] transition-all duration-300"
        title="展开任务面板"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
        {totalFish > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] flex items-center justify-center">
            {totalFish}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-30 w-72 max-h-[80vh] flex flex-col rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-300/70">
            <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-light text-white/70 tracking-wider">任务</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-white/30 hover:text-white/60 transition-colors"
          title="收起"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Current task indicator */}
      {currentTask && (
        <div className="px-4 py-2 bg-cyan-400/[0.06] border-b border-white/[0.04]">
          <p className="text-[10px] text-cyan-300/50 uppercase tracking-widest mb-0.5">当前专注</p>
          <p className="text-sm text-cyan-200/80 font-light truncate">{currentTask.name}</p>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        {pendingTasks.length === 0 && doneTasks.length === 0 && !showForm && (
          <div className="text-center py-8">
            <p className="text-white/20 text-sm font-light">还没有任务</p>
            <p className="text-white/10 text-xs font-light mt-1">点击下方添加</p>
          </div>
        )}

        {pendingTasks.map(task => (
          <div
            key={task.id}
            onClick={() => selectTask(task)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 ${
              currentTask?.id === task.id
                ? 'bg-cyan-400/[0.1] border border-cyan-400/20'
                : 'hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleDone(task.id); }}
              className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0 flex items-center justify-center hover:border-cyan-300/50 transition-colors"
            >
              {task.completedFish > 0 && (
                <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70 font-light truncate">{task.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: task.estimatedFish }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-[10px] ${
                      i < task.completedFish ? 'text-cyan-300/80' : 'text-white/15'
                    }`}
                  >
                    🐟
                  </span>
                ))}
                <span className="text-[10px] text-white/20 ml-1">
                  {task.completedFish}/{task.estimatedFish}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-300/60 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {doneTasks.length > 0 && (
          <div className="pt-2 mt-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/20 uppercase tracking-widest px-3 mb-1">已完成</p>
            {doneTasks.map(task => (
              <div
                key={task.id}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl"
              >
                <button
                  onClick={() => toggleDone(task.id)}
                  className="w-4 h-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 flex-shrink-0 flex items-center justify-center"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cyan-300/60" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>
                <p className="text-sm text-white/30 font-light truncate line-through">{task.name}</p>
                <span className="text-[10px] text-cyan-300/30 ml-auto">
                  {task.completedFish}🐟
                </span>
                <button
                  onClick={() => removeTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-300/60 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add task form */}
      {showForm ? (
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="任务名称..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30 font-light"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">预估小鱼干</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNewTaskEstimate(Math.max(1, newTaskEstimate - 1))}
                className="w-6 h-6 rounded-lg bg-white/[0.05] text-white/40 hover:text-white/60 flex items-center justify-center text-xs"
              >
                -
              </button>
              <span className="w-6 text-center text-sm text-cyan-300/70">{newTaskEstimate}</span>
              <button
                onClick={() => setNewTaskEstimate(Math.min(20, newTaskEstimate + 1))}
                className="w-6 h-6 rounded-lg bg-white/[0.05] text-white/40 hover:text-white/60 flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
            <span className="text-[10px] text-white/20">🐟</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTask}
              className="flex-1 py-2 rounded-xl bg-cyan-400/10 text-cyan-300/70 text-sm hover:bg-cyan-400/20 transition-colors"
            >
              添加
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] text-white/40 text-sm hover:text-white/60 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2 rounded-xl border border-dashed border-white/[0.1] text-white/30 text-sm hover:border-cyan-400/20 hover:text-cyan-300/50 transition-all font-light"
          >
            + 添加任务
          </button>
        </div>
      )}
    </div>
  );
}
