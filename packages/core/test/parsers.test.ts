import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseAlipayBill } from '../src/parsers/alipay.js';
import { parseWechatBill } from '../src/parsers/wechat.js';
import { extractTxDateKey, filterTransactionsByDateRange } from '../src/billAnalysis.js';

describe('Bill Parsers', () => {
  it('parses Alipay CSV with mixed CRLF preamble and LF data rows', () => {
    const csv =
      '------------------------------------------------------------------------------------\r\n' +
      '导出信息：\r\n' +
      '共3笔记录\r\n' +
      '------------------------支付宝支付科技有限公司  电子客户回单------------------------\r\n' +
      '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,\n' +
      '2026-11-10 12:43:28,餐饮美食,早餐店,152******02,收钱码收款,支出,12.00,上海银行信用购,交易成功,1001\t,2001\t,,\n' +
      '2026-11-09 10:00:00,信用借还,花呗,/,主动还款,不计收支,903.93,储蓄卡,还款成功,1002\t,2002\t,,\n' +
      '2026-11-08 09:00:00,转账红包,朋友,/,红包,收入,50.00,余额,交易成功,1003\t,2003\t,,\n';

    const txs = parseAlipayBill(csv);
    expect(txs).toHaveLength(3);
    expect(txs[0]).toMatchObject({
      source: 'alipay',
      type: 'expense',
      category: '餐饮美食',
      amount: 12,
      isDebtPayment: true,
    });
    expect(txs[1]).toMatchObject({
      source: 'alipay',
      type: 'repay',
      amount: 903.93,
      isDebtPayment: true,
    });
    expect(txs[2]).toMatchObject({
      source: 'alipay',
      type: 'income',
      amount: 50,
    });
  });

  it('parses WeChat CSV with CRLF/LF normalized rows', () => {
    const csv =
      '微信支付账单明细\r\n' +
      '交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注\n' +
      '2026-11-10 18:00:00,商户消费,便利店,零食,支出,¥18.50,招商银行信用卡(1234),支付成功,wx1,m1,晚餐\n';

    const txs = parseWechatBill(csv);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      source: 'wechat',
      type: 'expense',
      amount: 18.5,
      isDebtPayment: true,
      remark: '便利店 - 晚餐',
    });
  });

  it('converts WeChat xlsx Excel serial dates to YYYY-MM-DD HH:mm:ss and supports date range filtering', () => {
    const aoa = [
      ['微信支付账单明细列表'],
      ['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额(元)', '支付方式', '当前状态', '交易单号', '商户单号', '备注'],
      [46336.35241898148, '商户消费', 'luckin coffee', '/', '支出', '¥10.50', '零钱', '支付成功', '1', '2', '/'],
      [46305.61607638889, '转账', '好友', '/', '收入', '¥4500.00', '零钱', '已存入零钱', '3', '4', '/'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const txs = parseWechatBill(buf);
    expect(txs).toHaveLength(2);
    expect(txs[0].tradeTime).toBe('2026-11-10 08:27:29');
    expect(txs[0].remark).toBe('luckin coffee');
    expect(txs[1].tradeTime).toBe('2026-10-10 14:47:09');
    expect(extractTxDateKey('46336.35241898148')).toBe('2026-11-10');

    const novOnly = filterTransactionsByDateRange(txs, {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
    expect(novOnly).toHaveLength(1);
    expect(novOnly[0].amount).toBe(10.5);
  });
});
