import React, { useState } from 'react';
import { IncomeSource } from '@salary-ticker/core';
import {
  Plus,
  Trash2,
  Users,
  Building2,
  PiggyBank,
  Sparkles,
  Coins,
  Gift,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface IncomeSourcesManagerProps {
  incomeSources: IncomeSource[];
  onAddIncomeSource: (source: IncomeSource) => void;
  onRemoveIncomeSource: (id: number) => void;
  onToggleAmortize?: (id: number) => void;
  onInjectWindfall?: (amount: number, title: string, id: number) => void;
  isPrivacyMode: boolean;
}

export const IncomeSourcesManager: React.FC<IncomeSourcesManagerProps> = ({
  incomeSources,
  onAddIncomeSource,
  onRemoveIncomeSource,
  onToggleAmortize,
  onInjectWindfall,
  isPrivacyMode,
}) => {
  const [activeTab, setActiveTab] = useState<'streaming' | 'onetime'>('streaming');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<IncomeSource['type']>('partner');
  const [newMode, setNewMode] = useState<'streaming' | 'one_time'>('streaming');
  const [newAmount, setNewAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<IncomeSource['frequency']>('monthly');
  const [newIsAmortized, setNewIsAmortized] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount) return;

    onAddIncomeSource({
      id: Date.now(),
      title: newTitle.trim(),
      type: newType,
      mode: newMode,
      amount: parseFloat(newAmount) || 0,
      frequency: newFrequency,
      isAmortized: newMode === 'one_time' ? newIsAmortized : undefined,
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
      case 'bonus':
      case 'windfall':
        return <Gift className="w-4 h-4 text-rose-600" />;
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
      case 'bonus':
        return '年终/项目奖';
      case 'windfall':
        return '一次性收入';
      case 'side_hustle':
        return '副业收益';
      default:
        return '其他收入';
    }
  };

  const streamingList = incomeSources.filter(
    s => (s.mode ?? 'streaming') === 'streaming' || s.isAmortized
  );
  const oneTimeList = incomeSources.filter(
    s => s.mode === 'one_time' && !s.isAmortized
  );

  const totalMonthlyStreaming = streamingList
    .filter(s => (s.status ?? 'active') === 'active')
    .reduce((sum, s) => sum + (s.frequency === 'annual' ? s.amount / 12 : s.amount), 0);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
    return `+¥${val.toLocaleString()}`;
  };

  return (
    <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs space-y-3">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">额外收入</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
              流式月增: {isPrivacyMode ? '****' : `+¥${Math.round(totalMonthlyStreaming).toLocaleString()}`}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加新收入项</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 p-0.5 rounded-sm border border-zinc-200 text-xs w-fit">
        <button
          onClick={() => setActiveTab('streaming')}
          className={`px-3 py-1 rounded-sm font-medium transition ${
            activeTab === 'streaming'
              ? 'bg-white text-zinc-900 shadow-2xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          按秒流式收入 ({streamingList.length})
        </button>
        <button
          onClick={() => setActiveTab('onetime')}
          className={`px-3 py-1 rounded-sm font-medium transition ${
            activeTab === 'onetime'
              ? 'bg-white text-zinc-900 shadow-2xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          一次性奖金 ({oneTimeList.length})
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-3 bg-zinc-50 border border-zinc-200 rounded-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
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
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
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
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
              >
                <option value="partner">配偶收入 (妻子/丈夫)</option>
                <option value="rent">被动房租</option>
                <option value="interest">理财 / 利息收益</option>
                <option value="bonus">年终奖 / 季度奖</option>
                <option value="windfall">退税 / 偶然所得</option>
                <option value="side_hustle">副业收益</option>
                <option value="custom">其他自定义</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">收入名称</label>
              <input
                type="text"
                placeholder="例如：2026年终奖 / 妻子月薪"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">金额 (元)</label>
              <input
                type="number"
                placeholder="50000"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-sm px-2 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          {newMode === 'one_time' && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-sm border border-zinc-200 text-xs">
              <input
                type="checkbox"
                id="amortizeCheck"
                checked={newIsAmortized}
                onChange={e => setNewIsAmortized(e.target.checked)}
                className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-0"
              />
              <label htmlFor="amortizeCheck" className="text-zinc-700 cursor-pointer">
                按年平摊到每秒时钟计费（加速日常时钟，而不作为单笔一次性到账）
              </label>
            </div>
          )}

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

      {/* Tab 1: Streaming List */}
      {activeTab === 'streaming' && (
        <div className="space-y-2">
          {streamingList.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-zinc-200 rounded-sm bg-zinc-50/50">
              <p className="text-xs text-zinc-400">暂无持续流式收入，可点击右上角添加配偶月薪、房租或利息</p>
            </div>
          ) : (
            streamingList.map(s => {
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
                        {s.isAmortized && (
                          <span className="text-[10px] font-mono px-1 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
                            年终奖已年化平摊
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {s.frequency === 'annual'
                          ? `按年结算 (折合 ¥${Math.round(monthlyVal).toLocaleString()}/月)`
                          : '按月秒级计入时钟现金流'}
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
            })
          )}
        </div>
      )}

      {/* Tab 2: One-time Windfall & Bonus List */}
      {activeTab === 'onetime' && (
        <div className="space-y-2">
          {oneTimeList.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-zinc-200 rounded-sm bg-zinc-50/50">
              <p className="text-xs text-zinc-400">暂无待处理年终奖或一次性收入项</p>
            </div>
          ) : (
            oneTimeList.map(s => {
              const isReceived = s.status === 'received';
              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-50/70 border border-zinc-200 rounded-sm hover:border-zinc-300 gap-2 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-sm bg-white border border-zinc-200 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-900">{s.title}</span>
                        <span className="text-[10px] font-mono px-1 rounded-sm bg-white border border-zinc-200 text-zinc-500">
                          {getTypeName(s.type)}
                        </span>
                        {isReceived ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> 已注入资产池
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
                            待处理
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        单笔到账: <strong className="text-zinc-800">{formatAmount(s.amount)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!isReceived && (
                      <>
                        <button
                          onClick={() => s.id && onInjectWindfall && onInjectWindfall(s.amount, s.title, s.id)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm text-xs font-sans flex items-center gap-1 transition"
                          title="直接计入当前存款，加速达成存钱进度"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>即时注入存款</span>
                        </button>

                        <button
                          onClick={() => s.id && onToggleAmortize && onToggleAmortize(s.id)}
                          className="px-2 py-1 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-sm text-xs font-sans flex items-center gap-1 transition"
                          title="按年化摊销到每秒时钟计费"
                        >
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>按年分摊到每秒</span>
                        </button>
                      </>
                    )}

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
            })
          )}
        </div>
      )}
    </div>
  );
};
