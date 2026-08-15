'use client';

import { useState, useEffect, useCallback } from 'react';
import { DeepSeaCanvas, type DeepSeaSettings } from '@/components/deep-sea-canvas';
import { PomodoroTimer } from '@/components/pomodoro-timer';
import { SettingsPanel } from '@/components/settings-panel';
import { TaskPanel, type Task } from '@/components/task-panel';
import { StatsPanel } from '@/components/stats-panel';

const DEFAULT_SETTINGS: DeepSeaSettings = {
  fishCount: 45,
  fishSpeed: 0.8,
  fishSize: 1.0,
  fishColorStyle: 'silver',
  bubbleEnabled: true,
  bubbleDensity: 1.0,
  seaweedDensity: 1.0,
  sunRayIntensity: 1.0,
};

const SETTINGS_KEY = 'deep-sea-settings';
const FOCUS_DURATION_KEY = 'deep-sea-focus-duration';
const BREAK_DURATION_KEY = 'deep-sea-break-duration';
const LONG_BREAK_DURATION_KEY = 'deep-sea-long-break-duration';
const LONG_BREAK_INTERVAL_KEY = 'deep-sea-long-break-interval';
const STRICT_MODE_KEY = 'deep-sea-strict-mode';
const SOUND_ENABLED_KEY = 'deep-sea-sound-enabled';
const TASK_PANEL_COLLAPSED_KEY = 'deep-sea-task-panel-collapsed';
const STATS_PANEL_COLLAPSED_KEY = 'deep-sea-stats-panel-collapsed';

function loadNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v ? Number(v) : fallback;
}

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  return v ? v === 'true' : fallback;
}

export default function Home() {
  const [settings, setSettings] = useState<DeepSeaSettings>(DEFAULT_SETTINGS);
  const [isBreak, setIsBreak] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [strictMode, setStrictMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [focusSessions, setFocusSessions] = useState(0);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskPanelCollapsed, setTaskPanelCollapsed] = useState(false);
  const [statsPanelCollapsed, setStatsPanelCollapsed] = useState(false);

  // Load persisted settings
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try { setSettings(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setFocusDuration(loadNumber(FOCUS_DURATION_KEY, 25 * 60));
    setBreakDuration(loadNumber(BREAK_DURATION_KEY, 5 * 60));
    setLongBreakDuration(loadNumber(LONG_BREAK_DURATION_KEY, 15 * 60));
    setLongBreakInterval(loadNumber(LONG_BREAK_INTERVAL_KEY, 4));
    setStrictMode(loadBool(STRICT_MODE_KEY, false));
    setSoundEnabled(loadBool(SOUND_ENABLED_KEY, true));
    setTaskPanelCollapsed(loadBool(TASK_PANEL_COLLAPSED_KEY, false));
    setStatsPanelCollapsed(loadBool(STATS_PANEL_COLLAPSED_KEY, false));
  }, []);

  // Persist settings
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(FOCUS_DURATION_KEY, String(focusDuration)); }, [focusDuration]);
  useEffect(() => { localStorage.setItem(BREAK_DURATION_KEY, String(breakDuration)); }, [breakDuration]);
  useEffect(() => { localStorage.setItem(LONG_BREAK_DURATION_KEY, String(longBreakDuration)); }, [longBreakDuration]);
  useEffect(() => { localStorage.setItem(LONG_BREAK_INTERVAL_KEY, String(longBreakInterval)); }, [longBreakInterval]);
  useEffect(() => { localStorage.setItem(STRICT_MODE_KEY, String(strictMode)); }, [strictMode]);
  useEffect(() => { localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem(TASK_PANEL_COLLAPSED_KEY, String(taskPanelCollapsed)); }, [taskPanelCollapsed]);
  useEffect(() => { localStorage.setItem(STATS_PANEL_COLLAPSED_KEY, String(statsPanelCollapsed)); }, [statsPanelCollapsed]);

  const handleSessionComplete = useCallback(() => {
    setFocusSessions(prev => prev + 1);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a1628]">
      <DeepSeaCanvas isBreak={isBreak} settings={settings} />

      <PomodoroTimer
        onModeChange={setIsBreak}
        onSessionComplete={handleSessionComplete}
        focusDuration={focusDuration}
        breakDuration={breakDuration}
        longBreakDuration={longBreakDuration}
        longBreakInterval={longBreakInterval}
        strictMode={strictMode}
        soundEnabled={soundEnabled}
        currentTaskName={currentTask?.name}
      />

      <TaskPanel
        currentTask={currentTask}
        onCurrentTaskChange={setCurrentTask}
        onFishEarned={() => {}}
        focusSessions={focusSessions}
        collapsed={taskPanelCollapsed}
        onToggleCollapse={() => setTaskPanelCollapsed(!taskPanelCollapsed)}
      />

      <StatsPanel
        onRecordFocus={() => {}}
        focusSessions={focusSessions}
        focusDurationMin={Math.round(focusDuration / 60)}
        collapsed={statsPanelCollapsed}
        onToggleCollapse={() => setStatsPanelCollapsed(!statsPanelCollapsed)}
      />

      <SettingsPanel
        settings={settings}
        onSettingsChange={setSettings}
        focusDuration={focusDuration}
        breakDuration={breakDuration}
        longBreakDuration={longBreakDuration}
        longBreakInterval={longBreakInterval}
        strictMode={strictMode}
        soundEnabled={soundEnabled}
        onFocusDurationChange={setFocusDuration}
        onBreakDurationChange={setBreakDuration}
        onLongBreakDurationChange={setLongBreakDuration}
        onLongBreakIntervalChange={setLongBreakInterval}
        onStrictModeChange={setStrictMode}
        onSoundEnabledChange={setSoundEnabled}
      />
    </main>
  );
}
