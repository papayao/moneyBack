import React, { useState } from 'react';
import { Liability } from '@salary-ticker/core';
import { Plus, Trash2, Home, Car, CreditCard, Layers } from 'lucide-react';

interface LiabilitiesManagerProps {
  liabilities: Liability[];
  onAddLiability: (liability: Liability) => void;
  onRemoveLiability: (id: number) => void;
  isPrivacyMode: boolean;
}

export const LiabilitiesManager: React.FC<LiabilitiesManagerProps> = ({
  liabilities,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMonthly) return;

    onAddLiability({
      id: Date.now(),
      title: newTitle.trim(),
      type: newType,
      totalAmount: parseFloat(newTotal) || 0,
      remainingAmount: parseFloat(newRemaining) || parseFloat(newTotal) || 0,
      monthlyPayment: parseFloat(newMonthly) || 0,
      repayDay: parseInt(newRepayDay) || 10,
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

  return (
    <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">刚性负债清单</h3>
          <p className="text-xs text-zinc-500">房贷、车贷及本月信用卡（用于自动按工作日摊销对冲）</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加负债</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">负债类型</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="w-full bg-white border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2 py-1.5 focus:outline-none focus:border-zinc-500"
              >
                <option value="mortgage">房贷</option>
                <option value="car_loan">车贷</option>
                <option value="credit_card">信用卡/花呗</option>
                <option value="custom">其他欠款</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">名称描述</label>
              <input
                type="text"
                placeholder="例如：招行按揭贷款"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">月供金额 (元)</label>
              <input
                type="number"
                placeholder="4500"
                value={newMonthly}
                onChange={e => setNewMonthly(e.target.value)}
                className="w-full bg-white border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">剩余未还 (元)</label>
              <input
                type="number"
                placeholder="800000"
                value={newRemaining}
                onChange={e => setNewRemaining(e.target.value)}
                className="w-full bg-white border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2 py-1.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">每月还款日</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="15"
                value={newRepayDay}
                onChange={e => setNewRepayDay(e.target.value)}
                className="w-full bg-white border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2 py-1.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-sm"
            >
              保存
            </button>
          </div>
        </form>
      )}

      {/* Liabilities List */}
      <div className="space-y-2">
        {liabilities.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-400">
            暂无负债记录，点击右上角添加房贷、车贷或信用卡
          </div>
        ) : (
          liabilities.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 bg-zinc-50/80 border border-zinc-200 rounded-sm hover:border-zinc-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-sm bg-white border border-zinc-200 flex items-center justify-center">
                  {getTypeIcon(item.type)}
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-900 flex items-center gap-2">
                    <span>{item.title}</span>
                    <span className="text-[10px] text-zinc-500 bg-white px-1.5 py-0.2 rounded-sm border border-zinc-200">
                      每月 {item.repayDay} 日还款
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    剩余: {formatAmount(item.remainingAmount)}
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
                  title="删除该条负债"
                  className="p-1 text-zinc-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
