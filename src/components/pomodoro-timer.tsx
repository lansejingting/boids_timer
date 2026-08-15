'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type TimerMode = 'focus' | 'break' | 'stopwatch';
type TimerState = 'idle' | 'running' | 'paused';

interface PomodoroTimerProps {
  onModeChange?: (isBreak: boolean) => void;
  onSessionComplete?: () => void;
  focusDuration?: number;
  breakDuration?: number;
  longBreakDuration?: number;
  longBreakInterval?: number;
  strictMode?: boolean;
  soundEnabled?: boolean;
  currentTaskName?: string;
}

const DEFAULT_FOCUS = 25 * 60;
const DEFAULT_BREAK = 5 * 60;
const DEFAULT_LONG_BREAK = 15 * 60;

// Generate a gentle notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch {
    // Audio not available
  }
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, silent: false });
  }
}

export function PomodoroTimer({
  onModeChange,
  onSessionComplete,
  focusDuration = DEFAULT_FOCUS,
  breakDuration = DEFAULT_BREAK,
  longBreakDuration = DEFAULT_LONG_BREAK,
  longBreakInterval = 4,
  strictMode = false,
  soundEnabled = true,
  currentTaskName,
}: PomodoroTimerProps) {
  const TIMER_STORAGE_KEY = 'deep-sea-timer';

  // Use timestamp-based timing to avoid reliance on intervals for the source of truth
  const endTimeRef = useRef<number | null>(null); // ms timestamp when current countdown ends
  const pausedRemainingRef = useRef<number | null>(null); // seconds left when paused
  const hasRestoredRef = useRef(false);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [state, setState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [sessions, setSessions] = useState(0);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [showStrictFail, setShowStrictFail] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchStartRef = useRef<number | null>(null); // ms timestamp when stopwatch started
  const strictModeRef = useRef(strictMode);
  const soundEnabledRef = useRef(soundEnabled);
  const transitioningRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { strictModeRef.current = strictMode; }, [strictMode]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const isLongBreak = sessions > 0 && sessions % longBreakInterval === 0;
  const currentDuration = mode === 'focus'
    ? focusDuration
    : mode === 'break'
      ? (isLongBreak ? longBreakDuration : breakDuration)
      : 0;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
  }, []);

  const clearStopwatch = useCallback(() => {
    if (stopwatchRef.current) {
      clearInterval(stopwatchRef.current);
      stopwatchRef.current = null;
    }
    stopwatchStartRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    // If resuming from paused state, use paused remaining, otherwise use current timeLeft
    const startRemaining = pausedRemainingRef.current ?? timeLeft;
    endTimeRef.current = Date.now() + startRemaining * 1000;

    // Interval only updates UI; remaining is computed from endTimeRef
    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remainingMs = endTimeRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(remainingSec);
      if (remainingSec <= 0) {
        // trigger completion on next tick
        clearTimer();
        setTimeLeft(0);
      }
    }, 500);
    // clear paused remaining when running
    pausedRemainingRef.current = null;
    setState('running');
    // persist
    try { if (hasRestoredRef.current) localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode, state: 'running', endTime: endTimeRef.current, pausedRemaining: null, sessions })); } catch {}
  }, [clearTimer, timeLeft, mode, sessions]);

  const startStopwatch = useCallback(() => {
    clearStopwatch();
    const startMs = Date.now() - stopwatchTime * 1000;
    stopwatchStartRef.current = startMs;
    stopwatchRef.current = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setStopwatchTime(elapsed);
    }, 500);
    setState('running');
    try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode: 'stopwatch', state: 'running', stopwatchStart: startMs, stopwatchElapsed: stopwatchTime, sessions })); } catch {}
  }, [clearStopwatch, stopwatchTime]);

  const notifyComplete = useCallback((isBreakNow: boolean) => {
    if (soundEnabledRef.current) {
      playNotificationSound();
    }
    if (isBreakNow) {
      sendNotification('专注完成!', '休息一下吧，你获得了一条小鱼干 🐟');
    } else {
      sendNotification('休息结束', '准备开始下一轮专注吧!');
    }
  }, []);

  // Handle countdown timer completion
  useEffect(() => {
    if (timeLeft === 0 && state === 'running' && mode !== 'stopwatch') {
      transitioningRef.current = true;
      if (mode === 'focus') {
        const newSessions = sessions + 1;
        setSessions(newSessions);
        onSessionComplete?.();
        setMode('break');
        onModeChange?.(true);
        const bDur = newSessions % longBreakInterval === 0 ? longBreakDuration : breakDuration;
        setTimeLeft(bDur);
        notifyComplete(true);
      } else {
        setMode('focus');
        onModeChange?.(false);
        setTimeLeft(focusDuration);
        notifyComplete(false);
      }
      setState('idle');
      // Allow duration sync effect to run after transition is complete
      requestAnimationFrame(() => { transitioningRef.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, state, mode]);

  useEffect(() => {
    // On mount, try to restore timer state from localStorage
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved) {
          // restore basic fields
          if (saved.mode) setMode(saved.mode);
          if (typeof saved.sessions === 'number') setSessions(saved.sessions);
          // restore stopwatch
          if (saved.mode === 'stopwatch') {
            if (saved.state === 'running' && typeof saved.stopwatchStart === 'number') {
              stopwatchStartRef.current = saved.stopwatchStart;
              const elapsed = Math.max(0, Math.floor((Date.now() - saved.stopwatchStart) / 1000));
              setStopwatchTime(elapsed);
              stopwatchRef.current = setInterval(() => {
                if (!stopwatchStartRef.current) return;
                const elapsedNow = Math.max(0, Math.floor((Date.now() - stopwatchStartRef.current) / 1000));
                setStopwatchTime(elapsedNow);
              }, 500);
              setState('running');
            } else if (saved.state === 'paused' && typeof saved.stopwatchElapsed === 'number') {
              setStopwatchTime(saved.stopwatchElapsed);
              setState('paused');
            } else {
              setStopwatchTime(saved.stopwatchElapsed ?? 0);
              setState('idle');
            }
          } else {
            // countdown modes
            if (saved.state === 'running' && saved.endTime) {
              const remainingMs = saved.endTime - Date.now();
              const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
              if (remainingSec > 0) {
                setTimeLeft(remainingSec);
                endTimeRef.current = saved.endTime;
                // start interval
                if (!intervalRef.current) {
                  intervalRef.current = setInterval(() => {
                    if (!endTimeRef.current) return;
                    const remMs = endTimeRef.current - Date.now();
                    const remSec = Math.max(0, Math.ceil(remMs / 1000));
                    setTimeLeft(remSec);
                    if (remSec <= 0) {
                      clearTimer();
                      setTimeLeft(0);
                    }
                  }, 500);
                }
                setState('running');
              } else {
                // already expired
                setTimeLeft(0);
                setState('idle');
              }
            } else if (saved.state === 'paused' && typeof saved.pausedRemaining === 'number') {
              setTimeLeft(saved.pausedRemaining);
              pausedRemainingRef.current = saved.pausedRemaining;
              setState('paused');
            } else {
              // idle/default
              setState('idle');
            }
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    // mark hydration/restoration complete so persistence can run safely
    hasRestoredRef.current = true;
    // persist the restored (or default) state now that hydration is done
    try {
      const payload: any = { mode, state, sessions };
      if (state === 'running' && endTimeRef.current) payload.endTime = endTimeRef.current;
      if (state === 'paused' && pausedRemainingRef.current != null) payload.pausedRemaining = pausedRemainingRef.current;
      if (mode === 'stopwatch') {
        payload.stopwatchElapsed = stopwatchTime;
        if (state === 'running') {
          const start = stopwatchStartRef.current ?? Date.now() - stopwatchTime * 1000;
          stopwatchStartRef.current = start;
          payload.stopwatchStart = start;
        }
      }
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
    return () => {
      clearTimer();
      clearStopwatch();
    };
  }, [clearTimer, clearStopwatch]);

  // Persist relevant timer state when changes occur
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      const payload: any = { mode, state, sessions };
      if (state === 'running' && endTimeRef.current) payload.endTime = endTimeRef.current;
      if (state === 'paused' && pausedRemainingRef.current != null) payload.pausedRemaining = pausedRemainingRef.current;
      if (mode === 'stopwatch') {
        payload.stopwatchElapsed = stopwatchTime;
        if (state === 'running') {
          const start = stopwatchStartRef.current ?? Date.now() - stopwatchTime * 1000;
          stopwatchStartRef.current = start;
          payload.stopwatchStart = start;
        }
      }
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [mode, state, sessions, stopwatchTime]);

  // Update timeLeft when durations change (only when idle and not transitioning)
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (transitioningRef.current) return;
    if (state === 'idle') {
      if (mode === 'focus') setTimeLeft(focusDuration);
      else if (mode === 'break') {
        const bDur = sessions > 0 && sessions % longBreakInterval === 0 ? longBreakDuration : breakDuration;
        setTimeLeft(bDur);
      }
    }
  }, [focusDuration, breakDuration, longBreakDuration, longBreakInterval, mode, state, sessions]);

  // Strict mode: detect visibility change
  const focusDurationRef = useRef(focusDuration);
  const breakDurationRef = useRef(breakDuration);
  const longBreakDurationRef = useRef(longBreakDuration);
  const longBreakIntervalRef = useRef(longBreakInterval);
  const sessionsRef = useRef(sessions);
  const modeRef = useRef(mode);

  useEffect(() => { focusDurationRef.current = focusDuration; }, [focusDuration]);
  useEffect(() => { breakDurationRef.current = breakDuration; }, [breakDuration]);
  useEffect(() => { longBreakDurationRef.current = longBreakDuration; }, [longBreakDuration]);
  useEffect(() => { longBreakIntervalRef.current = longBreakInterval; }, [longBreakInterval]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    if (!strictMode || state !== 'running' || mode === 'stopwatch') return;
    const handleVisibility = () => {
      if (document.hidden) {
        // User left the tab - fail the session
        clearTimer();
        clearStopwatch();
        setState('idle');
        const currentMode = modeRef.current;
        if (currentMode === 'focus') {
          setTimeLeft(focusDurationRef.current);
        } else {
          const s = sessionsRef.current;
          const interval = longBreakIntervalRef.current;
          const bDur = s > 0 && s % interval === 0 ? longBreakDurationRef.current : breakDurationRef.current;
          setTimeLeft(bDur);
        }
        setShowStrictFail(true);
        setTimeout(() => setShowStrictFail(false), 3000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [strictMode, state, mode, clearTimer, clearStopwatch]);

  const handleStartPause = () => {
    if (state === 'running') {
      if (strictMode && mode !== 'stopwatch') {
        // In strict mode, pausing during focus = fail
        clearTimer();
        clearStopwatch();
        setState('idle');
        if (mode === 'focus') setTimeLeft(focusDuration);
        else {
          const bDur = sessions > 0 && sessions % longBreakInterval === 0 ? longBreakDuration : breakDuration;
          setTimeLeft(bDur);
        }
        setShowStrictFail(true);
        setTimeout(() => setShowStrictFail(false), 3000);
        try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode, state: 'idle', sessions })); } catch {}
        return;
      }
      // Pause behavior: capture remaining time from endTimeRef for countdowns, or stopwatch elapsed
      if (mode === 'stopwatch') {
        // pause stopwatch
        clearStopwatch();
        setState('paused');
        try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode: 'stopwatch', state: 'paused', stopwatchElapsed: stopwatchTime, sessions })); } catch {}
      } else {
        // countdown pause - compute remaining from endTimeRef if available
        if (endTimeRef.current) {
          const remainingMs = endTimeRef.current - Date.now();
          const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
          pausedRemainingRef.current = remainingSec;
          setTimeLeft(remainingSec);
        } else {
          pausedRemainingRef.current = timeLeft;
        }
        clearTimer();
        setState('paused');
        try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode, state: 'paused', pausedRemaining: pausedRemainingRef.current, sessions })); } catch {}
      }
    } else if (mode === 'stopwatch') {
      // resume stopwatch
      startStopwatch();
    } else {
      // start or resume countdown
      startTimer();
    }
  };

  const handleReset = () => {
    clearTimer();
    clearStopwatch();
    pausedRemainingRef.current = null;
    endTimeRef.current = null;
    setState('idle');
    if (mode === 'stopwatch') {
      setStopwatchTime(0);
    } else if (mode === 'focus') {
      setTimeLeft(focusDuration);
    } else {
      const bDur = sessions > 0 && sessions % longBreakInterval === 0 ? longBreakDuration : breakDuration;
      setTimeLeft(bDur);
    }
    try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode, state: 'idle', sessions })); } catch {}
  };

  const handleSkip = () => {
    if (mode === 'stopwatch') return;
    clearTimer();
    pausedRemainingRef.current = null;
    endTimeRef.current = null;
    setState('idle');
    if (mode === 'focus') {
      setMode('break');
      onModeChange?.(true);
      const bDur = (sessions + 1) % longBreakInterval === 0 ? longBreakDuration : breakDuration;
      setTimeLeft(bDur);
      try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode: 'break', state: 'idle', sessions })); } catch {}
    } else {
      setMode('focus');
      onModeChange?.(false);
      setTimeLeft(focusDuration);
      try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode: 'focus', state: 'idle', sessions })); } catch {}
    }
  };

  const handleModeSwitch = (newMode: TimerMode) => {
    if (newMode === mode) return;
    clearTimer();
    clearStopwatch();
    pausedRemainingRef.current = null;
    endTimeRef.current = null;
    setState('idle');
    setMode(newMode);
    onModeChange?.(newMode === 'break');
    if (newMode === 'focus') {
      setTimeLeft(focusDuration);
    } else if (newMode === 'break') {
      const bDur = sessions % longBreakInterval === 0 && sessions > 0 ? longBreakDuration : breakDuration;
      setTimeLeft(bDur);
    } else {
      setStopwatchTime(0);
    }
    try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ mode: newMode, state: 'idle', sessions })); } catch {}
  };

  const displayTime = mode === 'stopwatch' ? stopwatchTime : timeLeft;
  const hours = Math.floor(displayTime / 3600);
  const minutes = Math.floor((displayTime % 3600) / 60);
  const seconds = displayTime % 60;
  const progress = mode === 'stopwatch' ? 0 : 1 - timeLeft / currentDuration;

  // Circular progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const timeStr = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const modeLabel = mode === 'focus' ? '专注中' : mode === 'break' ? '休息中' : '计时中';
  const isLongBreakNow = mode === 'break' && sessions > 0 && sessions % longBreakInterval === 0;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen select-none">
      {/* Strict mode fail overlay */}
      {showStrictFail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/20 backdrop-blur-sm animate-pulse">
          <div className="bg-red-950/80 border border-red-500/30 rounded-2xl px-8 py-6 text-center">
            <p className="text-red-300/90 text-lg font-light">专注失败</p>
            <p className="text-red-300/50 text-sm font-light mt-1">严格模式下不可离开或暂停</p>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/[0.08]">
        <button
          onClick={() => handleModeSwitch('focus')}
          className={`px-4 py-2 rounded-full text-sm font-light tracking-wider transition-all duration-500 ${
            mode === 'focus'
              ? 'bg-white/[0.1] text-white/90 shadow-lg shadow-cyan-500/5'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          专注
        </button>
        <button
          onClick={() => handleModeSwitch('break')}
          className={`px-4 py-2 rounded-full text-sm font-light tracking-wider transition-all duration-500 ${
            mode === 'break'
              ? 'bg-white/[0.1] text-white/90 shadow-lg shadow-cyan-500/5'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          休息
        </button>
        <button
          onClick={() => handleModeSwitch('stopwatch')}
          className={`px-4 py-2 rounded-full text-sm font-light tracking-wider transition-all duration-500 ${
            mode === 'stopwatch'
              ? 'bg-white/[0.1] text-white/90 shadow-lg shadow-cyan-500/5'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          计时
        </button>
      </div>

      {/* Current task display */}
      {currentTaskName && mode === 'focus' && (
        <div className="mb-4 px-4 py-1.5 rounded-full bg-cyan-400/[0.06] border border-cyan-400/10">
          <p className="text-xs text-cyan-200/50 font-light truncate max-w-[200px]">
            🎯 {currentTaskName}
          </p>
        </div>
      )}

      {/* Timer circle */}
      <div className="relative">
        <svg width="280" height="280" viewBox="0 0 280 280" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="2"
          />
          {/* Progress circle */}
          {mode !== 'stopwatch' && (
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke={mode === 'break' ? 'rgba(100,220,200,0.3)' : 'rgba(100,200,255,0.3)'}
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          )}
          {/* Glow effect */}
          {state === 'running' && mode !== 'stopwatch' && (
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke={mode === 'break' ? 'rgba(100,220,200,0.1)' : 'rgba(100,200,255,0.1)'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear blur-sm"
            />
          )}
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.3em] mb-2">
            {state === 'running' ? modeLabel : state === 'paused' ? '已暂停' : mode === 'stopwatch' ? '正计时' : isLongBreakNow ? '长休息' : modeLabel}
          </p>
          <p className="text-5xl font-extralight text-white/90 tracking-wider font-mono tabular-nums">
            {timeStr}
          </p>
          {mode !== 'stopwatch' && (
            <div className="flex items-center gap-1.5 mt-3">
              {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
                <span key={i} className="text-sm text-cyan-300/50" title="小鱼干">
                  🐟
                </span>
              ))}
              {sessions > 8 && (
                <span className="text-[10px] text-cyan-300/40">+{sessions - 8}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handleReset}
          className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all duration-300"
          title="重置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <button
          onClick={handleStartPause}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
            state === 'running'
              ? 'bg-white/[0.08] border border-white/[0.12] text-white/70 hover:bg-white/[0.12]'
              : 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-300/80 hover:bg-cyan-400/20 shadow-lg shadow-cyan-500/10'
          }`}
        >
          {state === 'running' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="w-10">
          {mode !== 'stopwatch' && (
            <button
              onClick={handleSkip}
              className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all duration-300"
              title="跳过"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Session info */}
      <div className="mt-6 text-center" style={{ height: '40px' }}>
        {mode !== 'stopwatch' && (
          <>
            <p className="text-[10px] text-white/20 font-light tracking-wider">
              第 {sessions + 1} 轮 · 累计 {sessions} 条小鱼干
            </p>
            {isLongBreakNow && mode === 'break' && (
              <p className="text-[10px] text-cyan-300/30 font-light mt-0.5">
                长休息 {Math.floor(longBreakDuration / 60)} 分钟
              </p>
            )}
            {strictMode && state === 'running' && (
              <p className="text-[10px] text-amber-300/30 font-light mt-0.5">
                严格模式 · 离开将作废
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
