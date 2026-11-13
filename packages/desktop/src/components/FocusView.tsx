import React, { useState, useEffect } from 'react';
import { TickerSnapshot, UserProfile } from '@salary-ticker/core';
import { RollingNumber } from './RollingNumber';
import { RpgBackgroundCanvas } from './RpgBackgroundCanvas';
import { Minimize2, Eye, EyeOff, Gamepad2, Bot } from 'lucide-react';

interface FocusViewProps {
  snapshot: TickerSnapshot;
  profile: UserProfile;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onExitFocus: () => void;
}

export const FocusView: React.FC<FocusViewProps> = ({
  snapshot,
  isPrivacyMode,
  onTogglePrivacy,
  onExitFocus,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rpgStats, setRpgStats] = useState({
    kills: 0,
    combo: 0,
    level: 1,
    exp: 0,
  });

  // Intercept Escape key: if in manual play mode, return to Auto-Idle first
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlaying) {
        e.stopPropagation();
        setIsPlaying(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isPlaying]);

  // 专注模式严格锁定主要工薪净收入（主要工薪 - 今日负债），排除被动/额外多元现金流
  const currentNet = snapshot.mainLaborEarnedToday - snapshot.dailyDebtCost;

  const isPositive = currentNet >= 0;
  const hourlyRate = snapshot.salaryPerHour || 0;
  const perSecond = (snapshot.salaryPerSecond || 0).toFixed(4);

  const formatMoney = (val: number) => {
    if (isPrivacyMode) return '****';
    const abs = Math.abs(val);
    const sign = val >= 0 ? '+' : '-';
    return `${sign}¥${abs.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* 2D Side-Scrolling RPG Canvas Background (Auto-Idle by default, Click to Play) */}
      <RpgBackgroundCanvas
        isPlaying={isPlaying}
        isWorkingTime={snapshot.isWorkingTime}
        onActivatePlay={() => setIsPlaying(true)}
        onStatsChange={setRpgStats}
      />

      {/* Top-Right Control Bar */}
      <div className="fixed top-5 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? '切回自动挂机' : '接管横版操控'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-800 bg-white/85 hover:bg-white rounded-sm border border-zinc-200/90 shadow-xs backdrop-blur-md transition cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>切回挂机</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-3.5 h-3.5 text-zinc-600" />
              <span>手动操控</span>
            </>
          )}
        </button>

        <button
          onClick={onTogglePrivacy}
          title={isPrivacyMode ? '显示金额' : '隐私模式'}
          className="p-1.5 text-zinc-600 hover:text-zinc-900 bg-white/85 hover:bg-white rounded-sm border border-zinc-200/90 shadow-xs backdrop-blur-md transition cursor-pointer"
        >
          {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <button
          onClick={onExitFocus}
          title="退出专注模式"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white/85 hover:bg-white rounded-sm border border-zinc-200/90 shadow-xs backdrop-blur-md transition cursor-pointer"
        >
          <Minimize2 className="w-3.5 h-3.5 text-zinc-500" />
          <span>退出专注</span>
        </button>
      </div>

      {/* Animated Net Income Card: Centered in Idle Mode -> Scales & Moves to Top-Left in Play Mode */}
      <div
        onClick={e => {
          e.stopPropagation();
          if (isPlaying) setIsPlaying(false);
        }}
        title={isPlaying ? '点击回到居中挂机视图' : undefined}
        className={`fixed z-20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isPlaying
            ? 'top-5 left-6 translate-x-0 translate-y-0 cursor-pointer'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none'
        }`}
      >
        <div
          className={`bg-white/82 backdrop-blur-xl border border-zinc-200/90 rounded-md shadow-lg transition-all duration-500 ${
            isPlaying ? 'px-3.5 py-2.5' : 'px-8 py-6 text-center'
          }`}
        >
          {/* Header Row inside Card */}
          <div
            className={`flex items-center gap-2 text-zinc-500 font-medium ${
              isPlaying ? 'justify-between text-[11px] mb-0.5' : 'justify-center text-xs mb-3'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  snapshot.isWorkingTime ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              <span>今日净收入</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-600 border border-zinc-200">
              {isPlaying ? `Lv.${rpgStats.level} · 斩杀 ${rpgStats.kills}` : `挂机 Lv.${rpgStats.level}`}
            </span>
          </div>

          {/* Rolling Net Amount */}
          <div className={`flex items-baseline ${isPlaying ? 'justify-start' : 'justify-center'}`}>
            <RollingNumber
              value={formatMoney(currentNet)}
              className={`font-bold font-mono tracking-tight transition-all duration-500 ${
                isPlaying
                  ? 'text-2xl sm:text-3xl'
                  : 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl'
              } ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
            />
          </div>

          {/* Subtitle Rate & RPG Status */}
          <div
            className={`flex items-center font-mono text-zinc-500 transition-all duration-500 ${
              isPlaying
                ? 'gap-2 text-[11px] mt-1 pt-1 border-t border-zinc-200/60'
                : 'justify-center gap-3 text-xs sm:text-sm mt-4'
            }`}
          >
            <span>¥{hourlyRate}/时</span>
            <span className="text-zinc-300">·</span>
            <span>+¥{perSecond}/秒</span>
            {rpgStats.combo > 1 && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="text-amber-600 font-bold">{rpgStats.combo} COMBO!</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Interactive Hint Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        {isPlaying ? (
          <div className="flex items-center gap-3 px-3.5 py-1.5 bg-zinc-900/80 text-zinc-100 text-xs font-mono rounded-sm border border-zinc-700 backdrop-blur-md shadow-md animate-in fade-in duration-200">
            <span>
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded-xs text-[10px] mr-1">
                A/D
              </kbd>
              移动
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded-xs text-[10px] mr-1">
                W/Space
              </kbd>
              二段跳
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded-xs text-[10px] mr-1">
                J/点击
              </kbd>
              挥剑连击
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded-xs text-[10px] mr-1">
                K/Shift
              </kbd>
              冲刺
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-600 rounded-xs text-[10px] mr-1">
                Esc
              </kbd>
              切回挂机
            </span>
          </div>
        ) : (
          <div className="px-3 py-1 bg-white/75 text-zinc-600 text-xs font-mono rounded-sm border border-zinc-200/80 backdrop-blur-md shadow-2xs">
            <strong className="text-zinc-900">点击背景任意处</strong> 
          </div>
        )}
      </div>
    </div>
  );
};
