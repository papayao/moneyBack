import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Liability,
  Transaction,
  calculateTickerSnapshot,
  TickerSnapshot,
} from '@salary-ticker/core';
import { Header } from './components/Header';
import { TickerWidget } from './components/TickerWidget';
import { LiabilitiesManager } from './components/LiabilitiesManager';
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

export function App() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('salary_ticker_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [liabilities, setLiabilities] = useState<Liability[]>(() => {
    const saved = localStorage.getItem('salary_ticker_liabilities');
    return saved ? JSON.parse(saved) : DEFAULT_LIABILITIES;
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
    calculateTickerSnapshot(profile, liabilities)
  );

  useEffect(() => {
    localStorage.setItem('salary_ticker_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('salary_ticker_liabilities', JSON.stringify(liabilities));
  }, [liabilities]);

  useEffect(() => {
    localStorage.setItem('salary_ticker_txs', JSON.stringify(transactions));
  }, [transactions]);

  // Real-time ticking (every 200ms for ultra-smooth rolling odometer)
  useEffect(() => {
    const update = () => {
      setSnapshot(calculateTickerSnapshot(profile, liabilities, new Date()));
    };
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [profile, liabilities]);

  const handleAddLiability = (item: Liability) => {
    setLiabilities(prev => [item, ...prev]);
  };

  const handleRemoveLiability = (id: number) => {
    setLiabilities(prev => prev.filter(l => l.id !== id));
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
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
        {/* Live Ticker & Target */}
        <TickerWidget
          snapshot={snapshot}
          profile={profile}
          isPrivacyMode={isPrivacyMode}
        />

        {/* Liabilities */}
        <LiabilitiesManager
          liabilities={liabilities}
          onAddLiability={handleAddLiability}
          onRemoveLiability={handleRemoveLiability}
          isPrivacyMode={isPrivacyMode}
        />

        {/* Recent Transactions / Bills Summary */}
        {transactions.length > 0 && (
          <div className="border border-zinc-800 bg-zinc-900/40 p-4 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-200">已录入账单流水 ({transactions.length} 笔)</h3>
              <button
                onClick={() => setTransactions([])}
                className="text-xs text-zinc-400 hover:text-rose-400 transition"
              >
                清空流水
              </button>
            </div>
            <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto font-mono text-xs">
              {transactions.slice(0, 10).map((tx, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-zinc-300">
                  <div className="truncate max-w-sm">
                    <span className="text-[10px] text-zinc-400 mr-2 bg-zinc-800 px-1 py-0.5 rounded-sm">
                      {tx.source}
                    </span>
                    <span>{tx.remark || tx.category}</span>
                  </div>
                  <span className={tx.type === 'income' ? 'text-emerald-400 font-semibold' : 'text-zinc-200'}>
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
