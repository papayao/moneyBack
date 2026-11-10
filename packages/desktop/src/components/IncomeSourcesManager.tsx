import React, { useState } from 'react';
import { IncomeSource } from '@salary-ticker/core';
import { Plus, Trash2, Users, Building2, PiggyBank, Sparkles, Coins } from 'lucide-react';

interface IncomeSourcesManagerProps {
  incomeSources: IncomeSource[];
  onAddIncomeSource: (source: IncomeSource) => void;
  onRemoveIncomeSource: (id: number) => void;
  isPrivacyMode: boolean;
}

export const IncomeSourcesManager: React.FC<IncomeSourcesManagerProps> = ({
  incomeSources,
  onAddIncomeSource,
  onRemoveIncomeSource,
  isPrivacyMode,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<IncomeSource['type']>('partner');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<IncomeSource['frequency']>('monthly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount) return;

    onAddIncomeSource({
      id: Date.now(),
      title: newTitle.trim(),
      type: newType,
      amount: parseFloat(newAmount) || 0,
      frequency: newFrequency,
      status: 'active',
    });

    setNewTitle('');
    setNewAmount('');
    setShowAddForm(false);
  };

  const getTypeIcon = (type: IncomeSource['type']) => {
    switch (type) {
      case 'partner':
        return <Users className="w-4 h-4 text-emerald-600" />;
      case 'rent':
        return <Building2 className="w-4 h-4 text-zinc-600" />;
      case 'interest':
        return <PiggyBank className="w-4 h-4 text-amber-600" />;
      case 'side_hustle':
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      default:
        return <Coins className="w-4 h-4 text-zinc-600" />;
    }
  };

  const getTypeName = (type: IncomeSource['type']) => {
    switch (type) {
      case 'partner':
        return '配偶所得';
      case 'rent':
        return '房租被动';
      case 'interest':
        return '理财利息';
      case 'side_hustle':
        return '副业收益';
      default:
        return '其他收入';
    }
  };

  const totalMonthly = incomeSources
    .filter(s => (s.status ?? 'active') === 'active')
    .reduce((sum, s) => sum + (s.frequency === 'annual' ? s.amount / 12 : s.amount), 0);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
    return `+¥${val.toLocaleString()}`;
  };

  return (
    <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">多元收入来源</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
              月增收: {isPrivacyMode ? '****' : `+¥${Math.round(totalMonthly).toLocaleString()}`}
            </span>
          </div>
          <p className="text-xs text-zinc-500">配偶薪资、房租、利息与副业（自动加速存钱与提前还贷）</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加收入</span>
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">收入类型</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
              >
                <option value="partner">配偶收入 (妻子/丈夫)</option>
                <option value="rent">被动房租</option>
                <option value="interest">理财 / 利息收益</option>
                <option value="side_hustle">副业 / 自由职业</option>
                <option value="custom">其他自定义</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">收入名称</label>
              <input
                type="text"
                placeholder="例如：妻子月薪 / 朝阳区房租"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">金额 (元)</label>
              <input
                type="number"
                placeholder="10000"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">结算周期</label>
              <select
                value={newFrequency}
                onChange={e => setNewFrequency(e.target.value as any)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
              >
                <option value="monthly">每月</option>
                <option value="annual">每年</option>
              </select>
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
              保存收入项
            </button>
          </div>
        </form>
      )}

      {/* Income List */}
      {incomeSources.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-200 rounded-sm bg-zinc-50/50">
          <p className="text-xs text-zinc-400">暂无自定义收入来源，可点击右上角添加配偶工资、房租或理财收益</p>
        </div>
      ) : (
        <div className="space-y-2">
          {incomeSources.map(s => {
            const monthlyVal = s.frequency === 'annual' ? s.amount / 12 : s.amount;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between p-2.5 bg-zinc-50/70 border border-zinc-200 rounded-sm hover:border-zinc-300 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-sm bg-white border border-zinc-200 flex items-center justify-center">
                    {getTypeIcon(s.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-900">{s.title}</span>
                      <span className="text-[10px] font-mono px-1 rounded-sm bg-white border border-zinc-200 text-zinc-500">
                        {getTypeName(s.type)}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {s.frequency === 'annual' ? `按年结算 (折合 ¥${Math.round(monthlyVal).toLocaleString()}/月)` : '按月计入现金流'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold font-mono text-emerald-600">
                      {formatAmount(s.amount)}
                      <span className="text-[10px] text-zinc-400 font-normal">
                        {s.frequency === 'annual' ? '/年' : '/月'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => s.id && onRemoveIncomeSource(s.id)}
                    className="text-zinc-300 hover:text-rose-600 p-1 rounded-sm transition"
                    title="删除此收入项"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
