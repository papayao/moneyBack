import React, { useState } from 'react';
import {
  calculateDebtPayoffView,
  Liability,
  TickerSnapshot,
  UserProfile,
} from '@moneyback/core';
import {
  Plus,
  Trash2,
  Home,
  Car,
  CreditCard,
  Layers,
  PiggyBank,
  CircleAlert,
} from 'lucide-react';
import { RollingNumber } from './RollingNumber';
import { AppDateInput } from './ui/AstryxDateTime';

interface LiabilitiesManagerProps {
  liabilities: Liability[];
  snapshot?: TickerSnapshot;
  profile: UserProfile;
  onAddLiability: (liability: Liability) => void;
  onRemoveLiability: (id: number) => void;
  isPrivacyMode: boolean;
}

export const LiabilitiesManager: React.FC<LiabilitiesManagerProps> = ({
  liabilities,
  snapshot,
  profile,
  onAddLiability,
  onRemoveLiability,
  isPrivacyMode,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [useTotalIncome, setUseTotalIncome] = useState(false);
  const [includeSavings, setIncludeSavings] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Liability['type']>('mortgage');
  const [newTotal, setNewTotal] = useState('');
  const [newRemaining, setNewRemaining] = useState('');
  const [newMonthly, setNewMonthly] = useState('');
  const [newRepayDay, setNewRepayDay] = useState('10');
  const [newStartDate, setNewStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const debtView = snapshot
    ? calculateDebtPayoffView(snapshot, profile, liabilities, {
        useTotalIncome,
        includeSavings,
      })
    : null;

  const totalDebtRemainingLive = debtView?.totalDebtRemainingLive ?? 0;
  const totalDebt = debtView?.totalDebt ?? 0;
  const debtPayoffPercent = debtView?.debtPayoffPercent ?? 0;
  const incomePercent = debtView?.incomePercent ?? 0;
  const savingsPercent = debtView?.savingsPercent ?? 0;
  const totalDebtPaid = debtView?.totalDebtPaid ?? 0;
  const incomeCovered = debtView?.incomeCovered ?? 0;
  const savingsCovered = debtView?.savingsCovered ?? 0;
  const todayDebtRemainingLive = snapshot?.todayDebtRemainingLive ?? 0;
  const yearsToDebtFree = debtView?.yearsToDebtFree ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMonthly) return;

    const totalAmt = parseFloat(newTotal) || parseFloat(newRemaining) || 0;
    const remainingAmt = parseFloat(newRemaining) || totalAmt;

    onAddLiability({
      id: Date.now(),
      title: newTitle.trim(),
      type: newType,
      totalAmount: totalAmt,
      remainingAmount: remainingAmt,
      monthlyPayment: parseFloat(newMonthly) || 0,
      repayDay: parseInt(newRepayDay) || 10,
      startDate: newStartDate || undefined,
      status: 'active',
    });

    setNewTitle('');
    setNewTotal('');
    setNewRemaining('');
    setNewMonthly('');
    setShowAddForm(false);
  };

  const getTypeIcon = (type: Liability['type']) => {
    switch (type) {
      case 'mortgage':
        return <Home className="w-4 h-4 text-zinc-400" />;
      case 'car_loan':
        return <Car className="w-4 h-4 text-zinc-400" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-zinc-400" />;
      default:
        return <Layers className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
    const hasFraction = Math.abs(val % 1) > 0.001;
    return `¥${val.toLocaleString(undefined, {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalMonthlyPayment = liabilities
    .filter(l => (l.status ?? 'active') === 'active')
    .reduce((sum, l) => sum + l.monthlyPayment, 0);

  return (
    <div className="space-y-3.5">
      {/* Unified Header with Live Debt Counter & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
            {liabilities.length} 笔 · 月供 {isPrivacyMode ? '****' : `-¥${Math.round(totalMonthlyPayment).toLocaleString()}/月`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-zinc-400 font-sans">待还负债</div>
            <div className="text-sm font-bold font-mono text-rose-600">
              {isPrivacyMode ? '****' : (
                <RollingNumber value={`¥${totalDebtRemainingLive.toFixed(2)}`} />
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加负债</span>
          </button>
        </div>
      </div>

      {/* Merged Payoff Progress Bar & Metrics */}
      {totalDebt > 0 && (
        <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-sm p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 flex-wrap font-mono">
              <span>
                还贷进度:{' '}
                <strong className="text-zinc-900 font-semibold">{debtPayoffPercent}%</strong>
              </span>
              <span className="text-zinc-400 font-normal">
                (已覆盖 {formatAmount(totalDebtPaid)} / 总额 {formatAmount(totalDebt)})
              </span>
              <div className="group/tooltip relative inline-flex items-center cursor-help">
                <CircleAlert className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 transition" />
                <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-50 hidden group-hover/tooltip:flex flex-col w-64 p-2.5 bg-zinc-900 text-white text-[11px] rounded-sm shadow-md font-sans space-y-1">
                  <div className="font-mono text-[10px] text-amber-300">
                    {snapshot?.careerStartDate
                      ? `起算日：${snapshot.careerStartDate} 至今累计`
                      : '未设入职履历（仅计入今日已赚+已还本金）'}
                  </div>
                  <div className="text-zinc-200 leading-relaxed">
                    累计主业：{isPrivacyMode ? '****' : `¥${(snapshot?.careerMainEarnings ?? 0).toLocaleString()}`}
                    {useTotalIncome && (
                      <>
                        <br />+ 额外收入：{isPrivacyMode ? '****' : `¥${(snapshot?.careerAdditionalEarnings ?? 0).toLocaleString()}`}
                      </>
                    )}
                    {includeSavings && (
                      <>
                        <br />+ 零钱罐：{isPrivacyMode ? '****' : `¥${savingsCovered.toLocaleString()}`}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Buttons: 总收入 & + 零钱罐 */}
            <div className="flex items-center gap-1.5">
              <div className="flex bg-zinc-200/70 p-0.5 rounded-sm text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseTotalIncome(false)}
                  className={`px-2 py-0.5 rounded-xs transition cursor-pointer ${
                    !useTotalIncome
                      ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  主业收入
                </button>
                <button
                  type="button"
                  onClick={() => setUseTotalIncome(true)}
                  className={`px-2 py-0.5 rounded-xs transition cursor-pointer ${
                    useTotalIncome
                      ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  总收入
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIncludeSavings(prev => !prev)}
                title="将零钱罐当前存款计入可抵扣还贷进度"
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-sm border transition cursor-pointer ${
                  includeSavings
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-medium'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
                }`}
              >
                <PiggyBank className="w-3 h-3" />
                <span>+ 零钱罐</span>
              </button>
            </div>
          </div>

          {/* Stacked Progress Track (Income Covered + Optional Piggy Bank Savings) */}
          <div className="h-2 w-full bg-zinc-200/70 border border-zinc-200 rounded-sm overflow-hidden flex">
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, incomePercent))}%` }}
              title={isPrivacyMode ? '累计收入抵扣: ****' : `累计收入抵扣: ${formatAmount(incomeCovered)}`}
            />
            {includeSavings && savingsPercent > 0 && (
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${Math.min(100 - incomePercent, savingsPercent)}%` }}
                title={isPrivacyMode ? '零钱罐存款: ****' : `零钱罐存款: ${formatAmount(savingsCovered)}`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-500 gap-1.5">
            <span>
              {snapshot?.careerStartDate
                ? `已累计自 ${snapshot.careerStartDate} 起的全部工作收入`
                : '提示：右上角设置“入职日期 / 过往公司”后将从第一天上班开始累计'}
            </span>
            <div className="flex items-center gap-2">
              {todayDebtRemainingLive > 0 ? (
                <span className="text-amber-700">
                  今日待平: <strong className="font-bold">¥{todayDebtRemainingLive.toFixed(2)}</strong>
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">今日已平账</span>
              )}
              <span className="text-zinc-300">|</span>
              <span>
                预计还清:{' '}
                <strong className="text-zinc-800 font-semibold">
                  {yearsToDebtFree > 0 ? `${yearsToDebtFree} 年` : '0 年'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">负债类型</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
              >
                <option value="mortgage">房贷按揭</option>
                <option value="car_loan">车贷分期</option>
                <option value="credit_card">信用卡账单</option>
                <option value="custom">其他借款</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">负债项目名称</label>
              <input
                type="text"
                placeholder="例如：招商银行按揭房贷"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">剩余待还 (元)</label>
              <input
                type="number"
                placeholder="例如 950000"
                value={newRemaining}
                onChange={e => setNewRemaining(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">总贷款本金 (元)</label>
              <input
                type="number"
                placeholder="例如 1200000"
                value={newTotal}
                onChange={e => setNewTotal(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">月供金额 (元/月)</label>
              <input
                type="number"
                placeholder="例如 4200"
                value={newMonthly}
                onChange={e => setNewMonthly(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">起始日期</label>
              <AppDateInput
                label="起始日期"
                value={newStartDate}
                onChange={setNewStartDate}
                hasClear
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">每月还款日</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="10"
                  value={newRepayDay}
                  onChange={e => setNewRepayDay(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                />
                <span className="text-xs text-zinc-500 whitespace-nowrap">日</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-300 rounded-sm"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs text-white bg-zinc-900 hover:bg-zinc-800 rounded-sm"
            >
              保存负债
            </button>
          </div>
        </form>
      )}

      {/* Liabilities Detailed List */}
      {liabilities.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-200 rounded-sm bg-zinc-50/50">
          <p className="text-xs text-zinc-400">暂无生效中的负债记录，恭喜你已完全实现债务自由！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {liabilities.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 bg-zinc-50/70 border border-zinc-200 rounded-sm hover:border-zinc-300 transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-sm bg-white border border-zinc-200 flex items-center justify-center">
                  {getTypeIcon(item.type)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-zinc-900">{item.title}</span>
                    {item.startDate && (
                      <span className="text-[10px] font-mono px-1 rounded-sm bg-white border border-zinc-200 text-zinc-500">
                        起于 {item.startDate}
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-1 rounded-sm bg-white border border-zinc-200 text-zinc-500">
                      每月 {item.repayDay} 日还款
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    剩余: <strong className="text-zinc-700">{formatAmount(item.remainingAmount)}</strong>
                    {item.totalAmount > item.remainingAmount && (
                      <span className="text-zinc-400 ml-1">
                        / 总额 {formatAmount(item.totalAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold font-mono text-rose-600">
                    -{formatAmount(item.monthlyPayment)}/月
                  </div>
                </div>
                <button
                  onClick={() => item.id && onRemoveLiability(item.id)}
                  className="text-zinc-300 hover:text-rose-600 p-1 rounded-sm transition"
                  title="删除此项负债"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
