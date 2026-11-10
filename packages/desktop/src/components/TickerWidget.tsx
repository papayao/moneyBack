import React, { useState } from 'react';
import { TickerSnapshot, UserProfile } from '@salary-ticker/core';
import {
  TrendingDown,
  TrendingUp,
  Target,
  Clock,
  ShieldAlert,
  Edit2,
  Check,
  Briefcase,
  Receipt,
} from 'lucide-react';
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
  const [isEditingEarnings, setIsEditingEarnings] = useState(false);
  const [editEarningsVal, setEditEarningsVal] = useState((profile.baseLaborEarnings ?? 500000).toString());
  const [isEditingLiving, setIsEditingLiving] = useState(false);
  const [editLivingVal, setEditLivingVal] = useState(snapshot.totalLivingExpenses.toString());

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

  const handleSaveEarnings = () => {
    const val = parseFloat(editEarningsVal);
    if (!isNaN(val) && onUpdateProfile) {
      onUpdateProfile({ ...profile, baseLaborEarnings: val });
    }
    setIsEditingEarnings(false);
  };

  const handleSaveLiving = () => {
    const val = parseFloat(editLivingVal);
    if (!isNaN(val) && onUpdateProfile) {
      onUpdateProfile({ ...profile, baseLivingExpense: val });
    }
    setIsEditingLiving(false);
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
      {/* Main Live Net Ticker Card with Collision Beams & Multi-source Streaming List */}
      <BackgroundBeamsWithCollision isPositive={snapshot.isNetPositive} className="p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
          {/* Left Column: Hero Net Ticker */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span className="uppercase tracking-wider font-medium">今日净收入 (扣除日均负债)</span>
                <span className="font-mono text-zinc-500">
                  {snapshot.totalIncomePerSecond > 0
                    ? `综合时薪：${(snapshot.totalIncomePerSecond * 3600).toFixed(1)} 元/时`
                    : '0.0 元/时'}
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <RollingNumber
                  value={formatMoney(snapshot.netToday, true)}
                  className={`text-4xl md:text-5xl font-bold ${
                    snapshot.isNetPositive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
              </div>

              <div className="text-xs text-zinc-500 font-mono mt-1">
                {snapshot.isNetPositive ? '已实现今日净盈余' : '正在对冲今日硬性负债'}
              </div>
            </div>

            {/* Breakdown Row */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-sm bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">今日总收益</div>
                  <div className="text-xs font-semibold font-mono text-zinc-800">
                    <RollingNumber value={formatMoney(snapshot.earnedToday)} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-sm bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">今日负债均摊</div>
                  <div className="text-xs font-semibold font-mono text-zinc-800">
                    <RollingNumber value={formatMoney(snapshot.dailyDebtCost)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Source Streaming Income (按秒计费列表) */}
          <div className="lg:col-span-5 bg-zinc-50/90 border border-zinc-200/90 rounded-sm p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] border-b border-zinc-200/60 pb-1.5">
              <span className="font-semibold text-zinc-800">多元流式收入 (按秒持续计费)</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-sm border border-emerald-200">
                {(snapshot.streamingIncomeItems?.length || 0) + 1} 个实时来源
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
              {/* Main Salary Item */}
              <div className="flex items-center justify-between p-1.5 bg-white border border-zinc-200/80 rounded-sm">
                <div>
                  <div className="text-[11px] font-sans font-medium text-zinc-800 flex items-center gap-1">
                    <span>主业工薪</span>
                    <span className="text-[10px] text-zinc-400">¥{profile.monthlySalary.toLocaleString()}/月</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">今日已计: +¥{(snapshot.hoursWorkedToday * snapshot.salaryPerSecond * 3600).toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-700 font-semibold text-xs">
                    +¥{snapshot.salaryPerSecond.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-zinc-400 block font-sans">/秒</span>
                </div>
              </div>

              {/* Streaming Additional Items (Spouse, Rent, Interest, Side Hustle) */}
              {snapshot.streamingIncomeItems?.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-1.5 bg-white border border-zinc-200/80 rounded-sm"
                >
                  <div className="truncate max-w-[140px]">
                    <div className="text-[11px] font-sans font-medium text-zinc-800 truncate" title={item.title}>
                      {item.title}
                    </div>
                    <div className="text-[10px] text-zinc-500">今日已计: +¥{item.todayEarned.toFixed(2)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-700 font-semibold text-xs">
                      +¥{item.ratePerSecond.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-sans">/秒</span>
                  </div>
                </div>
              ))}
            </div>

            {/* One-time windfall notice if present */}
            {snapshot.oneTimeIncomes && snapshot.oneTimeIncomes.length > 0 && (
              <div className="text-[10px] text-zinc-500 bg-amber-50/70 border border-amber-200 p-1.5 rounded-sm flex items-center justify-between">
                <span>包含 {snapshot.oneTimeIncomes.length} 笔年终奖/项目奖金项</span>
                <span className="text-amber-800 font-sans">可在下方管理注入</span>
              </div>
            )}
          </div>
        </div>
      </BackgroundBeamsWithCollision>

      {/* Total Career Earnings & Total Lifetime Expenses (含负债) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: 总劳动所得 */}
        <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-zinc-600" />
                <span>总劳动与多元所得 (累计)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-600 border border-zinc-200">
                秒级递增中
              </span>
            </div>

            {isEditingEarnings ? (
              <div className="flex items-center gap-1.5 my-1">
                <input
                  type="number"
                  value={editEarningsVal}
                  onChange={e => setEditEarningsVal(e.target.value)}
                  className="bg-zinc-50 border border-zinc-300 px-2 py-1 rounded-sm text-sm font-mono text-zinc-900 w-32 focus:outline-none focus:border-zinc-500"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEarnings();
                    if (e.key === 'Escape') setIsEditingEarnings(false);
                  }}
                />
                <button
                  onClick={handleSaveEarnings}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm text-xs font-sans"
                >
                  确定
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setEditEarningsVal((profile.baseLaborEarnings ?? 500000).toString());
                  setIsEditingEarnings(true);
                }}
                className="group flex items-baseline gap-1.5 cursor-pointer py-1"
                title="点击调整历史累计劳动所得基准值"
              >
                <div className="text-2xl font-bold font-mono text-zinc-900 group-hover:text-zinc-700 transition">
                  <RollingNumber value={formatMoney(snapshot.totalLaborEarningsLive)} />
                </div>
                <Edit2 className="w-3 h-3 text-zinc-300 group-hover:text-zinc-600 transition" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
            <span>基准所得: ¥{(profile.baseLaborEarnings ?? 500000).toLocaleString()}</span>
            <span className="text-emerald-700 font-mono font-medium">
              今日贡献 +¥{snapshot.earnedToday.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: 总花费 (含负债) */}
        <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
                <Receipt className="w-3.5 h-3.5 text-zinc-600" />
                <span>总花费 (含生活与全部负债)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
                含负债支出
              </span>
            </div>

            {isEditingLiving ? (
              <div className="flex items-center gap-1.5 my-1">
                <input
                  type="number"
                  value={editLivingVal}
                  onChange={e => setEditLivingVal(e.target.value)}
                  className="bg-zinc-50 border border-zinc-300 px-2 py-1 rounded-sm text-sm font-mono text-zinc-900 w-32 focus:outline-none focus:border-zinc-500"
                  autoFocus
                  placeholder="生活开销基准"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveLiving();
                    if (e.key === 'Escape') setIsEditingLiving(false);
                  }}
                />
                <button
                  onClick={handleSaveLiving}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm text-xs font-sans"
                >
                  确定
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setEditLivingVal(snapshot.totalLivingExpenses.toString());
                  setIsEditingLiving(true);
                }}
                className="group flex items-baseline gap-1.5 cursor-pointer py-1"
                title="点击微调生活消费基准 (负债部分自动计算)"
              >
                <div className="text-2xl font-bold font-mono text-zinc-900 group-hover:text-zinc-700 transition">
                  <RollingNumber value={formatMoney(snapshot.totalExpensesLive)} />
                </div>
                <Edit2 className="w-3 h-3 text-zinc-300 group-hover:text-zinc-600 transition" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
            <span>生活消费: ¥{snapshot.totalLivingExpenses.toLocaleString()}</span>
            <span className="text-rose-600 font-mono font-medium">
              负债总额: ¥{snapshot.totalDebt.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

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
