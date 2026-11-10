import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Liability,
  Transaction,
  IncomeSource,
  calculateTickerSnapshot,
  TickerSnapshot,
} from '@salary-ticker/core';
import { Header } from './components/Header';
import { TickerWidget } from './components/TickerWidget';
import { TrendChartCard } from './components/TrendChartCard';
import { LiabilitiesManager } from './components/LiabilitiesManager';
import { IncomeSourcesManager } from './components/IncomeSourcesManager';
import { BillImportModal } from './components/BillImportModal';
import { ProfileModal } from './components/ProfileModal';
import { MiniFloatWindow } from './components/MiniFloatWindow';

const DEFAULT_PROFILE: UserProfile = {
  monthlySalary: 20000,
  workDaysPerMonth: 21.75,
  workStartTime: '09:00',
  workEndTime: '18:00',
  lunchStartTime: '12:00',
  lunchEndTime: '13:30',
  targetSavings: 100000,
  currentSavings: 35000,
  baseLaborEarnings: 500000,
};

const DEFAULT_LIABILITIES: Liability[] = [
  {
    id: 1,
    type: 'mortgage',
    title: '按揭房贷',
    totalAmount: 1200000,
    remainingAmount: 950000,
    monthlyPayment: 4200,
    repayDay: 15,
    status: 'active',
  },
  {
    id: 2,
    type: 'car_loan',
    title: '汽车分期',
    totalAmount: 150000,
    remainingAmount: 48000,
    monthlyPayment: 2100,
    repayDay: 20,
    status: 'active',
  },
];

const DEFAULT_INCOME_SOURCES: IncomeSource[] = [
  {
    id: 1,
    type: 'partner',
    title: '配偶月薪 (妻子/丈夫)',
    amount: 15000,
    frequency: 'monthly',
    status: 'active',
  },
  {
    id: 2,
    type: 'rent',
    title: '投资房租金',
    amount: 3200,
    frequency: 'monthly',
    status: 'active',
  },
  {
    id: 3,
    type: 'interest',
    title: '存款理财利息',
    amount: 600,
    frequency: 'monthly',
    mode: 'streaming',
    status: 'active',
  },
  {
    id: 4,
    type: 'bonus',
    title: '年终奖金',
    amount: 50000,
    mode: 'one_time',
    status: 'active',
  },
];

export function App() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('salary_ticker_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [liabilities, setLiabilities] = useState<Liability[]>(() => {
    const saved = localStorage.getItem('salary_ticker_liabilities');
    return saved ? JSON.parse(saved) : DEFAULT_LIABILITIES;
  });

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem('salary_ticker_income_sources');
    return saved ? JSON.parse(saved) : DEFAULT_INCOME_SOURCES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('salary_ticker_txs');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Live snapshot calculation
  const [snapshot, setSnapshot] = useState<TickerSnapshot>(() =>
    calculateTickerSnapshot(profile, liabilities, new Date(), transactions, incomeSources)
  );

  useEffect(() => {
    localStorage.setItem('salary_ticker_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('salary_ticker_liabilities', JSON.stringify(liabilities));
  }, [liabilities]);

  useEffect(() => {
    localStorage.setItem('salary_ticker_income_sources', JSON.stringify(incomeSources));
  }, [incomeSources]);

  useEffect(() => {
    localStorage.setItem('salary_ticker_txs', JSON.stringify(transactions));
  }, [transactions]);

  // Real-time ticking (every 200ms for ultra-smooth rolling odometer)
  useEffect(() => {
    const update = () => {
      setSnapshot(calculateTickerSnapshot(profile, liabilities, new Date(), transactions, incomeSources));
    };
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [profile, liabilities, transactions, incomeSources]);

  const handleAddLiability = (item: Liability) => {
    setLiabilities(prev => [item, ...prev]);
  };

  const handleRemoveLiability = (id: number) => {
    setLiabilities(prev => prev.filter(l => l.id !== id));
  };

  const handleAddIncomeSource = (source: IncomeSource) => {
    setIncomeSources(prev => [source, ...prev]);
  };

  const handleRemoveIncomeSource = (id: number) => {
    setIncomeSources(prev => prev.filter(s => s.id !== id));
  };

  const handleInjectWindfall = (amount: number, _title: string, id: number) => {
    setProfile(prev => ({
      ...prev,
      currentSavings: prev.currentSavings + amount,
      baseLaborEarnings: (prev.baseLaborEarnings ?? 500000) + amount,
    }));
    setIncomeSources(prev =>
      prev.map(s => (s.id === id ? { ...s, status: 'received' as const } : s))
    );
  };

  const handleToggleAmortize = (id: number) => {
    setIncomeSources(prev =>
      prev.map(s => (s.id === id ? { ...s, isAmortized: !s.isAmortized } : s))
    );
  };

  const handleImportTransactions = (newTxs: Transaction[]) => {
    setTransactions(prev => [...newTxs, ...prev]);
  };

  if (isMiniMode) {
    return (
      <div className="p-2 bg-transparent min-h-screen flex items-start justify-center">
        <MiniFloatWindow
          snapshot={snapshot}
          isPrivacyMode={isPrivacyMode}
          onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
          onExpand={() => setIsMiniMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100/60 text-zinc-900 flex flex-col font-sans">
      <Header
        snapshot={snapshot}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
        isMiniMode={isMiniMode}
        onToggleMini={() => setIsMiniMode(true)}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Live Ticker & Savings Target */}
        <TickerWidget
          snapshot={snapshot}
          profile={profile}
          isPrivacyMode={isPrivacyMode}
          onUpdateProfile={setProfile}
        />

        {/* Unified Debt Manager & Live Payoff Tracker (负债记录进度条与清单合并单元) */}
        <LiabilitiesManager
          liabilities={liabilities}
          snapshot={snapshot}
          onAddLiability={handleAddLiability}
          onRemoveLiability={handleRemoveLiability}
          isPrivacyMode={isPrivacyMode}
        />

        {/* Custom Income Sources (配偶/房租/利息/年终奖) */}
        <IncomeSourcesManager
          incomeSources={incomeSources}
          onAddIncomeSource={handleAddIncomeSource}
          onRemoveIncomeSource={handleRemoveIncomeSource}
          onInjectWindfall={handleInjectWindfall}
          onToggleAmortize={handleToggleAmortize}
          isPrivacyMode={isPrivacyMode}
        />

        {/* Trend Line Chart (按天、月、小时观测收入、支出、负债进度、存钱进度) */}
        <TrendChartCard
          profile={profile}
          liabilities={liabilities}
          incomeSources={incomeSources}
          transactions={transactions}
          isPrivacyMode={isPrivacyMode}
        />

        {/* Recent Transactions / Bills Summary */}
        {transactions.length > 0 && (
          <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">已录入账单流水 ({transactions.length} 笔)</h3>
              <button
                onClick={() => setTransactions([])}
                className="text-xs text-zinc-500 hover:text-rose-600 transition"
              >
                清空流水
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto font-mono text-xs">
              {transactions.slice(0, 10).map((tx, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-zinc-800">
                  <div className="truncate max-w-sm">
                    <span className="text-[10px] text-zinc-500 mr-2 bg-zinc-100 px-1 py-0.5 rounded-sm border border-zinc-200">
                      {tx.source}
                    </span>
                    <span>{tx.remark || tx.category}</span>
                  </div>
                  <span className={tx.type === 'income' ? 'text-emerald-600 font-semibold' : 'text-zinc-900'}>
                    {tx.type === 'income' ? `+¥${tx.amount.toFixed(2)}` : `-¥${tx.amount.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSaveProfile={setProfile}
      />

      <BillImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportTransactions}
      />
    </div>
  );
}
export default App;
