import React, { useState, useRef } from 'react';
import { parseWechatBill, parseAlipayBill, Transaction } from '@moneyback/core';
import { X, Upload, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface BillImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (transactions: Transaction[]) => void;
}

function detectCsvSource(fileName: string, buffer: ArrayBuffer): 'alipay' | 'wechat' | null {
  if (fileName.includes('支付宝')) return 'alipay';
  if (fileName.includes('微信')) return 'wechat';

  const bytes = new Uint8Array(buffer.slice(0, 4096));
  const previews: string[] = [];
  try {
    previews.push(new TextDecoder('utf-8').decode(bytes));
  } catch {
    // Ignore
  }
  try {
    previews.push(new TextDecoder('gb18030').decode(bytes));
  } catch {
    // Ignore
  }

  for (const text of previews) {
    if (text.includes('支付宝') || text.includes('收/付款方式')) return 'alipay';
    if (text.includes('微信支付') || text.includes('支付方式')) return 'wechat';
  }
  return null;
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
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setParsedItems([]);
    setFileName('');
    setErrorMsg('');
    setIsDragging(false);
    setIsProcessing(false);
    onClose();
  };

  const processFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith('.csv');
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setParsedItems([]);
      setFileName(file.name);
      setErrorMsg('仅支持导入 .csv 或 .xlsx 格式的微信/支付宝账单文件。');
      return;
    }

    setErrorMsg('');
    setParsedItems([]);
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (isCsv) {
          const detected = detectCsvSource(file.name, buffer);
          const effectiveSource = detected ?? sourceType;
          if (detected && detected !== sourceType) {
            setSourceType(detected);
          }

          let items =
            effectiveSource === 'alipay'
              ? parseAlipayBill(buffer)
              : parseWechatBill(buffer);

          // Fallback try the other parser if auto-detection wasn't conclusive
          if (items.length === 0 && !detected) {
            const altSource = effectiveSource === 'alipay' ? 'wechat' : 'alipay';
            const altItems =
              altSource === 'alipay' ? parseAlipayBill(buffer) : parseWechatBill(buffer);
            if (altItems.length > 0) {
              items = altItems;
              setSourceType(altSource);
            }
          }

          if (items.length === 0) {
            setErrorMsg('未能解析出有效账单记录，请确认文件为支付宝或微信导出的原始账单。');
          } else {
            setParsedItems(items);
          }
        } else {
          setSourceType('wechat');
          const items = parseWechatBill(buffer);
          if (items.length === 0) {
            setErrorMsg('未能解析出有效账单记录，请确保是微信导出的原生 Excel。');
          } else {
            setParsedItems(items);
          }
        }
      } catch (err: any) {
        setErrorMsg(`解析失败: ${err?.message || '未知格式错误'}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('文件读取失败，请重试。');
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
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
    resetAndClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
      onDragOver={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
    >
      <div className="bg-white border border-zinc-200 rounded-md w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl text-zinc-900">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-900">导入账单</h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Source Selection */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceType('wechat')}
              className={`flex-1 py-1.5 px-3 text-xs rounded-sm border font-medium transition cursor-pointer ${
                sourceType === 'wechat'
                  ? 'bg-white border-zinc-400 text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              微信支付账单 (.xlsx / .csv)
            </button>
            <button
              type="button"
              onClick={() => setSourceType('alipay')}
              className={`flex-1 py-1.5 px-3 text-xs rounded-sm border font-medium transition cursor-pointer ${
                sourceType === 'alipay'
                  ? 'bg-white border-zinc-400 text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              支付宝账单 (.csv)
            </button>
          </div>

          {/* Upload & Drag-Drop Area */}
          <label
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition ${
              isDragging
                ? 'border-zinc-900 bg-zinc-100'
                : 'border-zinc-300 hover:border-zinc-500 bg-zinc-50/60 hover:bg-zinc-50'
            }`}
          >
            <Upload
              className={`w-6 h-6 mb-2 pointer-events-none transition ${
                isDragging ? 'text-zinc-900 scale-110' : 'text-zinc-500'
              }`}
            />
            <span className="text-xs text-zinc-800 font-medium pointer-events-none">
              {isProcessing
                ? '正在解析账单...'
                : isDragging
                  ? '松开鼠标立即导入'
                  : fileName
                    ? fileName
                    : '点击选择账单文件或将文件拖入此处'}
            </span>
            <span className="text-[11px] text-zinc-500 mt-1 pointer-events-none">
              自动识别微信/支付宝格式 · 本地内存即时解析，绝不上传服务器
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">解析流水</div>
                  <div className="text-sm font-semibold font-mono text-zinc-900">{parsedItems.length} 笔</div>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">总支出</div>
                  <div className="text-sm font-semibold font-mono text-rose-600">¥{totalExpense.toFixed(2)}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">总收入</div>
                  <div className="text-sm font-semibold font-mono text-emerald-600">¥{totalIncome.toFixed(2)}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-sm text-center">
                  <div className="text-[11px] text-zinc-500">信用消费/还款</div>
                  <div className="text-sm font-semibold font-mono text-zinc-800">{creditCardCount} 笔</div>
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
                    {parsedItems.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="p-2 text-zinc-500 whitespace-nowrap">{item.tradeTime}</td>
                        <td className="p-2 text-zinc-800 whitespace-nowrap">{item.category}</td>
                        <td className="p-2 text-zinc-500 truncate max-w-xs">{item.remark || '-'}</td>
                        <td
                          className={`p-2 text-right font-semibold whitespace-nowrap ${
                            item.type === 'income'
                              ? 'text-emerald-600'
                              : item.type === 'repay'
                                ? 'text-zinc-500'
                                : 'text-zinc-900'
                          }`}
                        >
                          {item.type === 'income'
                            ? `+¥${item.amount.toFixed(2)}`
                            : item.type === 'repay'
                              ? `¥${item.amount.toFixed(2)} (不计收支)`
                              : `-¥${item.amount.toFixed(2)}`}
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
            type="button"
            onClick={resetAndClose}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            disabled={parsedItems.length === 0}
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            确认录入 ({parsedItems.length} 笔)
          </button>
        </div>
      </div>
    </div>
  );
};
