import React from 'react';
import { TickerSnapshot } from '@salary-ticker/core';
import { Maximize2, Eye, EyeOff } from 'lucide-react';
import { RollingNumber } from './RollingNumber';

interface MiniFloatWindowProps {
  snapshot: TickerSnapshot;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onExpand: () => void;
}

export const MiniFloatWindow: React.FC<MiniFloatWindowProps> = ({
  snapshot,
  isPrivacyMode,
  onTogglePrivacy,
  onExpand,
}) => {
  const formatAmount = () => {
    if (isPrivacyMode) return '****';
    const sign = snapshot.netToday >= 0 ? '+' : '-';
    return `${sign}¥${Math.abs(snapshot.netToday).toFixed(2)}`;
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-md shadow-xl select-none font-mono">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            snapshot.isNetPositive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span className="text-xs text-zinc-400">今日净计费:</span>
        <RollingNumber
          value={formatAmount()}
          className={`text-sm font-bold ${
            snapshot.isNetPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        />
      </div>

      <div className="flex items-center gap-1.5 ml-4">
        <button
          onClick={onTogglePrivacy}
          className="p-1 text-zinc-400 hover:text-zinc-200"
          title={isPrivacyMode ? "显示金额" : "隐私隐藏"}
        >
          {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onExpand}
          className="p-1 text-zinc-400 hover:text-zinc-200"
          title="展开主看板"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
