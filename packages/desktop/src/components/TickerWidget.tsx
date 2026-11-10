import React from 'react';
import { TickerSnapshot, UserProfile } from '@salary-ticker/core';
import { TrendingDown, TrendingUp, Target, Clock } from 'lucide-react';
import { RollingNumber } from './RollingNumber';

interface TickerWidgetProps {
  snapshot: TickerSnapshot;
  profile: UserProfile;
  isPrivacyMode: boolean;
}

export const TickerWidget: React.FC<TickerWidgetProps> = ({
  snapshot,
  profile,
  isPrivacyMode,
}) => {
  const formatMoney = (val: number, forceSign = false) => {
    if (isPrivacyMode) return '****';
    const formatted = Math.abs(val).toFixed(2);
    if (forceSign) {
      return val >= 0 ? `+¥${formatted}` : `-¥${formatted}`;
    }
    return `¥${formatted}`;
  };

  const savingsProgress =
    profile.targetSavings > 0
      ? Math.min(100, Math.max(0, (profile.currentSavings / profile.targetSavings) * 100))
      : 0;

  return (
    <div className="space-y-4">
      {/* Main Live Net Ticker Card */}
      <div className="border border-zinc-800 bg-zinc-900/60 p-6 rounded-md relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className="uppercase tracking-wider font-medium">今日净收入 (扣除日均负债)</span>
          <span className="font-mono text-zinc-400">
            {snapshot.salaryPerSecond > 0
              ? `${(snapshot.salaryPerSecond * 3600).toFixed(1)} 元/时`
              : '0.0 元/时'}
          </span>
        </div>

        <div className="flex items-baseline gap-3 my-2">
          <RollingNumber
            value={formatMoney(snapshot.netToday, true)}
            className={`text-5xl md:text-6xl font-bold ${
              snapshot.isNetPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          />
          <span className="text-xs text-zinc-400 font-mono">
            {snapshot.isNetPositive ? '已实现今日净盈余' : '正在对冲今日硬性负债'}
          </span>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">今日劳动所得</div>
              <div className="text-sm font-semibold font-mono text-zinc-200">
                <RollingNumber value={formatMoney(snapshot.earnedToday)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-rose-950/40 border border-rose-900/50 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">今日负债均摊</div>
              <div className="text-sm font-semibold font-mono text-zinc-200">
                <RollingNumber value={formatMoney(snapshot.dailyDebtCost)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Savings Progress Card */}
      <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-md">
        <div className="flex items-center justify-between text-xs mb-2.5">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <Target className="w-3.5 h-3.5 text-zinc-400" />
            <span>存钱目标达成进度</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-zinc-400">
            <span>{isPrivacyMode ? '***' : formatMoney(profile.currentSavings)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">{isPrivacyMode ? '***' : formatMoney(profile.targetSavings)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden relative">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-sm"
            style={{ width: `${savingsProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-xs text-zinc-400">
          <span className="font-mono">{savingsProgress.toFixed(1)}% 已完成</span>
          <div className="flex items-center gap-1 font-mono text-zinc-400">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>
              还需打工{' '}
              <strong className="text-zinc-200 font-semibold">
                {snapshot.remainingTimeFormatted}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
