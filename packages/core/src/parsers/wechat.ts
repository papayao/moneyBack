import * as XLSX from 'xlsx';
import { Transaction } from '../types.js';

export function parseWechatBill(data: ArrayBuffer | Uint8Array | string): Transaction[] {
  let rows: any[][];

  if (typeof data === 'string') {
    const workbook = XLSX.read(data, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  } else {
    const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }

  // Find header line
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.includes('交易时间') && row.some(c => typeof c === 'string' && c.includes('金额')))) {
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
  const remarkIdx = header.findIndex(h => h.includes('备注'));

  const transactions: Transaction[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[timeIdx]) continue;

    const rawAmount = String(row[amountIdx] || '').replace(/[¥￥,\s]/g, '');
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    const rawType = String(row[typeIdx] || '').trim();
    let type: 'expense' | 'income' | 'repay' = 'expense';
    if (rawType.includes('收入')) {
      type = 'income';
    } else if (rawType.includes('其他')) {
      type = 'repay';
    }

    const payMethod = String(row[methodIdx] || '');
    const isCreditCard = payMethod.includes('信用卡');

    transactions.push({
      source: 'wechat',
      type,
      category: String(row[categoryIdx] || '其他').trim(),
      amount,
      tradeTime: String(row[timeIdx]).trim(),
      remark: `${row[targetIdx] || ''} - ${row[remarkIdx] || ''}`.trim(),
      isDebtPayment: isCreditCard,
    });
  }

  return transactions;
}
