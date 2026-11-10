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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-md w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl text-zinc-900">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-900">导入账单</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition"
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
                  ? 'bg-white border-zinc-400 text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              微信支付账单 (.xlsx / .csv)
            </button>
            <button
              onClick={() => setSourceType('alipay')}
              className={`flex-1 py-1.5 px-3 text-xs rounded-sm border font-medium transition ${
                sourceType === 'alipay'
                  ? 'bg-white border-zinc-400 text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              支付宝账单 (.csv)
            </button>
          </div>

          {/* Upload Area */}
          <label className="border border-dashed border-zinc-300 hover:border-zinc-500 bg-zinc-50/60 hover:bg-zinc-50 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition">
            <Upload className="w-6 h-6 text-zinc-500 mb-2" />
            <span className="text-xs text-zinc-800 font-medium">
              {fileName ? fileName : '点击选择账单文件或将文件拖入此处'}
            </span>
            <span className="text-[11px] text-zinc-500 mt-1">
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
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">解析流水总数</div>
                  <div className="text-sm font-semibold font-mono text-zinc-900">{parsedItems.length} 笔</div>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">总计支出</div>
                  <div className="text-sm font-semibold font-mono text-rose-600">¥{totalExpense.toFixed(2)}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">自动识别信用卡/还款</div>
                  <div className="text-sm font-semibold font-mono text-emerald-600">{creditCardCount} 笔</div>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-sm max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 sticky top-0">
                    <tr>
                      <th className="p-2">时间</th>
                      <th className="p-2">分类</th>
                      <th className="p-2">描述</th>
                      <th className="p-2 text-right">金额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                    {parsedItems.slice(0, 15).map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="p-2 text-zinc-500">{item.tradeTime}</td>
                        <td className="p-2 text-zinc-800">{item.category}</td>
                        <td className="p-2 text-zinc-500 truncate max-w-xs">{item.remark}</td>
                        <td className={`p-2 text-right font-semibold ${
                          item.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'
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
        <div className="p-3 border-t border-zinc-200 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
          >
            取消
          </button>
          <button
            disabled={parsedItems.length === 0}
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认录入 ({parsedItems.length} 笔)
          </button>
        </div>
      </div>
    </div>
  );
};
