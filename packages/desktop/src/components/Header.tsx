import React from 'react';
import { Settings, FileSpreadsheet, Eye, EyeOff, LayoutGrid, Minimize2 } from 'lucide-react';
import { TickerSnapshot } from '@salary-ticker/core';

interface HeaderProps {
  snapshot: TickerSnapshot;
  onOpenProfile: () => void;
  onOpenImport: () => void;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  isMiniMode: boolean;
  onToggleMini: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  snapshot,
  onOpenProfile,
  onOpenImport,
  isPrivacyMode,
  onTogglePrivacy,
  isMiniMode,
  onToggleMini,
}) => {
  const getStatusBadge = () => {
    if (snapshot.isLunchBreak) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">午休摸鱼中</span>;
    }
    if (snapshot.isWorkingTime) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">计费工作中</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">已下班</span>;
  };

  return (
    <header className="h-14 border-b border-zinc-200 bg-white/80 backdrop-blur px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide text-zinc-900">SALARY TICKER</span>
          <span className="text-xs text-zinc-400 font-mono">v1.0</span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onTogglePrivacy}
          title={isPrivacyMode ? "显示金额" : "防窥隐私模式"}
          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm border border-transparent hover:border-zinc-200 transition"
        >
          {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenImport}
          title="导入微信/支付宝账单"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" />
          <span>导入账单</span>
        </button>

        <button
          onClick={onOpenProfile}
          title="设置工作与薪资"
          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm border border-transparent hover:border-zinc-200 transition"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleMini}
          title="切换至极简悬浮小窗"
          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm border border-transparent hover:border-zinc-200 transition ml-1"
        >
          {isMiniMode ? <LayoutGrid className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
