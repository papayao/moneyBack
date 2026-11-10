import React, { useState } from 'react';
import { TickerSnapshot, UserProfile } from '@salary-ticker/core';
import { TrendingDown, TrendingUp, Target, Clock, ShieldAlert, Edit2, Check } from 'lucide-react';
import { RollingNumber } from './RollingNumber';
import { BackgroundBeamsWithCollision } from './ui/background-beams-with-collision';

interface TickerWidgetProps {
  snapshot: TickerSnapshot;
  profile: UserProfile;
  isPrivacyMode: boolean;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export const TickerWidget: React.FC<TickerWidgetProps> = ({
  snapshot,
  profile,
  isPrivacyMode,
  onUpdateProfile,
}) => {
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [editSavingsVal, setEditSavingsVal] = useState(profile.currentSavings.toString());
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTargetVal, setEditTargetVal] = useState(profile.targetSavings.toString());

  const handleSaveSavings = () => {
    const val = parseFloat(editSavingsVal);
    if (!isNaN(val) && onUpdateProfile) {
      onUpdateProfile({ ...profile, currentSavings: val });
    }
    setIsEditingSavings(false);
  };

  const handleSaveTarget = () => {
    const val = parseFloat(editTargetVal);
    if (!isNaN(val) && onUpdateProfile) {
      onUpdateProfile({ ...profile, targetSavings: val });
    }
    setIsEditingTarget(false);
  };

  const handleQuickAdjust = (delta: number) => {
    if (onUpdateProfile) {
      const next = Math.max(0, profile.currentSavings + delta);
      onUpdateProfile({ ...profile, currentSavings: next });
    }
  };
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
      {/* Main Live Net Ticker Card with Collision Beams */}
      <BackgroundBeamsWithCollision isPositive={snapshot.isNetPositive} className="p-6">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span className="uppercase tracking-wider font-medium">今日净收入 (扣除日均负债)</span>
          <span className="font-mono text-zinc-500">
            {snapshot.salaryPerSecond > 0
              ? `${(snapshot.salaryPerSecond * 3600).toFixed(1)} 元/时`
              : '0.0 元/时'}
          </span>
        </div>

        <div className="flex items-baseline gap-3 my-2">
          <RollingNumber
            value={formatMoney(snapshot.netToday, true)}
            className={`text-5xl md:text-6xl font-bold ${
              snapshot.isNetPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          />
          <span className="text-xs text-zinc-500 font-mono">
            {snapshot.isNetPositive ? '已实现今日净盈余' : '正在对冲今日硬性负债'}
          </span>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">今日劳动所得</div>
              <div className="text-sm font-semibold font-mono text-zinc-800">
                <RollingNumber value={formatMoney(snapshot.earnedToday)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-500">今日负债均摊</div>
              <div className="text-sm font-semibold font-mono text-zinc-800">
                <RollingNumber value={formatMoney(snapshot.dailyDebtCost)} />
              </div>
            </div>
          </div>
        </div>
      </BackgroundBeamsWithCollision>

      {/* Live Debt Payoff Progress Card (负债实时消减) */}
      {snapshot.totalDebt > 0 && (
        <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-2.5">
            <div className="flex items-center gap-1.5 text-zinc-800 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>负债实时消减进度 (房贷/车贷/卡债)</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-zinc-500">实时剩余负债:</span>
              <span className="text-rose-600 font-semibold font-mono">
                {isPrivacyMode ? '****' : (
                  <RollingNumber value={`¥${snapshot.totalDebtRemainingLive.toFixed(2)}`} />
                )}
              </span>
            </div>
          </div>

          {/* Payoff Progress Bar */}
          <div className="h-2 w-full bg-zinc-100 border border-zinc-200 rounded-sm overflow-hidden relative">
            <div
              className="h-full bg-rose-500 transition-all duration-300 rounded-sm"
              style={{ width: `${Math.min(100, Math.max(0, snapshot.debtPayoffPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2.5 text-xs text-zinc-500">
            <span className="font-mono">已清偿 {snapshot.debtPayoffPercent}%</span>
            <div className="flex items-center gap-2 font-mono text-xs">
              {snapshot.todayDebtRemainingLive > 0 ? (
                <span className="text-amber-700">
                  今日还差 <strong className="font-bold">¥{snapshot.todayDebtRemainingLive.toFixed(2)}</strong> 负债即归零
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">
                  今日负债已全额平账！
                </span>
              )}
              <span className="text-zinc-300">|</span>
              <span>
                完全还清自由还需{' '}
                <strong className="text-zinc-800 font-semibold">
                  {snapshot.yearsToDebtFree > 0 ? `${snapshot.yearsToDebtFree} 年` : '0 年'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Target Savings Progress Card */}
      <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs">
        <div className="flex items-center justify-between text-xs mb-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 font-medium">
            <Target className="w-3.5 h-3.5 text-zinc-600" />
            <span>存钱目标达成进度</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-zinc-600">
            {/* Current Savings Edit */}
            {isEditingSavings ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={editSavingsVal}
                  onChange={e => setEditSavingsVal(e.target.value)}
                  className="bg-zinc-50 border border-zinc-300 px-1.5 py-0.5 rounded-sm text-xs font-mono text-zinc-900 w-20 focus:outline-none focus:border-zinc-500"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveSavings();
                    if (e.key === 'Escape') setIsEditingSavings(false);
                  }}
                />
                <button
                  onClick={handleSaveSavings}
                  className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm text-[11px] font-sans"
                >
                  确定
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  onClick={() => {
                    setEditSavingsVal(profile.currentSavings.toString());
                    setIsEditingSavings(true);
                  }}
                  title="点击修改已有存款"
                  className="cursor-pointer text-zinc-900 hover:text-black border-b border-dashed border-zinc-300 hover:border-zinc-500 transition font-medium"
                >
                  {isPrivacyMode ? '***' : formatMoney(profile.currentSavings)}
                </span>
                <button
                  onClick={() => {
                    setEditSavingsVal(profile.currentSavings.toString());
                    setIsEditingSavings(true);
                  }}
                  title="修改已有存款"
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            <span className="text-zinc-300">/</span>

            {/* Target Savings Edit */}
            {isEditingTarget ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={editTargetVal}
                  onChange={e => setEditTargetVal(e.target.value)}
                  className="bg-zinc-50 border border-zinc-300 px-1.5 py-0.5 rounded-sm text-xs font-mono text-zinc-900 w-24 focus:outline-none focus:border-zinc-500"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveTarget();
                    if (e.key === 'Escape') setIsEditingTarget(false);
                  }}
                />
                <button
                  onClick={handleSaveTarget}
                  className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm text-[11px] font-sans"
                >
                  确定
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  onClick={() => {
                    setEditTargetVal(profile.targetSavings.toString());
                    setIsEditingTarget(true);
                  }}
                  title="点击修改目标存钱总额"
                  className="cursor-pointer text-zinc-600 hover:text-zinc-900 border-b border-dashed border-zinc-300 hover:border-zinc-500 transition"
                >
                  {isPrivacyMode ? '***' : formatMoney(profile.targetSavings)}
                </span>
                <button
                  onClick={() => {
                    setEditTargetVal(profile.targetSavings.toString());
                    setIsEditingTarget(true);
                  }}
                  title="修改总目标金额"
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick adjustment buttons */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[10px] text-zinc-400">快速变动:</span>
          <button
            onClick={() => handleQuickAdjust(500)}
            className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 rounded-sm text-[10px] font-mono transition"
          >
            +500
          </button>
          <button
            onClick={() => handleQuickAdjust(1000)}
            className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 rounded-sm text-[10px] font-mono transition"
          >
            +1000
          </button>
          <button
            onClick={() => handleQuickAdjust(5000)}
            className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border border-zinc-200 rounded-sm text-[10px] font-mono transition"
          >
            +5000
          </button>
          <button
            onClick={() => handleQuickAdjust(-1000)}
            className="px-1.5 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-rose-600 border border-zinc-200 rounded-sm text-[10px] font-mono transition ml-auto"
          >
            -1000 (支出)
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-zinc-100 border border-zinc-200 rounded-sm overflow-hidden relative">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 rounded-sm"
            style={{ width: `${savingsProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-xs text-zinc-500">
          <span className="font-mono">{savingsProgress.toFixed(1)}% 已完成</span>
          <div className="flex items-center gap-1 font-mono text-zinc-500">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>
              还需打工{' '}
              <strong className="text-zinc-800 font-semibold">
                {snapshot.remainingTimeFormatted}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
