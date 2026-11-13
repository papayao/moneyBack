import React, { useState } from 'react';
import { TickerSnapshot, UserProfile, IncomeSource } from '@salary-ticker/core';
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
  Plus,
  Trash2,
  Gift,
  Building2,
  PiggyBank,
  Users,
  Sparkles,
  Coins,
  X,
  CircleAlert,
} from 'lucide-react';
import { RollingNumber } from './RollingNumber';
import { BackgroundBeamsWithCollision } from './ui/background-beams-with-collision';

interface TickerWidgetProps {
  snapshot: TickerSnapshot;
  profile: UserProfile;
  isPrivacyMode: boolean;
  onUpdateProfile?: (profile: UserProfile) => void;
  incomeSources?: IncomeSource[];
  onAddIncomeSource?: (source: IncomeSource) => void;
  onRemoveIncomeSource?: (id: number) => void;
  onInjectWindfall?: (amount: number, title: string, id: number) => void;
  onToggleFocus?: () => void;
  incomeDisplayMode?: 'main' | 'total';
  onChangeIncomeDisplayMode?: (mode: 'main' | 'total') => void;
}

export const TickerWidget: React.FC<TickerWidgetProps> = ({
  snapshot,
  profile,
  isPrivacyMode,
  onUpdateProfile,
  incomeSources = [],
  onAddIncomeSource,
  onRemoveIncomeSource,
  onInjectWindfall,
  onToggleFocus,
  incomeDisplayMode: controlledMode,
  onChangeIncomeDisplayMode,
}) => {
  const [incomeTab, setIncomeTab] = useState<'streaming' | 'onetime'>('streaming');
  const [showAddModal, setShowAddModal] = useState(false);
  const [localDisplayMode, setLocalDisplayMode] = useState<'main' | 'total'>('main');
  const incomeDisplayMode = controlledMode ?? localDisplayMode;
  const setIncomeDisplayMode = (mode: 'main' | 'total') => {
    setLocalDisplayMode(mode);
    if (onChangeIncomeDisplayMode) onChangeIncomeDisplayMode(mode);
  };

  // New income form states
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<IncomeSource['type']>('partner');
  const [newMode, setNewMode] = useState<'streaming' | 'one_time'>('streaming');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<IncomeSource['frequency']>('monthly');
  const [newWorkDays, setNewWorkDays] = useState('21.75');
  const [newWorkStartTime, setNewWorkStartTime] = useState('09:00');
  const [newWorkEndTime, setNewWorkEndTime] = useState('18:00');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || !onAddIncomeSource) return;

    const hasSchedule = Boolean(newWorkStartTime.trim() && newWorkEndTime.trim());
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    onAddIncomeSource({
      id: Date.now(),
      title: newTitle.trim(),
      type: newType,
      mode: newMode,
      amount: parseFloat(newAmount) || 0,
      frequency: newFrequency,
      workDaysPerMonth: hasSchedule
        ? (parseFloat(newWorkDays) || 21.75)
        : (newWorkDays ? parseFloat(newWorkDays) : 30),
      workStartTime: hasSchedule ? newWorkStartTime : undefined,
      workEndTime: hasSchedule ? newWorkEndTime : undefined,
      status: 'active',
      receivedDate: newMode === 'one_time' ? todayStr : undefined,
    });

    setNewTitle('');
    setNewAmount('');
    setNewWorkDays('21.75');
    setNewWorkStartTime('09:00');
    setNewWorkEndTime('18:00');
    setShowAddModal(false);
  };

  const [isEditingEarnings, setIsEditingEarnings] = useState(false);
  const [editEarningsVal, setEditEarningsVal] = useState((profile.baseLaborEarnings ?? 500000).toString());

  // Overtime modal state
  type OvertimeStep = 'form' | 'ask_pay' | 'ask_comp' | 'rejected';
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeStep, setOvertimeStep] = useState<OvertimeStep>('form');
  const [overtimeHoursInput, setOvertimeHoursInput] = useState('2');
  const [roastIdx, setRoastIdx] = useState(0);

  const OVERTIME_ROASTS = [
    '钱没有、假没有，你在给老板众筹保时捷吗？',
    '用爱发电不计工时，你的发际线已联名抗议！',
    '免费白嫖连系统都看不下去了，立刻关机！',
    '既无碎银几两，又无半日调休，纯属倒贴上班！',
  ];

  const parsedOvertimeHours = Math.max(0, parseFloat(overtimeHoursInput) || 0);
  const estimatedOvertimePay = parsedOvertimeHours * snapshot.salaryPerHour;

  const handleConfirmOvertime = (rewardType: 'paid' | 'comp_leave') => {
    if (!onUpdateProfile || parsedOvertimeHours <= 0) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const prev = profile.todayOvertime;
    const canExtend =
      prev &&
      prev.date === todayStr &&
      prev.rewardType === rewardType &&
      (prev.startSec ?? 0) + Math.round(prev.hours * 3600) > currentSeconds;

    onUpdateProfile({
      ...profile,
      todayOvertime: canExtend
        ? {
            date: todayStr,
            hours: Math.round((prev.hours + parsedOvertimeHours) * 100) / 100,
            rewardType,
            startSec: prev.startSec,
          }
        : {
            date: todayStr,
            hours: parsedOvertimeHours,
            rewardType,
            startSec: currentSeconds,
          },
    });

    setShowOvertimeModal(false);
    setOvertimeStep('form');
  };

  const handleSaveEarnings = () => {
    if (profile.hireDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(editEarningsVal) && onUpdateProfile) {
        onUpdateProfile({ ...profile, hireDate: editEarningsVal });
      }
      setIsEditingEarnings(false);
      return;
    }
    const val = parseFloat(editEarningsVal);
    if (!isNaN(val) && onUpdateProfile) {
      onUpdateProfile({ ...profile, baseLaborEarnings: val });
    }
    setIsEditingEarnings(false);
  };

  const formatMoney = (val: number, forceSign = false) => {
    if (isPrivacyMode) return '****';
    const formatted = Math.abs(val).toFixed(2);
    if (forceSign) {
      return val >= 0 ? `+¥${formatted}` : `-¥${formatted}`;
    }
    return `¥${formatted}`;
  };

  const currentNetValue =
    incomeDisplayMode === 'main'
      ? snapshot.mainLaborEarnedToday - snapshot.dailyDebtCost
      : snapshot.netToday;

  const isCurrentPositive = currentNetValue >= 0;

  const currentHourlyRate =
    incomeDisplayMode === 'main'
      ? snapshot.salaryPerHour
      : Number((snapshot.totalIncomePerSecond * 3600).toFixed(1));

  const currentPerSecondRate =
    incomeDisplayMode === 'main'
      ? snapshot.salaryPerSecond
      : snapshot.totalIncomePerSecond;

  const currentMonthlyIncome =
    incomeDisplayMode === 'main'
      ? profile.monthlySalary
      : snapshot.totalMonthlyIncome;

  const currentTodayEarned =
    incomeDisplayMode === 'main'
      ? snapshot.mainLaborEarnedToday
      : snapshot.earnedToday;

  return (
    <div className="space-y-4">
      {/* Main Live Net Ticker Card with Collision Beams & Separated Main Salary vs Passive Flows */}
      <BackgroundBeamsWithCollision isPositive={isCurrentPositive} className="p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
          {/* Main Column: Hero Net Ticker & Salary Block (在主要收入模式下独占全宽，界面极为干净) */}
          <div className={`${incomeDisplayMode === 'main' ? 'lg:col-span-12 space-y-4' : 'lg:col-span-6 flex flex-col justify-between space-y-4'}`}>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-800">今日净收入</span>
                  <div className="flex bg-zinc-200/70 p-0.5 rounded-xs text-[10px]">
                    <button
                      onClick={() => setIncomeDisplayMode('main')}
                      className={`px-1.5 py-0.5 rounded-xs transition font-medium cursor-pointer ${
                        incomeDisplayMode === 'main'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      主要收入
                    </button>
                    <button
                      onClick={() => setIncomeDisplayMode('total')}
                      className={`px-1.5 py-0.5 rounded-xs transition font-medium cursor-pointer ${
                        incomeDisplayMode === 'total'
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      总收入
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-zinc-500">
                    ¥{currentHourlyRate}/时
                  </span>
                  {onToggleFocus && (
                    <button
                      onClick={onToggleFocus}
                      title="进入沉浸专注模式"
                      className="focus-pixel-btn inline-flex items-center px-2.5 py-1 text-xs font-medium cursor-pointer"
                    >
                      <span className="focus-pixel-label">专注模式</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 my-1">
                <RollingNumber
                  value={formatMoney(currentNetValue, true)}
                  className={`text-4xl md:text-5xl font-bold ${
                    isCurrentPositive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />

                {/* Exclamation tooltip */}
                <div className="group/tooltip relative inline-flex items-center self-center cursor-help">
                  <CircleAlert className="w-4 h-4 text-zinc-400 hover:text-zinc-700 transition" />
                  <div className="pointer-events-none absolute left-0 sm:left-full sm:ml-2 bottom-full sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 mb-1.5 sm:mb-0 z-50 hidden group-hover/tooltip:flex flex-col w-52 p-2 bg-zinc-900 text-white text-xs rounded-sm shadow-md font-sans">
                    <span className="font-semibold text-zinc-100">净收入 = 今日收入 - 今日负债</span>
                    <span className="text-[11px] text-zinc-300 mt-0.5 leading-tight">
                      按秒实时扣除今日均摊应还负债后的净到手所得。
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Income Unit Card (主要工薪 vs 全部收入) */}
            <div className="bg-white/90 border border-zinc-200/90 rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-zinc-100">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-700" />
                  <span>{incomeDisplayMode === 'main' ? '主要收入' : '总收入'}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {incomeDisplayMode === 'main' ? `${profile.workDaysPerMonth}天/月` : '多元现金流'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">
                    时薪 <strong className="text-zinc-800 font-mono">¥{currentHourlyRate}</strong>
                    <span className="text-zinc-400 text-[10px] ml-1">(+¥{currentPerSecondRate.toFixed(3)}/秒)</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    月入: ¥{Math.round(currentMonthlyIncome).toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">
                    {profile.hireDate
                      ? `总所得 · 入职第${snapshot.tenureDays}天 · 计薪${snapshot.tenurePaidDays}天`
                      : '总所得 · 主要收入'}
                  </div>
                  {isEditingEarnings ? (
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <input
                        type={profile.hireDate ? 'date' : 'number'}
                        value={editEarningsVal}
                        onChange={e => setEditEarningsVal(e.target.value)}
                        className="px-1.5 py-0.5 rounded-sm text-xs font-mono text-zinc-900 w-32"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEarnings();
                          if (e.key === 'Escape') setIsEditingEarnings(false);
                        }}
                      />
                      <button
                        onClick={handleSaveEarnings}
                        className="px-1.5 py-0.5 bg-zinc-900 text-white rounded-sm text-[10px]"
                      >
                        确定
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditEarningsVal(
                          profile.hireDate ?? (profile.baseLaborEarnings ?? 500000).toString()
                        );
                        setIsEditingEarnings(true);
                      }}
                      className="group relative inline-flex items-center cursor-pointer mb-1"
                      title={
                        profile.hireDate
                          ? `点击修改入职日期（当前 ${profile.hireDate}）`
                          : `点击调整历史基准（当前 ¥${(profile.baseLaborEarnings ?? 500000).toLocaleString()}）`
                      }
                    >
                      <Edit2 className="w-3 h-3 text-zinc-300 opacity-0 group-hover:opacity-100 group-hover:text-zinc-600 transition absolute -left-4 pointer-events-none" />
                      <span className="text-sm font-bold font-mono text-zinc-900">
                        <RollingNumber value={formatMoney(snapshot.totalLaborEarningsLive)} />
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] text-zinc-400">
                    {incomeDisplayMode === 'main' ? '今日工薪' : '今日总入账'}
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-700">
                    <RollingNumber value={formatMoney(currentTodayEarned)} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-sm inline-block font-sans ${
                        snapshot.isOvertimeActive
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : snapshot.isWorkingTime
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                    >
                      {snapshot.isOvertimeActive
                        ? snapshot.overtimeRewardType === 'paid'
                          ? `加班计薪中 ${snapshot.overtimeRemainingFormatted ?? ''}`
                          : `调休加班中 ${snapshot.overtimeRemainingFormatted ?? ''}`
                        : snapshot.isWorkingTime
                          ? '工作中'
                          : snapshot.isBeforeWork
                            ? '未上班'
                            : '已下班'}
                    </span>

                    {snapshot.isAfterWork && onUpdateProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setOvertimeHoursInput('2');
                          setOvertimeStep('form');
                          setShowOvertimeModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-sm transition cursor-pointer"
                        title="下班后申请加班计时"
                      >
                        <Clock className="w-2.5 h-2.5 text-zinc-500" />
                        <span>{snapshot.isOvertimeActive ? '续加' : '加班'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Net Balance Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 text-xs">
              <div className="flex items-start gap-2.5 p-2 bg-zinc-50/70 rounded-sm border border-zinc-200/60">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <div className="text-[10px] text-zinc-400 leading-tight">
                    {incomeDisplayMode === 'main' ? '今日工薪' : '今日总收益'}
                  </div>
                  <div className="text-xs font-semibold font-mono text-zinc-800 leading-normal mt-0.5">
                    <RollingNumber
                      value={formatMoney(
                        incomeDisplayMode === 'main'
                          ? snapshot.mainLaborEarnedToday
                          : snapshot.earnedToday
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-zinc-50/70 rounded-sm border border-zinc-200/60">
                <TrendingDown
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    currentTodayEarned > snapshot.dailyDebtCost && snapshot.dailyDebtCost > 0
                      ? 'text-zinc-400'
                      : 'text-rose-600'
                  }`}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 leading-tight">
                    <span>今日负债</span>
                    {currentTodayEarned > snapshot.dailyDebtCost && snapshot.dailyDebtCost > 0 && (
                      <span className="text-[9px] text-emerald-600 font-medium">已还清</span>
                    )}
                  </div>
                  <div
                    className={`relative inline-flex items-center self-start text-xs font-semibold font-mono leading-normal mt-0.5 ${
                      currentTodayEarned > snapshot.dailyDebtCost && snapshot.dailyDebtCost > 0
                        ? 'text-zinc-400'
                        : 'text-zinc-800'
                    }`}
                  >
                    <RollingNumber value={formatMoney(snapshot.dailyDebtCost)} />
                    {currentTodayEarned > snapshot.dailyDebtCost && snapshot.dailyDebtCost > 0 && (
                      <span className="absolute -inset-x-0.5 top-1/2 -translate-y-1/2 h-[1.5px] bg-zinc-400 pointer-events-none" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 仅在切换为【总收入】模式时展示额外收入列表，主要收入界面保持完全干净 */}
          {incomeDisplayMode === 'total' && (
            <div className="lg:col-span-6 bg-zinc-50/90 border border-zinc-200/90 rounded-sm p-3 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-zinc-200/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-800">额外收入</span>
                    <div className="flex bg-zinc-200/70 p-0.5 rounded-xs text-[10px]">
                      <button
                        onClick={() => setIncomeTab('streaming')}
                        className={`px-1.5 py-0.5 rounded-xs transition font-medium ${
                          incomeTab === 'streaming'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        按秒流式 ({snapshot.streamingIncomeItems?.length || 0})
                      </button>
                      <button
                        onClick={() => setIncomeTab('onetime')}
                        className={`px-1.5 py-0.5 rounded-xs transition font-medium ${
                          incomeTab === 'onetime'
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        一次性奖金 ({snapshot.oneTimeIncomes?.length || 0})
                      </button>
                    </div>
                  </div>

                  {/* Top Right Add Button */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 rounded-sm border border-zinc-200 shadow-2xs transition font-medium cursor-pointer"
                    title="添加新收入项"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-600" />
                    <span>添加</span>
                  </button>
                </div>

                {/* Streaming Additional Items Tab */}
                {incomeTab === 'streaming' && (
                  (!snapshot.streamingIncomeItems || snapshot.streamingIncomeItems.length === 0) ? (
                    <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-sm">
                      暂无流式现金流，点击右上角【添加】录入
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs font-mono">
                      {snapshot.streamingIncomeItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 bg-white border border-zinc-200/80 rounded-sm hover:border-zinc-300 transition group"
                        >
                          <div className="truncate max-w-[170px]">
                            <div className="text-[11px] font-sans font-medium text-zinc-800 truncate flex items-center gap-1.5">
                              <span title={item.title}>{item.title}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded-sm font-mono flex items-center gap-1 ${
                                item.is24x7
                                  ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                  : item.isCurrentlyActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                {item.isCurrentlyActive && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>}
                                {item.is24x7 ? '30天·24h' : `${item.workDaysPerMonth || 21.75}天·${item.workStartTime || '09:00'}-${item.workEndTime || '18:00'}`}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              今日已入: <strong className="text-zinc-600">+¥{item.todayEarned.toFixed(2)}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-emerald-700 font-semibold text-xs font-mono">
                                +¥{item.ratePerSecond.toFixed(4)}
                              </span>
                              <span className="text-[10px] text-zinc-400 block font-sans">
                                /秒 · ¥{item.amount.toLocaleString()}/{item.frequency === 'annual' ? '年' : '月'}
                              </span>
                            </div>
                            {onRemoveIncomeSource && (
                              <button
                                onClick={() => onRemoveIncomeSource(item.id)}
                                className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-rose-600 p-1 transition rounded-xs"
                                title="删除此收入项"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* One-time Bonus Tab */}
                {incomeTab === 'onetime' && (
                  (!snapshot.oneTimeIncomes || snapshot.oneTimeIncomes.length === 0) ? (
                    <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-sm">
                      暂无一次性奖金项，点击右上角【添加】录入年终奖或退税
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
                      {snapshot.oneTimeIncomes.map(item => {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        const isToday = !item.receivedDate || item.receivedDate === todayStr;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-white border border-zinc-200/80 rounded-sm hover:border-zinc-300 transition group"
                          >
                            <div>
                              <div className="text-[11px] font-sans font-medium text-zinc-800 flex items-center gap-1.5">
                                <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{item.title}</span>
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded-sm font-mono border ${
                                    isToday
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                  }`}
                                >
                                  {isToday ? '已计入今日总收入' : `入账于 ${item.receivedDate}`}
                                </span>
                              </div>
                              <div className="text-xs font-mono font-semibold text-emerald-700 mt-0.5">
                                +¥{item.amount.toLocaleString()}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {onRemoveIncomeSource && (
                                <button
                                  onClick={() => onRemoveIncomeSource(item.id!)}
                                  className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-rose-600 p-1 transition cursor-pointer"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Bottom summary banner */}
              <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-sm border border-zinc-200/70 text-zinc-600">
                <span>今日额外收入合计 (流式 + 今日一次性):</span>
                <span className="font-semibold font-mono text-emerald-700">
                  +¥{snapshot.additionalIncomeToday.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </BackgroundBeamsWithCollision>


      {/* Add Income Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-md w-full max-w-md shadow-xl text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-semibold text-zinc-900">添加额外收入项</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">收入性质</label>
                  <select
                    value={newMode}
                    onChange={e => {
                      const m = e.target.value as 'streaming' | 'one_time';
                      setNewMode(m);
                      if (m === 'one_time') {
                        setNewType('bonus');
                        setNewFrequency('once');
                      } else {
                        setNewType('partner');
                        setNewFrequency('monthly');
                        setNewWorkDays((profile.workDaysPerMonth || 21.75).toString());
                        setNewWorkStartTime(profile.workStartTime || '09:00');
                        setNewWorkEndTime(profile.workEndTime || '18:00');
                      }
                    }}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-sm px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="streaming">持续收入 (按秒计费)</option>
                    <option value="one_time">一次性奖金</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-600 mb-1">收入分类</label>
                  <select
                    value={newType}
                    onChange={e => {
                      const t = e.target.value as IncomeSource['type'];
                      setNewType(t);
                      if (t === 'partner' || t === 'side_hustle') {
                        setNewWorkDays((profile.workDaysPerMonth || 21.75).toString());
                        setNewWorkStartTime(profile.workStartTime || '09:00');
                        setNewWorkEndTime(profile.workEndTime || '18:00');
                      } else if (t === 'rent' || t === 'interest') {
                        setNewWorkDays('30');
                        setNewWorkStartTime('');
                        setNewWorkEndTime('');
                      }
                    }}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-sm px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="partner">配偶工薪 (按上下班计费)</option>
                    <option value="rent">被动房租 (全天候)</option>
                    <option value="interest">理财 / 利息收益 (全天候)</option>
                    <option value="bonus">年终奖 / 季度奖</option>
                    <option value="windfall">退税 / 偶然所得</option>
                    <option value="side_hustle">副业工薪 (按上下班计费)</option>
                    <option value="custom">其他自定义</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">收入名称</label>
                  <input
                    type="text"
                    placeholder="例如：妻子月薪 / 投资房租"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-sm px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">金额 (元)</label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-sm px-2.5 py-1.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
              </div>

              {newMode === 'streaming' && (
                <div className="p-2.5 bg-zinc-50/80 border border-zinc-200 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      <span>工时设置 (选填：未填则默认 30 天全天候)</span>
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">未填按30天24h进账</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-0.5">月计费天数 (天)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="默认 30"
                        value={newWorkDays}
                        onChange={e => setNewWorkDays(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-0.5">上班时间</label>
                      <input
                        type="time"
                        value={newWorkStartTime}
                        onChange={e => setNewWorkStartTime(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-0.5">下班时间</label>
                      <input
                        type="time"
                        value={newWorkEndTime}
                        onChange={e => setNewWorkEndTime(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-500 leading-relaxed">
                    💡 提示：未填上下班时间默认每月 30 天 24 小时全天候进账（如房租、利息）；填写上下班时间则按工作时段与天数流式计费（如配偶工薪、副业）。
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-sm cursor-pointer"
                >
                  保存收入项
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Overtime Flow Modal */}
      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-md w-full max-w-sm shadow-xl overflow-hidden text-zinc-900">
            <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-semibold text-zinc-900">
                  {overtimeStep === 'form' && '下班还加？'}
                  {overtimeStep === 'ask_pay' && '灵魂一问'}
                  {overtimeStep === 'ask_comp' && '给爷整笑了'}
                  {overtimeStep === 'rejected' && '卷尼玛呢，下班！'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOvertimeModal(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {overtimeStep === 'form' && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (parsedOvertimeHours <= 0) return;
                  setOvertimeStep('ask_pay');
                }}
                className="p-4 space-y-3.5"
              >
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">加班几小时</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      value={overtimeHoursInput}
                      onChange={e => setOvertimeHoursInput(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-300 rounded-sm px-2.5 py-1.5 text-sm font-mono text-zinc-900 focus:outline-none focus:border-zinc-500"
                      required
                      autoFocus
                    />
                    <span className="text-xs text-zinc-500">小时</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {['1', '1.5', '2', '3'].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setOvertimeHoursInput(h)}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded-sm border transition cursor-pointer ${
                          overtimeHoursInput === h
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-zinc-500">预计收益</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      ¥{snapshot.salaryPerHour}/时 × {parsedOvertimeHours}h
                    </div>
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-700">
                    {isPrivacyMode ? '****' : `+¥${estimatedOvertimePay.toFixed(2)}`}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowOvertimeModal(false)}
                    className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                  >
                    算了
                  </button>
                  <button
                    type="submit"
                    disabled={parsedOvertimeHours <= 0}
                    className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-medium rounded-sm cursor-pointer"
                  >
                    确认
                  </button>
                </div>
              </form>
            )}

            {overtimeStep === 'ask_pay' && (
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-zinc-900">有加班费吗？</div>
                  <div className="text-xs text-zinc-500">
                    不画大饼，工资条里真金白银加钱的那种（{parsedOvertimeHours}h ≈ {isPrivacyMode ? '****' : `¥${estimatedOvertimePay.toFixed(2)}`}）
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOvertimeStep('ask_comp')}
                    className="px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-sm transition cursor-pointer"
                  >
                    没有
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmOvertime('paid')}
                    className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-sm transition cursor-pointer"
                  >
                    有，给钱
                  </button>
                </div>
              </div>
            )}

            {overtimeStep === 'ask_comp' && (
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-zinc-900">那有调休吗？</div>
                  <div className="text-xs text-zinc-500">
                    没钱总得给个假，再没有就不值得留了
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRoastIdx(Math.floor(Math.random() * OVERTIME_ROASTS.length));
                      setOvertimeStep('rejected');
                    }}
                    className="px-3 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-sm transition cursor-pointer"
                  >
                    也没有
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmOvertime('comp_leave')}
                    className="px-3 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-sm transition cursor-pointer"
                  >
                    有调休
                  </button>
                </div>
              </div>
            )}

            {overtimeStep === 'rejected' && (
              <div className="p-4 space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-sm text-center space-y-2">
                  <div className="text-base font-bold text-rose-700">
                    啥都没有，加个鸡毛，下班！
                  </div>
                  <div className="text-xs text-rose-600/90">
                    {OVERTIME_ROASTS[roastIdx]}
                  </div>
                  <div className="text-xs font-medium text-rose-700 pt-1.5 border-t border-rose-200/70">
                    需要我告诉你劳动局电话号码吗？
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOvertimeModal(false)}
                  className="w-full py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-sm transition cursor-pointer"
                >
                  干鸡毛，下班！
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
