# Design Specification: SalaryTicker (打工人实时资产与负债跳动挂件)

**Date**: 2026-11-10  
**Status**: Approved

---

## 1. Overview & Goals

SalaryTicker 是一款为打工人设计的沉浸式资产与负债可视化工具。  
核心解决：打破传统记账工具“被动繁琐”的缺点，将月薪换算为每秒实时跳动收益，并将房贷、车贷、信用卡等刚性负债以“日均负数开局”秒级抵扣，直观展现从“给银行还贷”到“今日真正为自己净赚”的全过程。

### 平台覆盖
1. **PC 桌面端**: Electron + React + Vite + Tailwind CSS（支持开机自启、系统托盘、透明置顶小窗）。
2. **移动端**: UniApp（Vue 语法，支持离线运行与大字报全屏模式）。
3. **数据存储**: 本地 SQLite，通过 Drizzle ORM 管理热迁移，纯离线无隐私风险。

---

## 2. UI / UX Design Guidelines

- **反 AI 模板化**: 杜绝紫色/蓝色渐变大背景，杜绝夸张大药丸圆角（统一 `rounded-sm` / `rounded-md`）。
- **极简工程质感**: 遵循深色/浅色冷灰工业风，严禁装饰性空洞 Icon，每个界面元素必有明确交互指向。
- **高对比数字**: 数字字体采用等宽字体（Monospace / JetBrains Mono / Inter），确保每秒跳动时不抖动。

---

## 3. System Architecture & Modules

```
salary-ticker/
├── packages/
│   ├── core/                    # 通用计算与解析核心 (TypeScript)
│   │   ├── engine.ts            # 秒薪、日均负债、存钱工时计算
│   │   ├── parsers/             # 微信(.xlsx)与支付宝(.csv)本地纯 JS 解析
│   │   └── schema.ts            # Drizzle ORM 表模型定义
│   ├── desktop/                 # Electron + React + Vite 主工程
│   │   ├── src/                 # React UI 界面
│   │   ├── electron/            # 托盘、开机自启、置顶小窗 IPC 逻辑
│   │   └── db/                  # SQLite 驱动封装 (better-sqlite3)
│   └── mobile/                  # UniApp 移动端工程
│       └── pages/               # 打工时钟、资产看板、手动补录
```

---

## 4. SQLite Schema (via Drizzle ORM)

```typescript
// schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const userProfiles = sqliteTable('user_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthlySalary: real('monthly_salary').notNull(),
  workDaysPerMonth: real('work_days_per_month').default(21.75).notNull(),
  workStartTime: text('work_start_time').default('09:00').notNull(),
  workEndTime: text('work_end_time').default('18:00').notNull(),
  lunchStartTime: text('lunch_start_time').default('12:00').notNull(),
  lunchEndTime: text('lunch_end_time').default('13:30').notNull(),
  targetSavings: real('target_savings').default(0).notNull(),
  currentSavings: real('current_savings').default(0).notNull(),
});

export const liabilities = sqliteTable('liabilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'mortgage' | 'car_loan' | 'credit_card' | 'custom'
  title: text('title').notNull(),
  totalAmount: real('total_amount').notNull(),
  remainingAmount: real('remaining_amount').notNull(),
  monthlyPayment: real('monthly_payment').notNull(),
  repayDay: integer('repay_day').notNull(),
  status: text('status').default('active').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(), // 'wechat' | 'alipay' | 'manual'
  type: text('type').notNull(), // 'expense' | 'income' | 'repay'
  category: text('category').default('其他').notNull(),
  amount: real('amount').notNull(),
  tradeTime: text('trade_time').notNull(),
  remark: text('remark'),
  isDebtPayment: integer('is_debt_payment').default(0).notNull(),
});
```

---

## 5. Mathematical & Ticker Engine

1. **秒薪计算**:
   $$\text{有效工时(秒)} = (\text{下班时间} - \text{上班时间} - \text{午休工时}) \times 3600$$
   $$\text{秒薪} = \frac{\text{月薪}}{\text{月工作日} \times \text{有效工时(秒)}}$$

2. **日均负债成本**:
   $$\text{日均负债} = \frac{\sum \text{所有活跃负债的 monthlyPayment}}{\text{月工作日}}$$

3. **实时金额状态机**:
   - `09:00` 上班开局状态：`CurrentAmount = - (日均负债)`（红色）
   - 每秒自增：`CurrentAmount += 秒薪`
   - 当 `CurrentAmount >= 0` 时变绿，触发“今日开始净赚”状态
   - 午休时间内停止自增，进入“带薪午休/摸鱼”独立计时模式

---

## 6. Bill Parsing Pipeline (Pure JS)

1. **微信账单**:
   - 格式：`.xlsx` 或 `.csv`
   - 过滤前 16 行元数据，定位列 `交易时间`、`收/支`、`金额(元)`、`收/付款方式`
   - 识别付款方式含“信用卡”的记录，标记建议关联为负债还款
2. **支付宝账单**:
   - 格式：`.csv`，使用 `TextDecoder('gbk')` 转码
   - 过滤前 24 行，定位列 `交易创建时间`、`收/支`、`金额（元）`
3. **手动补录与自定义修正**:
   - 任何账单项均支持在列表右键编辑/删除/修改归类，支持直接一键修正剩余总负债与总存款。

---

## 7. Verification & Testing Strategy

1. **计算引擎单元测试**:
   - 覆盖正常上下班、跨零点班次、周末不计费、负债归零临界点。
2. **账单解析集成测试**:
   - 提供脱敏的真实微信 `.xlsx` 与支付宝 `.csv` 样例文件，断言解析正确率 100%。
3. **桌面端与移动端生命周期测试**:
   - 验证 Electron 开机静默后台启动与系统托盘呼出。
   - 验证 UniApp 离线状态本地存储正确读写。
