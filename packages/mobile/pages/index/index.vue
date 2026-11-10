<template>
  <view class="container" :class="{ 'landscape-mode': isLandscape }">
    <!-- Top Action Bar -->
    <view class="top-bar">
      <view class="status-badge" :class="statusClass">
        <text class="status-text">{{ statusText }}</text>
      </view>

      <view class="actions">
        <button class="icon-btn" @click="togglePrivacy">
          <text class="btn-text">{{ isPrivacy ? '🔒' : '👁️' }}</text>
        </button>
        <button class="icon-btn" @click="toggleLandscape">
          <text class="btn-text">{{ isLandscape ? '📱 竖屏' : '🖥️ 横屏时钟' }}</text>
        </button>
      </view>
    </view>

    <!-- Main Hero Live Net Amount -->
    <view class="hero-card">
      <text class="hero-label">今日净计费 (已对冲日均负债)</text>
      <text
        class="hero-amount mono-num"
        :class="snapshot.isNetPositive ? 'text-positive' : 'text-negative'"
      >
        {{ formattedNetAmount }}
      </text>
      <text class="hero-sub mono-num">
        {{ snapshot.isNetPositive ? '今日已实现净盈余' : '正在对冲今日硬性负债' }}
        ({{ (snapshot.salaryPerSecond * 3600).toFixed(1) }} 元/时)
      </text>
    </view>

    <!-- Breakdown Cards -->
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-title">今日劳动所得</text>
        <text class="stat-value mono-num text-positive">{{ isPrivacy ? '****' : '¥' + snapshot.earnedToday.toFixed(2) }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-title">今日负债均摊</text>
        <text class="stat-value mono-num text-negative">{{ isPrivacy ? '****' : '¥' + snapshot.dailyDebtCost.toFixed(2) }}</text>
      </view>
    </view>

    <!-- Lifetime Totals (总劳动所得 & 累计总花费含负债) -->
    <view class="stats-grid">
      <view class="stat-card" @click="promptEditLaborEarnings">
        <text class="stat-title">总劳动所得 (点此修改)</text>
        <text class="stat-value mono-num text-positive">
          {{ isPrivacy ? '****' : '¥' + (snapshot.totalLaborEarningsLive ? snapshot.totalLaborEarningsLive.toFixed(2) : '0.00') }}
        </text>
        <text class="stat-sub mono-num">含今日已赚 +¥{{ snapshot.earnedToday.toFixed(2) }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-title">总花费 (含负债)</text>
        <text class="stat-value mono-num text-debt">
          {{ isPrivacy ? '****' : '¥' + (snapshot.totalExpensesLive ? snapshot.totalExpensesLive.toFixed(2) : '0.00') }}
        </text>
        <text class="stat-sub mono-num">生活 ¥{{ (snapshot.totalLivingExpenses || 0).toFixed(0) }} + 负债 ¥{{ (snapshot.totalDebt || 0).toFixed(0) }}</text>
      </view>
    </view>

    <!-- Debt Payoff Progress Bar (负债消减进度) -->
    <view v-if="snapshot.totalDebt > 0" class="savings-card debt-card">
      <view class="savings-header">
        <text class="savings-title text-debt">负债实时消减进度</text>
        <text class="savings-ratio mono-num text-negative">
          剩余: {{ isPrivacy ? '****' : '¥' + snapshot.totalDebtRemainingLive.toFixed(2) }}
        </text>
      </view>
      <view class="progress-track">
        <view class="progress-bar debt-bar" :style="{ width: snapshot.debtPayoffPercent + '%' }"></view>
      </view>
      <view class="savings-footer">
        <text class="footer-hint mono-num">已还清 {{ snapshot.debtPayoffPercent }}%</text>
        <text class="footer-hint mono-num">自由还需 {{ snapshot.yearsToDebtFree }} 年</text>
      </view>
    </view>

    <!-- Savings Progress Bar -->
    <view class="savings-card">
      <view class="savings-header">
        <text class="savings-title">存钱目标进度</text>
        <view class="savings-ratio mono-num">
          <text @click="promptEditSavings">{{ isPrivacy ? '***' : '¥' + profile.currentSavings }}</text>
          <text> / </text>
          <text @click="promptEditTarget">{{ isPrivacy ? '***' : '¥' + profile.targetSavings }} (点数字修改)</text>
        </view>
      </view>
      <view class="progress-track">
        <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <view class="savings-footer">
        <text class="footer-hint mono-num">{{ progressPercent }}% 已达成</text>
        <text class="footer-hint mono-num">还需打工 {{ snapshot.remainingTimeFormatted || '0小时 0分钟' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  calculateTickerSnapshot,
} from '@salary-ticker/core';

export default {
  data() {
    return {
      isPrivacy: false,
      isLandscape: false,
      timer: null,
      profile: {
        monthlySalary: 20000,
        workDaysPerMonth: 21.75,
        workStartTime: '09:00',
        workEndTime: '18:00',
        lunchStartTime: '12:00',
        lunchEndTime: '13:30',
        targetSavings: 100000,
        currentSavings: 35000,
        baseLaborEarnings: 500000,
      },
      liabilities: [
        {
          id: 1,
          type: 'mortgage',
          title: '房贷',
          totalAmount: 1200000,
          remainingAmount: 950000,
          monthlyPayment: 4200,
          repayDay: 15,
          status: 'active',
        },
        {
          id: 2,
          type: 'car_loan',
          title: '车贷',
          totalAmount: 150000,
          remainingAmount: 48000,
          monthlyPayment: 2100,
          repayDay: 20,
          status: 'active',
        },
      ],
      snapshot: {
        earnedToday: 0,
        dailyDebtCost: 0,
        netToday: 0,
        isNetPositive: false,
        salaryPerSecond: 0,
        hoursWorkedToday: 0,
        hoursRemainingToSavingsTarget: 0,
        isWorkingTime: false,
        isLunchBreak: false,
      },
    };
  },
  computed: {
    formattedNetAmount() {
      if (this.isPrivacy) return '****';
      const sign = this.snapshot.netToday >= 0 ? '+' : '-';
      return `${sign}¥${Math.abs(this.snapshot.netToday).toFixed(2)}`;
    },
    statusText() {
      if (this.snapshot.isLunchBreak) return '午休摸鱼中';
      if (this.snapshot.isWorkingTime) return '计费工作中';
      return '已下班';
    },
    statusClass() {
      if (this.snapshot.isLunchBreak) return 'badge-lunch';
      if (this.snapshot.isWorkingTime) return 'badge-work';
      return 'badge-off';
    },
    progressPercent() {
      if (this.profile.targetSavings <= 0) return 0;
      const pct = (this.profile.currentSavings / this.profile.targetSavings) * 100;
      return Math.min(100, Math.max(0, pct)).toFixed(1);
    },
  },
  mounted() {
    this.loadData();
    this.tick();
    this.timer = setInterval(this.tick, 1000);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
  },
  methods: {
    loadData() {
      try {
        const savedProfile = uni.getStorageSync('st_profile');
        if (savedProfile) this.profile = JSON.parse(savedProfile);
        const savedLiabilities = uni.getStorageSync('st_liabilities');
        if (savedLiabilities) this.liabilities = JSON.parse(savedLiabilities);
      } catch (e) {
        console.error(e);
      }
    },
    tick() {
      this.snapshot = calculateTickerSnapshot(this.profile, this.liabilities, new Date());
    },
    togglePrivacy() {
      this.isPrivacy = !this.isPrivacy;
    },
    toggleLandscape() {
      this.isLandscape = !this.isLandscape;
    },
    promptEditSavings() {
      uni.showModal({
        title: '修改当前存款',
        editable: true,
        placeholderText: '请输入最新存款金额 (元)',
        content: String(this.profile.currentSavings),
        success: (res) => {
          if (res.confirm && res.content) {
            const val = parseFloat(res.content);
            if (!isNaN(val)) {
              this.profile.currentSavings = val;
              uni.setStorageSync('st_profile', JSON.stringify(this.profile));
              this.tick();
            }
          }
        },
      });
    },
    promptEditTarget() {
      uni.showModal({
        title: '修改存钱总目标',
        editable: true,
        placeholderText: '请输入存钱总目标 (元)',
        content: String(this.profile.targetSavings),
        success: (res) => {
          if (res.confirm && res.content) {
            const val = parseFloat(res.content);
            if (!isNaN(val)) {
              this.profile.targetSavings = val;
              uni.setStorageSync('st_profile', JSON.stringify(this.profile));
              this.tick();
            }
          }
        },
      });
    },
    promptEditLaborEarnings() {
      uni.showModal({
        title: '修改累计总劳动所得基准',
        editable: true,
        placeholderText: '请输入工作以来累计总劳动所得 (元)',
        content: String(this.profile.baseLaborEarnings || 500000),
        success: (res) => {
          if (res.confirm && res.content) {
            const val = parseFloat(res.content);
            if (!isNaN(val)) {
              this.profile.baseLaborEarnings = val;
              uni.setStorageSync('st_profile', JSON.stringify(this.profile));
              this.tick();
            }
          }
        },
      });
    },
  },
};
</script>

<style scoped>
.container {
  padding: 32rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: #f4f4f5;
  color: #18181b;
}

.landscape-mode {
  transform: rotate(90deg);
  transform-origin: center center;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vh;
  height: 100vw;
  background-color: #f4f4f5;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  border-width: 1rpx;
  border-style: solid;
}

.badge-work {
  background-color: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

.badge-lunch {
  background-color: #fffbeb;
  color: #d97706;
  border-color: #fde68a;
}

.badge-off {
  background-color: #f4f4f5;
  color: #71717a;
  border-color: #e4e4e7;
}

.actions {
  display: flex;
  gap: 16rpx;
}

.icon-btn {
  background-color: #ffffff;
  border: 1rpx solid #e4e4e7;
  color: #18181b;
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  line-height: 1.5;
  border-radius: 4rpx;
  margin: 0;
}

.hero-card {
  background-color: #ffffff;
  border: 1rpx solid #e4e4e7;
  border-radius: 8rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  margin-bottom: 24rpx;
}

.hero-label {
  font-size: 22rpx;
  color: #71717a;
  margin-bottom: 16rpx;
  display: block;
}

.hero-amount {
  font-size: 68rpx;
  font-weight: bold;
  display: block;
  letter-spacing: -2rpx;
}

.text-positive {
  color: #16a34a;
}

.text-negative {
  color: #dc2626;
}

.hero-sub {
  font-size: 22rpx;
  color: #71717a;
  margin-top: 16rpx;
  display: block;
}

.stats-grid {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  flex: 1;
  background-color: #ffffff;
  border: 1rpx solid #e4e4e7;
  border-radius: 8rpx;
  padding: 24rpx;
}

.stat-title {
  font-size: 22rpx;
  color: #71717a;
  display: block;
  margin-bottom: 8rpx;
}

.stat-value {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
}

.stat-sub {
  font-size: 20rpx;
  color: #a1a1aa;
  display: block;
  margin-top: 6rpx;
}

.savings-card {
  background-color: #ffffff;
  border: 1rpx solid #e4e4e7;
  border-radius: 8rpx;
  padding: 28rpx;
}

.debt-card {
  margin-bottom: 24rpx;
}

.debt-bar {
  background-color: #ef4444;
}

.text-debt {
  color: #dc2626;
}

.savings-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.savings-title {
  font-size: 24rpx;
  color: #18181b;
  font-weight: 500;
}

.savings-ratio {
  font-size: 22rpx;
  color: #71717a;
}

.progress-track {
  height: 12rpx;
  background-color: #f4f4f5;
  border: 1rpx solid #e4e4e7;
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.progress-bar {
  height: 100%;
  background-color: #10b981;
  border-radius: 4rpx;
}

.savings-footer {
  display: flex;
  justify-content: space-between;
}

.footer-hint {
  font-size: 20rpx;
  color: #71717a;
}
</style>
