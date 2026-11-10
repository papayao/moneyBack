import React, { useState } from 'react';
import { parseWechatBill, parseAlipayBill, Transaction } from '@salary-ticker/core';
import { X, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface BillImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (transactions: Transaction[]) => void;
}

export const BillImportModal: React.FC<BillImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [parsedItems, setParsedItems] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState('');
  const [sourceType, setSourceType] = useState<'wechat' | 'alipay'>('wechat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();

    // Decide format: csv vs xlsx
    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const items =
            sourceType === 'alipay'
              ? parseAlipayBill(buffer)
              : parseWechatBill(buffer);

          if (items.length === 0) {
            setErrorMsg('未能解析出有效账单记录，请检查是否选择了正确的账单类型。');
          } else {
            setParsedItems(items);
          }
        } catch (err: any) {
          setErrorMsg(`解析失败: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // xlsx
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const items = parseWechatBill(buffer);
          if (items.length === 0) {
            setErrorMsg('未能解析出有效账单记录，请确保是微信导出的原生 Excel。');
          } else {
            setParsedItems(items);
          }
        } catch (err: any) {
          setErrorMsg(`解析失败: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const totalExpense = parsedItems
    .filter(i => i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalIncome = parsedItems
    .filter(i => i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const creditCardCount = parsedItems.filter(i => i.isDebtPayment).length;

  const handleConfirm = () => {
    onImportSuccess(parsedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-md w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">导入微信 / 支付宝账单</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Source Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setSourceType('wechat')}
              className={`flex-1 py-1.5 px-3 text-xs rounded-sm border font-medium transition ${
                sourceType === 'wechat'
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              微信支付账单 (.xlsx / .csv)
            </button>
            <button
              onClick={() => setSourceType('alipay')}
              className={`flex-1 py-1.5 px-3 text-xs rounded-sm border font-medium transition ${
                sourceType === 'alipay'
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              支付宝账单 (.csv)
            </button>
          </div>

          {/* Upload Area */}
          <label className="border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950/50 hover:bg-zinc-950 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition">
            <Upload className="w-6 h-6 text-zinc-400 mb-2" />
            <span className="text-xs text-zinc-300 font-medium">
              {fileName ? fileName : '点击选择账单文件或将文件拖入此处'}
            </span>
            <span className="text-[11px] text-zinc-400 mt-1">
              本地内存即时解析，数据绝不上传服务器
            </span>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-950/30 border border-rose-900/50 rounded-sm text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-400">解析流水总数</div>
                  <div className="text-sm font-semibold font-mono text-zinc-200">{parsedItems.length} 笔</div>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-400">总计支出</div>
                  <div className="text-sm font-semibold font-mono text-rose-400">¥{totalExpense.toFixed(2)}</div>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-400">自动识别信用卡/还款</div>
                  <div className="text-sm font-semibold font-mono text-emerald-400">{creditCardCount} 笔</div>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-sm max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 sticky top-0">
                    <tr>
                      <th className="p-2">时间</th>
                      <th className="p-2">分类</th>
                      <th className="p-2">描述</th>
                      <th className="p-2 text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                    {parsedItems.slice(0, 15).map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-850/50">
                        <td className="p-2 text-zinc-400">{item.tradeTime}</td>
                        <td className="p-2 text-zinc-300">{item.category}</td>
                        <td className="p-2 text-zinc-400 truncate max-w-xs">{item.remark}</td>
                        <td className={`p-2 text-right font-semibold ${
                          item.type === 'income' ? 'text-emerald-400' : 'text-zinc-200'
                        }`}>
                          {item.type === 'income' ? `+${item.amount}` : `-${item.amount}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-950/40">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            取消
          </button>
          <button
            disabled={parsedItems.length === 0}
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认录入 ({parsedItems.length} 笔)
          </button>
        </div>
      </div>
    </div>
  );
};
