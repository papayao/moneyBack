import Papa from 'papaparse';
import { Transaction } from '../types.js';
import { normalizeBillTransaction } from '../billAnalysis.js';

function decodeBillText(data: ArrayBuffer | Uint8Array | string): string {
  if (typeof data === 'string') return data;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  // Try strict UTF-8 first; invalid UTF-8 sequences (e.g. GBK/GB18030 Chinese) throw immediately
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (utf8.includes('交易时间') || utf8.includes('支付宝') || utf8.includes('金额')) {
      return utf8;
    }
  } catch {
    // Not valid UTF-8, fall through to GB18030/GBK
  }

  try {
    return new TextDecoder('gb18030').decode(bytes);
  } catch {
    try {
      return new TextDecoder('gbk').decode(bytes);
    } catch {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

export function parseAlipayBill(data: ArrayBuffer | Uint8Array | string): Transaction[] {
  // Alipay CSVs often mix \r\n in the preamble and \n in data rows; normalize before Papa.parse
  const text = decodeBillText(data)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const parseResult = Papa.parse(text, {
    skipEmptyLines: true,
    delimiter: ',',
  });
  const rows = parseResult.data as string[][];

  // Locate the header row
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (
      row.some(cell => cell.includes('交易时间') || cell.includes('交易创建时间')) &&
      row.some(cell => cell.includes('金额') || cell.includes('金额（元）'))
    ) {
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
  const statusIdx = header.findIndex(h => h.includes('交易状态'));
  const targetIdx = header.findIndex(h => h.includes('交易对方'));
  const productIdx = header.findIndex(h => h.includes('商品说明'));

  const transactions: Transaction[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const firstCell = (row[0] || '').trim();
    if (firstCell.includes('----------------') || (firstCell.includes('共') && firstCell.includes('笔记录'))) {
      break;
    }

    const tradeTime = (row[timeIdx] || '').trim();
    if (!tradeTime) continue;

    const status = statusIdx !== -1 ? (row[statusIdx] || '').trim() : '';
    if (status.includes('交易关闭') || status === '已关闭') continue;

    const rawAmount = (row[amountIdx] || '').replace(/[¥￥,\s]/g, '');
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    const rawType = typeIdx !== -1 ? (row[typeIdx] || '').trim() : '';
    let type: 'expense' | 'income' | 'repay' = 'expense';
    if (rawType.includes('收入')) {
      type = 'income';
    } else if (rawType.includes('其他') || rawType.includes('不计收支')) {
      type = 'repay';
    }

    const payMethod = methodIdx !== -1 ? (row[methodIdx] || '').trim() : '';
    const isCreditCard =
      payMethod.includes('信用卡') ||
      payMethod.includes('花呗') ||
      payMethod.includes('信用购') ||
      type === 'repay';

    const target = targetIdx !== -1 ? (row[targetIdx] || '').trim() : '';
    const product = productIdx !== -1 ? (row[productIdx] || '').trim() : '';
    const remark = [target, product].filter(Boolean).join(' - ');

    const isRefund = status.includes('退款成功') || product.includes('退款');
    if (isRefund && type === 'repay') {
      // 支付宝退回原渠道有时标“不计收支”且状态“退款成功”，保持不计收支避免重复冲减；仅对标记“收入”的退款做冲销
    }

    transactions.push(
      normalizeBillTransaction({
        source: 'alipay',
        type,
        category: (categoryIdx !== -1 ? row[categoryIdx] : '')?.trim() || '其他',
        amount,
        tradeTime,
        remark,
        isDebtPayment: isCreditCard,
      })
    );
  }

  return transactions;
}
