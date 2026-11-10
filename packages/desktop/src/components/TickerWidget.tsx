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
  onToggleAmortize?: (id: number) => void;
  onInjectWindfall?: (amount: number, title: string, id: number) => void;
}

export const TickerWidget: React.FC<TickerWidgetProps> = ({
  snapshot,
  profile,
  isPrivacyMode,
  onUpdateProfile,
  incomeSources = [],
  onAddIncomeSource,
  onRemoveIncomeSource,
  onToggleAmortize,
  onInjectWindfall,
}) => {
  const [incomeTab, setIncomeTab] = useState<'streaming' | 'onetime'>('streaming');
  const [showAddModal, setShowAddModal] = useState(false);

  // New income form states
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<IncomeSource['type']>('partner');
  const [newMode, setNewMode] = useState<'streaming' | 'one_time'>('streaming');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<IncomeSource['frequency']>('monthly');
  const [newIsAmortized, setNewIsAmortized] = useState(false);
  const [newWorkDays, setNewWorkDays] = useState('21.75');
  const [newWorkStartTime, setNewWorkStartTime] = useState('09:00');
  const [newWorkEndTime, setNewWorkEndTime] = useState('18:00');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || !onAddIncomeSource) return;

    const hasSchedule = Boolean(newWorkStartTime.trim() && newWorkEndTime.trim());

    onAddIncomeSource({
      id: Date.now(),
      title: newTitle.trim(),
      type: newType,
      mode: newMode,
      amount: parseFloat(newAmount) || 0,
      frequency: newFrequency,
      isAmortized: newMode === 'one_time' ? newIsAmortized : undefined,
      workDaysPerMonth: hasSchedule
        ? (parseFloat(newWorkDays) || 21.75)
        : (newWorkDays ? parseFloat(newWorkDays) : 30),
      workStartTime: hasSchedule ? newWorkStartTime : undefined,
      workEndTime: hasSchedule ? newWorkEndTime : undefined,
      status: 'active',
    });

    setNewTitle('');
    setNewAmount('');
    setNewWorkDays('21.75');
    setNewWorkStartTime('09:00');
    setNewWorkEndTime('18:00');
    setShowAddModal(false);
  };

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
      {/* Main Live Net Ticker Card with Collision Beams & Separated Main Salary vs Passive Flows */}
      <BackgroundBeamsWithCollision isPositive={snapshot.isNetPositive} className="p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
          {/* Left Column: Hero Net Ticker & Isolated Labor Salary Block */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span className="uppercase tracking-wider font-medium">今日净收入 (扣除日均负债)</span>
                <span className="font-mono text-zinc-500">
                  {snapshot.totalIncomePerSecond > 0
                    ? `综合时薪：${(snapshot.totalIncomePerSecond * 3600).toFixed(1)} 元/时`
                    : '0.0 元/时'}
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-1">
                <RollingNumber
                  value={formatMoney(snapshot.netToday, true)}
                  className={`text-4xl md:text-5xl font-bold ${
                    snapshot.isNetPositive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
              </div>

              <div className="text-xs text-zinc-500 font-mono">
                {snapshot.isNetPositive ? '已实现今日净盈余' : '正在对冲今日硬性负债'}
              </div>
            </div>

            {/* Isolated Labor Salary Unit (单独提出来的主业工薪) */}
            <div className="bg-white/90 border border-zinc-200/90 rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-zinc-100">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-700" />
                  <span>主业劳动工薪 (独立核算)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {profile.workDaysPerMonth}天/月 · 仅工时计费
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">
                    时薪 <strong className="text-zinc-800 font-mono">¥{snapshot.salaryPerHour}</strong> 元/时
                    <span className="text-zinc-400 text-[10px] ml-1">(+¥{snapshot.salaryPerSecond.toFixed(3)}/秒)</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    月薪基准: ¥{profile.monthlySalary.toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">今日打工入账</div>
                  <div className="text-sm font-bold font-mono text-emerald-700">
                    <RollingNumber value={formatMoney(snapshot.mainLaborEarnedToday)} />
                  </div>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-sm inline-block mt-0.5 font-sans ${
                      snapshot.isWorkingTime
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {snapshot.isWorkingTime ? '工作中计费中' : '已下班暂停'}
                  </span>
                </div>
              </div>
            </div>

            {/* Today's Net Balance Breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 text-xs">
              <div className="flex items-center gap-2 p-1.5 bg-zinc-50/70 rounded-sm border border-zinc-200/60">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-400">今日全部总收益</div>
                  <div className="text-xs font-semibold font-mono text-zinc-800">
                    <RollingNumber value={formatMoney(snapshot.earnedToday)} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 bg-zinc-50/70 rounded-sm border border-zinc-200/60">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-zinc-400">今日负债摊销</div>
                  <div className="text-xs font-semibold font-mono text-zinc-800">
                    <RollingNumber value={formatMoney(snapshot.dailyDebtCost)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Passive & Family Additional Streams (24/7 全天候与多元流) */}
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
                    {snapshot.oneTimeIncomes.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-white border border-zinc-200/80 rounded-sm hover:border-zinc-300 transition group"
                      >
                        <div>
                          <div className="text-[11px] font-sans font-medium text-zinc-800 flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{item.title}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded-sm bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                              待处理奖金
                            </span>
                          </div>
                          <div className="text-xs font-mono font-semibold text-zinc-800 mt-0.5">
                            +¥{item.amount.toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onInjectWindfall && (
                            <button
                              onClick={() => onInjectWindfall(item.amount, item.title, item.id!)}
                              className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xs transition font-medium cursor-pointer"
                              title="计入当前总存钱存款"
                            >
                              注入资产
                            </button>
                          )}
                          {onToggleAmortize && (
                            <button
                              onClick={() => onToggleAmortize(item.id!)}
                              className="px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xs transition font-medium cursor-pointer"
                              title="按一年平摊进日常每秒时钟"
                            >
                              平摊至秒
                            </button>
                          )}
                          {onRemoveIncomeSource && (
                            <button
                              onClick={() => onRemoveIncomeSource(item.id!)}
                              className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-rose-600 p-1 transition"
                              title="删除"
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
            </div>

            {/* Bottom summary banner */}
            <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-sm border border-zinc-200/70 text-zinc-600">
              <span>{incomeTab === 'streaming' ? '今日多元额外入账合计:' : '流式月增总折合:'}</span>
              <span className="font-semibold font-mono text-emerald-700">
                {incomeTab === 'streaming'
                  ? `+¥${snapshot.additionalIncomeToday.toFixed(2)}`
                  : `+¥${Math.round(snapshot.additionalIncomeMonthly).toLocaleString()}/月`}
              </span>
            </div>
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
                      const m = e.target.value as any;
                      setNewMode(m);
                      if (m === 'one_time') {
                        setNewType('bonus');
                        setNewFrequency('once');
                      } else {
                        setNewType('partner');
                        setNewFrequency('monthly');
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
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-sm px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="partner">配偶收入</option>
                    <option value="rent">被动房租</option>
                    <option value="interest">理财 / 利息收益</option>
                    <option value="bonus">年终奖 / 季度奖</option>
                    <option value="windfall">退税 / 偶然所得</option>
                    <option value="side_hustle">副业兼职</option>
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

              {newMode === 'one_time' && (
                <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-sm border border-zinc-200 text-xs">
                  <input
                    type="checkbox"
                    id="modalAmortizeCheck"
                    checked={newIsAmortized}
                    onChange={e => setNewIsAmortized(e.target.checked)}
                    className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-0"
                  />
                  <label htmlFor="modalAmortizeCheck" className="text-zinc-700 cursor-pointer">
                    按年平摊到每秒时钟计费（加速日常时钟，而不作为单笔一次性到账）
                  </label>
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
    </div>
  );
};
