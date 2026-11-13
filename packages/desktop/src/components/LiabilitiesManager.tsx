import React, { useState } from 'react';
import { Liability, TickerSnapshot } from '@salary-ticker/core';
import { Plus, Trash2, Home, Car, CreditCard, Layers, ShieldAlert } from 'lucide-react';
import { RollingNumber } from './RollingNumber';

interface LiabilitiesManagerProps {
  liabilities: Liability[];
  snapshot?: TickerSnapshot;
  onAddLiability: (liability: Liability) => void;
  onRemoveLiability: (id: number) => void;
  isPrivacyMode: boolean;
}

export const LiabilitiesManager: React.FC<LiabilitiesManagerProps> = ({
  liabilities,
  snapshot,
  onAddLiability,
  onRemoveLiability,
  isPrivacyMode,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
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

  const totalDebtRemainingLive = snapshot?.totalDebtRemainingLive ?? 0;
  const totalDebt = snapshot?.totalDebt ?? 0;
  const debtPayoffPercent = snapshot?.debtPayoffPercent ?? 0;
  const totalDebtPaid = snapshot?.totalDebtPaid ?? 0;
  const todayDebtRemainingLive = snapshot?.todayDebtRemainingLive ?? 0;
  const yearsToDebtFree = snapshot?.yearsToDebtFree ?? 0;

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
    return `¥${val.toLocaleString()}`;
  };

  const totalMonthlyPayment = liabilities
    .filter(l => (l.status ?? 'active') === 'active')
    .reduce((sum, l) => sum + l.monthlyPayment, 0);

  return (
    <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs space-y-3.5">
      {/* Unified Header with Live Debt Counter & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-semibold text-zinc-900">负债情况</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
              {liabilities.length} 笔 · 月供 -¥{Math.round(totalMonthlyPayment).toLocaleString()}/月
            </span>
          </div>
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
        <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-sm p-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-600 gap-1.5">
            <span className="font-mono">
              还贷进度:{' '}
              <strong className="text-zinc-900 font-semibold">{debtPayoffPercent}%</strong>
              <span className="text-zinc-400 ml-1.5 font-normal">
                (已还 ¥{totalDebtPaid.toLocaleString()} / 总额 ¥{totalDebt.toLocaleString()})
              </span>
            </span>

            <div className="flex items-center gap-2 font-mono text-xs">
              {todayDebtRemainingLive > 0 ? (
                <span className="text-amber-700">
                  今日待平: <strong className="font-bold">¥{todayDebtRemainingLive.toFixed(2)}</strong>
                </span>
              ) : (
                <span className="text-emerald-700 font-medium">
                  今日已平账
                </span>
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

          {/* Progress Track */}
          <div className="h-2 w-full bg-zinc-200/70 border border-zinc-200 rounded-sm overflow-hidden relative">
            <div
              className="h-full bg-rose-500 transition-all duration-300 rounded-sm"
              style={{ width: `${Math.min(100, Math.max(0, debtPayoffPercent))}%` }}
            />
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
              <input
                type="date"
                value={newStartDate}
                onChange={e => setNewStartDate(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
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
