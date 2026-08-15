'use client';

import { useState, useEffect } from 'react';

export interface FocusRecord {
  date: string;
  fishCount: number;
  focusMinutes: number;
  tasks: { name: string; fish: number }[];
}

interface StatsPanelProps {
  onRecordFocus: (fish: number, minutes: number, taskName: string) => void;
  focusSessions: number;
  focusDurationMin: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const RECORDS_KEY = 'deep-sea-records';

function loadRecords(): FocusRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: FocusRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export function StatsPanel({
  focusSessions,
  focusDurationMin,
  collapsed,
  onToggleCollapse,
}: StatsPanelProps) {
  const [records, setRecords] = useState<FocusRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const prevSessionsRef = useState(focusSessions)[0];

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // Record focus session when sessions increase
  useEffect(() => {
    if (focusSessions > prevSessionsRef) {
      const today = getToday();
      setRecords(prev => {
        const existing = prev.find(r => r.date === today);
        if (existing) {
          return prev.map(r =>
            r.date === today
              ? { ...r, fishCount: r.fishCount + 1, focusMinutes: r.focusMinutes + focusDurationMin }
              : r
          );
        }
        return [{ date: today, fishCount: 1, focusMinutes: focusDurationMin, tasks: [] }, ...prev];
      });
    }
  }, [focusSessions]);

  const today = getToday();
  const weekDates = getWeekDates();
  const todayRecord = records.find(r => r.date === today);
  const todayFish = todayRecord?.fishCount ?? 0;
  const todayMinutes = todayRecord?.focusMinutes ?? 0;

  const weekRecords = weekDates.map(date => {
    const rec = records.find(r => r.date === date);
    return { date, fish: rec?.fishCount ?? 0, minutes: rec?.focusMinutes ?? 0 };
  });
  const weekFish = weekRecords.reduce((s, r) => s + r.fish, 0);
  const weekMinutes = weekRecords.reduce((s, r) => s + r.minutes, 0);
  const maxWeekFish = Math.max(...weekRecords.map(r => r.fish), 1);

  // All-time stats
  const totalFish = records.reduce((s, r) => s + r.fishCount, 0);
  const totalMinutes = records.reduce((s, r) => s + r.focusMinutes, 0);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed right-20 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.1] transition-all duration-300"
        title="展开统计面板"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed right-20 top-1/2 -translate-y-1/2 z-30 w-64 max-h-[80vh] flex flex-col rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-300/70" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          <span className="text-sm font-light text-white/70 tracking-wider">统计</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-hide">
        {/* Today stats */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">今日</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.04] rounded-xl px-3 py-2">
              <p className="text-xl font-light text-cyan-300/80">{todayFish}</p>
              <p className="text-[10px] text-white/30">小鱼干 🐟</p>
            </div>
            <div className="bg-white/[0.04] rounded-xl px-3 py-2">
              <p className="text-xl font-light text-cyan-300/80">{formatHours(todayMinutes)}</p>
              <p className="text-[10px] text-white/30">专注时长</p>
            </div>
          </div>
        </div>

        {/* Week chart */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">本周</p>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <div className="flex items-end justify-between gap-1 h-20">
              {weekRecords.map((r, i) => {
                const height = Math.max((r.fish / maxWeekFish) * 100, 4);
                const dayOfWeek = new Date(r.date + 'T00:00:00').getDay();
                const isToday = r.date === today;
                return (
                  <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-white/20">{r.fish || ''}</span>
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-cyan-400/40 to-cyan-300/20'
                          : r.fish > 0
                            ? 'bg-gradient-to-t from-cyan-400/20 to-cyan-300/10'
                            : 'bg-white/[0.04]'
                      }`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    <span className={`text-[9px] ${isToday ? 'text-cyan-300/60' : 'text-white/20'}`}>
                      {DAY_NAMES[dayOfWeek]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-white/[0.04]">
              <span className="text-[10px] text-white/25">
                共 {weekFish} 🐟
              </span>
              <span className="text-[10px] text-white/25">
                {formatHours(weekMinutes)}
              </span>
            </div>
          </div>
        </div>

        {/* All-time stats */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">累计</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.04] rounded-xl px-3 py-2">
              <p className="text-lg font-light text-cyan-300/60">{totalFish}</p>
              <p className="text-[10px] text-white/25">总小鱼干</p>
            </div>
            <div className="bg-white/[0.04] rounded-xl px-3 py-2">
              <p className="text-lg font-light text-cyan-300/60">{formatHours(totalMinutes)}</p>
              <p className="text-[10px] text-white/25">总专注</p>
            </div>
          </div>
        </div>

        {/* History toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-2 rounded-xl bg-white/[0.03] text-white/30 text-xs hover:bg-white/[0.06] hover:text-white/50 transition-all"
        >
          {showHistory ? '收起历史' : '查看历史记录'}
        </button>

        {showHistory && (
          <div className="space-y-1">
            {records.slice(0, 14).map(rec => (
              <div key={rec.date} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02]">
                <span className="text-[11px] text-white/30 font-light">{rec.date.slice(5)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-cyan-300/50">{rec.fishCount} 🐟</span>
                  <span className="text-[11px] text-white/20">{formatHours(rec.focusMinutes)}</span>
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <p className="text-center text-white/15 text-xs py-4">暂无记录</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
