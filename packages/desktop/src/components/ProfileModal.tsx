import React, { useState } from 'react';
import { UserProfile, PastJob } from '@salary-ticker/core';
import { X, Sliders, Plus, Trash2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-md w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto text-zinc-900">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-900">薪资与工时</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">月薪 (元/月)</label>
              <input
                type="number"
                value={formData.monthlySalary}
                onChange={e => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })}
                className="w-full bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">月计薪天数</label>
              <input
                type="number"
                step="0.01"
                value={formData.workDaysPerMonth}
                onChange={e => setFormData({ ...formData, workDaysPerMonth: parseFloat(e.target.value) || 21.75 })}
                className="w-full bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">上班时间</label>
              <input
                type="time"
                value={formData.workStartTime}
                onChange={e => setFormData({ ...formData, workStartTime: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">下班时间</label>
              <input
                type="time"
                value={formData.workEndTime}
                onChange={e => setFormData({ ...formData, workEndTime: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">当前公司</label>
              <input
                type="text"
                value={formData.currentCompany ?? ''}
                placeholder="公司名称"
                onChange={e => setFormData({ ...formData, currentCompany: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2.5 py-2 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600 mb-1">入职日期</label>
              <input
                type="date"
                value={formData.hireDate ?? ''}
                onChange={e => setFormData({ ...formData, hireDate: e.target.value || undefined })}
                className="w-full bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2.5 py-2 font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* 过往公司：只计入总所得，不影响当前日薪 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-600">过往公司（计入总所得）</label>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    pastJobs: [
                      ...(formData.pastJobs ?? []),
                      { id: Date.now(), company: '', startDate: '', endDate: '', monthlySalary: 0 },
                    ],
                  })
                }
                className="flex items-center gap-1 text-xs text-zinc-700 hover:text-zinc-900"
              >
                <Plus className="w-3.5 h-3.5" /> 添加公司
              </button>
            </div>
            {(formData.pastJobs ?? []).map(job => {
              const update = (patch: Partial<PastJob>) =>
                setFormData({
                  ...formData,
                  pastJobs: (formData.pastJobs ?? []).map(j => (j.id === job.id ? { ...j, ...patch } : j)),
                });
              const cls = 'bg-zinc-50 border border-zinc-300 text-xs text-zinc-900 rounded-sm px-2 py-1.5 font-mono min-w-0';
              return (
                <div key={job.id} className="grid grid-cols-[1fr_1fr_1fr_5rem_auto] gap-1.5 items-center">
                  <input className={cls} placeholder="公司" value={job.company} onChange={e => update({ company: e.target.value })} required />
                  <input className={cls} type="date" title="入职" value={job.startDate} onChange={e => update({ startDate: e.target.value })} required />
                  <input className={cls} type="date" title="离职" value={job.endDate} onChange={e => update({ endDate: e.target.value })} required />
                  <input className={cls} type="number" placeholder="月薪" value={job.monthlySalary || ''} onChange={e => update({ monthlySalary: parseFloat(e.target.value) || 0 })} required />
                  <button
                    type="button"
                    title="删除此公司"
                    onClick={() => setFormData({ ...formData, pastJobs: (formData.pastJobs ?? []).filter(j => j.id !== job.id) })}
                    className="text-zinc-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <p className="text-[11px] text-zinc-500 leading-snug">
              每段：完整月 = 月薪；零头月 = 月薪 ÷ {formData.workDaysPerMonth} × 工作日数。日薪始终按当前公司。
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-sm"
            >
              保存设置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
