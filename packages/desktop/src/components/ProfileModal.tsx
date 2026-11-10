import React, { useState } from 'react';
import { UserProfile } from '@salary-ticker/core';
import { X, Sliders } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>({ ...profile });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-md w-full max-w-md shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">工时与薪资设置</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">月薪 (元/月)</label>
              <input
                type="number"
                value={formData.monthlySalary}
                onChange={e => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">月工作天数</label>
              <input
                type="number"
                step="0.01"
                value={formData.workDaysPerMonth}
                onChange={e => setFormData({ ...formData, workDaysPerMonth: parseFloat(e.target.value) || 21.75 })}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">上班时间</label>
              <input
                type="time"
                value={formData.workStartTime}
                onChange={e => setFormData({ ...formData, workStartTime: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">下班时间</label>
              <input
                type="time"
                value={formData.workEndTime}
                onChange={e => setFormData({ ...formData, workEndTime: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">午休开始</label>
              <input
                type="time"
                value={formData.lunchStartTime}
                onChange={e => setFormData({ ...formData, lunchStartTime: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">午休结束</label>
              <input
                type="time"
                value={formData.lunchEndTime}
                onChange={e => setFormData({ ...formData, lunchEndTime: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-sm"
            >
              保存设置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
