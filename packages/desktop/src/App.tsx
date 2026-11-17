import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Liability,
  Transaction,
  IncomeSource,
  calculateTickerSnapshot,
  normalizeBillTransaction,
  TickerSnapshot,
} from '@moneyback/core';
import { Header } from './components/Header';
import { TickerWidget } from './components/TickerWidget';
import { TrendChartCard } from './components/TrendChartCard';
import { LiabilitiesManager } from './components/LiabilitiesManager';
import { BillImportModal } from './components/BillImportModal';
import { ProfileModal } from './components/ProfileModal';
import { MiniFloatWindow } from './components/MiniFloatWindow';
import { FocusView } from './components/FocusView';
import { PiggyBankWidget } from './components/PiggyBankWidget';
import { DynamicSkyBackdrop } from './components/DynamicSkyBackdrop';
import { BillAnalysisCard } from './components/BillAnalysisCard';
import { useSkyWeather } from './hooks/useSkyWeather';
import { useHolidayCalendar } from './hooks/useHolidayCalendar';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { Card } from '@astryxdesign/core/Card';
import { Wallet, ShieldAlert, LineChart, Receipt } from 'lucide-react';

const DEFAULT_PROFILE: UserProfile = {
  monthlySalary: 20000,
  workDaysPerMonth: 21.75,
  workStartTime: '09:00',
  workEndTime: '18:00',
  targetSavings: 100000,
  currentSavings: 35000,
  baseLaborEarnings: 500000,
};

const DEFAULT_LIABILITIES: Liability[] = [
  {
    id: 1,
    type: 'mortgage',
    title: '按揭房贷',
    startDate: '2023-01-01',
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
    startDate: '2024-06-01',
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
    workDaysPerMonth: 21.75,
    workStartTime: '09:00',
    workEndTime: '18:00',
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

function loadJsonFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function cleanTransaction(tx: Transaction): Transaction {
  return normalizeBillTransaction(tx);
}

export function App() {
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadJsonFromStorage('salary_ticker_profile', DEFAULT_PROFILE)
  );

  const [liabilities, setLiabilities] = useState<Liability[]>(() =>
    loadJsonFromStorage('salary_ticker_liabilities', DEFAULT_LIABILITIES)
  );

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() =>
    loadJsonFromStorage('salary_ticker_income_sources', DEFAULT_INCOME_SOURCES)
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadJsonFromStorage<Transaction[]>('salary_ticker_txs', []).map(cleanTransaction)
  );

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [incomeDisplayMode, setIncomeDisplayMode] = useState<'main' | 'total'>('main');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const skyWeather = useSkyWeather();
  const holidayCalendar = useHolidayCalendar();

  // Live snapshot calculation
  const [snapshot, setSnapshot] = useState<TickerSnapshot>(() =>
    calculateTickerSnapshot(profile, liabilities, new Date(), transactions, incomeSources, holidayCalendar)
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  useEffect(() => {
    const update = () => {
      setSnapshot(
        calculateTickerSnapshot(profile, liabilities, new Date(), transactions, incomeSources, holidayCalendar)
      );
    };
    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [profile, liabilities, transactions, incomeSources, holidayCalendar]);

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

  const handleToggleExcludeTransaction = (idxInState: number) => {
    setTransactions(prev =>
      prev.map((tx, idx) => {
        if (idx !== idxInState) return tx;
        const normalized = normalizeBillTransaction(tx);
        if (normalized.isRefundOffset) return tx;
        if (normalized.type === 'repay') {
          const restored =
            normalized.originalType && normalized.originalType !== 'repay'
              ? normalized.originalType
              : 'expense';
          return {
            ...normalized,
            type: restored,
            userOverrideType: true,
          };
        }
        return {
          ...normalized,
          originalType: normalized.type,
          type: 'repay',
          userOverrideType: true,
        };
      })
    );
  };

  const handleImportTransactions = (newTxs: Transaction[]) => {
    setTransactions(prev => {
      const normalizedPrev = prev.map(cleanTransaction);
      const seen = new Set(
        normalizedPrev.map(t => `${t.source}|${t.tradeTime}|${t.amount}|${t.type}|${t.remark || ''}`)
      );
      const uniqueNew = newTxs.map(cleanTransaction).filter(t => {
        const key = `${t.source}|${t.tradeTime}|${t.amount}|${t.type}|${t.remark || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...uniqueNew, ...normalizedPrev];
    });
  };

  if (isFocusMode) {
    return (
      <FocusView
        snapshot={snapshot}
        profile={profile}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
        onExitFocus={() => setIsFocusMode(false)}
        skyWeather={skyWeather}
      />
    );
  }

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
    <div className="relative min-h-screen text-zinc-900 flex flex-col font-sans">
      <DynamicSkyBackdrop
        weatherCategory={skyWeather.activeWeather}
        isStorm={skyWeather.activeIsStorm}
        timeOverrideHour={skyWeather.activeHourOverride}
      />
      <Header
        snapshot={snapshot}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
        isMiniMode={isMiniMode}
        onToggleMini={() => setIsMiniMode(true)}
        skyWeather={skyWeather}
      />

      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto p-4 pb-24 md:p-6 md:pb-24">
        <CollapsibleGroup
          type="multiple"
          defaultValue={['ticker', 'liabilities', 'trend', 'bills']}
          chevronPosition="end"
        >
          <div className="space-y-4">
            {/* 1. Live Ticker, Multi-Stream Income & Savings Target */}
            <Card
              padding={4}
              className="bg-white border border-zinc-200/90 rounded-md shadow-2xs"
              style={{ overflow: 'visible' }}
            >
              <Collapsible
                value="ticker"
                trigger={
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Wallet className="w-4 h-4 text-zinc-700" />
                    <span>实时薪资与今日收支</span>
                    <span className="text-[11px] font-mono font-normal text-zinc-500">
                      {isPrivacyMode
                        ? '****'
                        : `¥${snapshot.salaryPerHour}/时`}
                    </span>
                  </div>
                }
              >
                <div className="pt-2.5">
                  <TickerWidget
                    snapshot={snapshot}
                    profile={profile}
                    isPrivacyMode={isPrivacyMode}
                    onUpdateProfile={setProfile}
                    incomeSources={incomeSources}
                    onAddIncomeSource={handleAddIncomeSource}
                    onRemoveIncomeSource={handleRemoveIncomeSource}
                    onInjectWindfall={handleInjectWindfall}
                    onToggleFocus={() => setIsFocusMode(true)}
                    incomeDisplayMode={incomeDisplayMode}
                    onChangeIncomeDisplayMode={setIncomeDisplayMode}
                  />
                </div>
              </Collapsible>
            </Card>

            {/* 2. Unified Debt Manager & Live Payoff Tracker */}
            <Card
              padding={4}
              className="bg-white border border-zinc-200/90 rounded-md shadow-2xs"
              style={{ overflow: 'visible' }}
            >
              <Collapsible
                value="liabilities"
                trigger={
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>负债管理与还贷进度</span>
                    <span className="text-[11px] font-mono font-normal text-zinc-500">
                      {liabilities.length} 笔
                    </span>
                  </div>
                }
              >
                <div className="pt-2.5">
                  <LiabilitiesManager
                    liabilities={liabilities}
                    snapshot={snapshot}
                    profile={profile}
                    onAddLiability={handleAddLiability}
                    onRemoveLiability={handleRemoveLiability}
                    isPrivacyMode={isPrivacyMode}
                  />
                </div>
              </Collapsible>
            </Card>

            {/* 3. Trend Line Chart */}
            <Card
              padding={4}
              className="bg-white border border-zinc-200/90 rounded-md shadow-2xs"
              style={{ overflow: 'visible' }}
            >
              <Collapsible
                value="trend"
                trigger={
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <LineChart className="w-4 h-4 text-zinc-700" />
                    <span>{incomeDisplayMode === 'main' ? '主要收支与还贷趋势' : '综合收支与还贷趋势'}</span>
                  </div>
                }
              >
                <div className="pt-2.5">
                  <TrendChartCard
                    profile={profile}
                    liabilities={liabilities}
                    incomeSources={incomeSources}
                    transactions={transactions}
                    isPrivacyMode={isPrivacyMode}
                    incomeDisplayMode={incomeDisplayMode}
                    holidayCalendar={holidayCalendar}
                  />
                </div>
              </Collapsible>
            </Card>

            {/* 4. Linked Income & Bill Expense Analysis */}
            {transactions.length > 0 && (
              <Card
                padding={4}
                className="bg-white border border-zinc-200/90 rounded-md shadow-2xs"
                style={{ overflow: 'visible' }}
              >
                <Collapsible
                  value="bills"
                  trigger={
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <Receipt className="w-4 h-4 text-zinc-700" />
                      <span>账单收支分析</span>
                      <span className="text-[11px] font-mono font-normal text-zinc-500">
                        {transactions.length} 笔流水
                      </span>
                    </div>
                  }
                >
                  <div className="pt-2.5">
                    <BillAnalysisCard
                      transactions={transactions}
                      profile={profile}
                      liabilities={liabilities}
                      incomeSources={incomeSources}
                      incomeDisplayMode={incomeDisplayMode}
                      isPrivacyMode={isPrivacyMode}
                      holidayCalendar={holidayCalendar}
                      onToggleExcludeTransaction={handleToggleExcludeTransaction}
                      onOpenImport={() => setIsImportOpen(true)}
                      onClearTransactions={() => setTransactions([])}
                    />
                  </div>
                </Collapsible>
              </Card>
            )}
          </div>
        </CollapsibleGroup>
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

      {/* Floating Piggy Bank in Bottom Right */}
      <PiggyBankWidget
        currentSavings={profile.currentSavings}
        isPrivacyMode={isPrivacyMode}
        onAddSavings={(amount) => {
          setProfile(prev => ({
            ...prev,
            currentSavings: Math.max(0, (prev.currentSavings || 0) + amount),
          }));
        }}
        onUpdateTotalSavings={(total) => {
          setProfile(prev => ({ ...prev, currentSavings: total }));
        }}
      />
    </div>
  );
}
export default App;
