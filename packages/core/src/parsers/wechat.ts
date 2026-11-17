import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Transaction } from '../types.js';
import { normalizeBillTransaction, normalizeTradeTime } from '../billAnalysis.js';

function isZipWorkbook(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('gb18030').decode(bytes);
    } catch {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

export function parseWechatBill(data: ArrayBuffer | Uint8Array | string): Transaction[] {
  let rows: any[][];

  if (typeof data === 'string') {
    const normalized = data.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    rows = Papa.parse(normalized, { skipEmptyLines: true }).data as string[][];
  } else {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (isZipWorkbook(bytes)) {
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    } else {
      const text = decodeCsvBytes(bytes)
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
      rows = Papa.parse(text, { skipEmptyLines: true }).data as string[][];
    }
  }

  // Find header line
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (
      Array.isArray(row) &&
      row.some(cell => typeof cell === 'string' && cell.includes('交易时间')) &&
      row.some(cell => typeof cell === 'string' && cell.includes('金额'))
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return [];
  }

  const header = rows[headerIndex].map((col: any) => String(col).trim());
  const timeIdx = header.findIndex(h => h.includes('交易时间'));
  const typeIdx = header.findIndex(h => h.includes('收/支'));
  const categoryIdx = header.findIndex(h => h.includes('交易类型'));
  const amountIdx = header.findIndex(h => h.includes('金额'));
  const methodIdx = header.findIndex(h => h.includes('支付方式'));
  const targetIdx = header.findIndex(h => h.includes('交易对方'));
  const productIdx = header.findIndex(h => h.includes('商品'));
  const statusIdx = header.findIndex(h => h.includes('当前状态'));
  const remarkIdx = header.findIndex(h => h.includes('备注'));

  const transactions: Transaction[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[timeIdx]) continue;

    const tradeTime = normalizeTradeTime(row[timeIdx]);
    if (!tradeTime) continue;

    const status = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : '';
    if (status.includes('交易关闭') || status === '已关闭') continue;

    const rawAmount = String(row[amountIdx] || '').replace(/[¥￥,\s]/g, '');
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    const rawType = typeIdx !== -1 ? String(row[typeIdx] || '').trim() : '';
    let type: 'expense' | 'income' | 'repay' = 'expense';
    if (rawType.includes('收入')) {
      type = 'income';
    } else if (rawType.includes('其他') || rawType.includes('不计收支') || rawType === '/') {
      type = 'repay';
    }

    const payMethod = methodIdx !== -1 ? String(row[methodIdx] || '') : '';
    const isCreditCard = payMethod.includes('信用卡') || type === 'repay';
    const targetRaw = targetIdx !== -1 ? String(row[targetIdx] || '').trim() : '';
    const target = targetRaw === '/' ? '' : targetRaw;
    const productRaw = productIdx !== -1 ? String(row[productIdx] || '').trim() : '';
    const noteRaw = remarkIdx !== -1 ? String(row[remarkIdx] || '').trim() : '';
    const detail =
      noteRaw && noteRaw !== '/'
        ? noteRaw
        : productRaw && productRaw !== '/'
          ? productRaw
          : '';
    const remark = [target, detail].filter(Boolean).join(' - ');

    transactions.push(
      normalizeBillTransaction({
        source: 'wechat',
        type,
        category: String((categoryIdx !== -1 ? row[categoryIdx] : '') || '其他').trim(),
        amount,
        tradeTime,
        remark,
        isDebtPayment: isCreditCard,
      })
    );
  }

  return transactions;
}
