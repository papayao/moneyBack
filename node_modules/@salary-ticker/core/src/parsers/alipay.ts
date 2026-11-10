import Papa from 'papaparse';
import { Transaction } from '../types.js';

export function parseAlipayBill(data: ArrayBuffer | Uint8Array | string): Transaction[] {
  let text = '';

  if (typeof data === 'string') {
    text = data;
  } else {
    // Attempt GBK decode first, fall back to UTF-8
    try {
      const gbkDecoder = new TextDecoder('gbk');
      text = gbkDecoder.decode(data);
      if (!text.includes('支付宝') && !text.includes('交易时间') && !text.includes('金额')) {
        text = new TextDecoder('utf-8').decode(data);
      }
    } catch {
      text = new TextDecoder('utf-8').decode(data);
    }
  }

  const parseResult = Papa.parse(text, { skipEmptyLines: true });
  const rows = parseResult.data as string[][];

  // Locate the header row
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(cell => cell.includes('交易时间') || cell.includes('交易创建时间')) &&
        row.some(cell => cell.includes('金额') || cell.includes('金额（元）'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return [];
  }

  const header = rows[headerIndex].map(col => col.trim());
  const timeIdx = header.findIndex(h => h.includes('交易时间') || h.includes('交易创建时间'));
  const typeIdx = header.findIndex(h => h.includes('收/支'));
  const categoryIdx = header.findIndex(h => h.includes('交易分类'));
  const amountIdx = header.findIndex(h => h.includes('金额'));
  const methodIdx = header.findIndex(h => h.includes('收/付款方式'));
  const targetIdx = header.findIndex(h => h.includes('交易对方'));
  const productIdx = header.findIndex(h => h.includes('商品说明'));

  const transactions: Transaction[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[timeIdx]) continue;
    // Check end boundary (Alipay often has summary at the bottom)
    if (row[0].includes('----------------') || row[0].includes('共') && row[0].includes('笔记录')) {
      break;
    }

    const rawAmount = (row[amountIdx] || '').replace(/[¥￥,\s]/g, '');
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    const rawType = (row[typeIdx] || '').trim();
    let type: 'expense' | 'income' | 'repay' = 'expense';
    if (rawType.includes('收入')) {
      type = 'income';
    } else if (rawType.includes('其他') || rawType.includes('不计收支')) {
      type = 'repay';
    }

    const payMethod = row[methodIdx] || '';
    const isCreditCard = payMethod.includes('信用卡') || payMethod.includes('花呗');

    transactions.push({
      source: 'alipay',
      type,
      category: (row[categoryIdx] || '其他').trim(),
      amount,
      tradeTime: row[timeIdx].trim(),
      remark: `${row[targetIdx] || ''} - ${row[productIdx] || ''}`.trim(),
      isDebtPayment: isCreditCard,
    });
  }

  return transactions;
}
