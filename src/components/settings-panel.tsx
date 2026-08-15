'use client';

import { useState, useEffect } from 'react';
import type { DeepSeaSettings } from './deep-sea-canvas';

interface SettingsPanelProps {
  settings: DeepSeaSettings;
  onSettingsChange: (settings: DeepSeaSettings) => void;
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  strictMode: boolean;
  soundEnabled: boolean;
  onFocusDurationChange: (seconds: number) => void;
  onBreakDurationChange: (seconds: number) => void;
  onLongBreakDurationChange: (seconds: number) => void;
  onLongBreakIntervalChange: (n: number) => void;
  onStrictModeChange: (v: boolean) => void;
  onSoundEnabledChange: (v: boolean) => void;
}

const COLOR_STYLES: { value: DeepSeaSettings['fishColorStyle']; label: string; desc: string }[] = [
  { value: 'silver', label: '银光', desc: '经典深海银鱼' },
  { value: 'tropical', label: '热带', desc: '多彩热带鱼群' },
  { value: 'bioluminescent', label: '荧光', desc: '幽蓝生物荧光' },
  { value: 'golden', label: '金辉', desc: '温暖金色鱼群' },
];

const PRESET_FOCUS = [
  { label: '15', value: 15 * 60 },
  { label: '25', value: 25 * 60 },
  { label: '30', value: 30 * 60 },
  { label: '45', value: 45 * 60 },
  { label: '60', value: 60 * 60 },
];

const PRESET_BREAK = [
  { label: '3', value: 3 * 60 },
  { label: '5', value: 5 * 60 },
  { label: '10', value: 10 * 60 },
  { label: '15', value: 15 * 60 },
];

const PRESET_LONG_BREAK = [
  { label: '15', value: 15 * 60 },
  { label: '20', value: 20 * 60 },
  { label: '25', value: 25 * 60 },
  { label: '30', value: 30 * 60 },
];

export function SettingsPanel({
  settings,
  onSettingsChange,
  focusDuration,
  breakDuration,
  longBreakDuration,
  longBreakInterval,
  strictMode,
  soundEnabled,
  onFocusDurationChange,
  onBreakDurationChange,
  onLongBreakDurationChange,
  onLongBreakIntervalChange,
  onStrictModeChange,
  onSoundEnabledChange,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const update = <K extends keyof DeepSeaSettings>(key: K, value: DeepSeaSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <>
      {/* Gear button - bottom right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.1] transition-all duration-300 group"
        title="设置"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/40 group-hover:text-white/70 transition-all duration-300"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-[#0a1628]/90 backdrop-blur-xl border-l border-white/[0.06] transform transition-transform duration-500 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          boxShadow: isOpen ? '-20px 0 60px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="p-6 pt-8">
          <h2 className="text-lg font-light text-white/80 tracking-wider mb-8">设置</h2>

          {/* Timer Settings */}
          <Section title="计时设置">
            <div className="space-y-4">
              <div>
                <Label>专注时长（分钟）</Label>
                <div className="flex gap-1.5 mt-2">
                  {PRESET_FOCUS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => onFocusDurationChange(p.value)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-light transition-all duration-300 ${
                        focusDuration === p.value
                          ? 'bg-cyan-500/20 text-cyan-300/80 border border-cyan-500/20'
                          : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>短休息时长（分钟）</Label>
                <div className="flex gap-1.5 mt-2">
                  {PRESET_BREAK.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => onBreakDurationChange(p.value)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-light transition-all duration-300 ${
                        breakDuration === p.value
                          ? 'bg-cyan-500/20 text-cyan-300/80 border border-cyan-500/20'
                          : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>长休息时长（分钟）</Label>
                <div className="flex gap-1.5 mt-2">
                  {PRESET_LONG_BREAK.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => onLongBreakDurationChange(p.value)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-light transition-all duration-300 ${
                        longBreakDuration === p.value
                          ? 'bg-cyan-500/20 text-cyan-300/80 border border-cyan-500/20'
                          : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>长休息间隔（每 N 轮）</Label>
                <div className="flex gap-1.5 mt-2">
                  {[3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => onLongBreakIntervalChange(n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-light transition-all duration-300 ${
                        longBreakInterval === n
                          ? 'bg-cyan-500/20 text-cyan-300/80 border border-cyan-500/20'
                          : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Focus Control */}
          <Section title="专注控制">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>严格模式</Label>
                  <p className="text-[10px] text-white/20 mt-0.5">离开页面或暂停将作废当前番茄</p>
                </div>
                <Toggle checked={strictMode} onChange={onStrictModeChange} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>声音提醒</Label>
                  <p className="text-[10px] text-white/20 mt-0.5">计时结束时播放提示音</p>
                </div>
                <Toggle checked={soundEnabled} onChange={onSoundEnabledChange} />
              </div>
              {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                <button
                  onClick={() => {
                    if ('Notification' in window) {
                      Notification.requestPermission().then(p => setNotifPermission(p));
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs hover:bg-white/[0.08] hover:text-white/60 transition-all"
                >
                  开启系统通知
                </button>
              )}
            </div>
          </Section>

          {/* Fish Settings */}
          <Section title="鱼群设置">
            <div className="space-y-4">
              <SliderControl
                label="数量"
                value={settings.fishCount}
                min={5}
                max={100}
                step={5}
                onChange={(v) => update('fishCount', v)}
                displayValue={`${settings.fishCount}`}
              />
              <SliderControl
                label="速度"
                value={settings.fishSpeed}
                min={0.2}
                max={2.0}
                step={0.1}
                onChange={(v) => update('fishSpeed', v)}
                displayValue={`${Math.round(settings.fishSpeed * 100)}%`}
              />
              <SliderControl
                label="大小"
                value={settings.fishSize}
                min={0.3}
                max={2.0}
                step={0.1}
                onChange={(v) => update('fishSize', v)}
                displayValue={`${Math.round(settings.fishSize * 100)}%`}
              />
              <div>
                <Label>颜色风格</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {COLOR_STYLES.map((cs) => (
                    <button
                      key={cs.value}
                      onClick={() => update('fishColorStyle', cs.value)}
                      className={`py-2 px-3 rounded-lg text-left transition-all duration-300 ${
                        settings.fishColorStyle === cs.value
                          ? 'bg-cyan-500/15 border border-cyan-500/20'
                          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className={`text-xs font-light ${settings.fishColorStyle === cs.value ? 'text-cyan-300/80' : 'text-white/50'}`}>
                        {cs.label}
                      </div>
                      <div className="text-[10px] text-white/25 mt-0.5">{cs.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Environment Settings */}
          <Section title="环境设置">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>气泡</Label>
                <Toggle
                  checked={settings.bubbleEnabled}
                  onChange={(v) => update('bubbleEnabled', v)}
                />
              </div>
              {settings.bubbleEnabled && (
                <SliderControl
                  label="气泡密度"
                  value={settings.bubbleDensity}
                  min={0.2}
                  max={2.0}
                  step={0.1}
                  onChange={(v) => update('bubbleDensity', v)}
                  displayValue={`${Math.round(settings.bubbleDensity * 100)}%`}
                />
              )}
              <SliderControl
                label="海草密度"
                value={settings.seaweedDensity}
                min={0.3}
                max={2.0}
                step={0.1}
                onChange={(v) => update('seaweedDensity', v)}
                displayValue={`${Math.round(settings.seaweedDensity * 100)}%`}
              />
              <SliderControl
                label="阳光强度"
                value={settings.sunRayIntensity}
                min={0}
                max={2.0}
                step={0.1}
                onChange={(v) => update('sunRayIntensity', v)}
                displayValue={`${Math.round(settings.sunRayIntensity * 100)}%`}
              />
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

/* --- Sub-components --- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-light text-white/30 tracking-[0.2em] uppercase mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-light text-white/50">{children}</div>;
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  displayValue: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>{label}</Label>
        <span className="text-[11px] font-light text-white/30 tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(100, 220, 200, 0.4) 0%, rgba(100, 220, 200, 0.4) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.08) 100%)`,
        }}
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-all duration-300 relative ${
        checked ? 'bg-cyan-500/30' : 'bg-white/[0.08]'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
          checked
            ? 'left-[18px] bg-cyan-400/70 shadow-sm shadow-cyan-400/30'
            : 'left-0.5 bg-white/30'
        }`}
      />
    </button>
  );
}
