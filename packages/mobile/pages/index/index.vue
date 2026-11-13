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
      <view class="hero-header-row">
        <view class="flex-row items-center gap-1">
          <text class="hero-label">今日净收入</text>
          <text class="info-icon" @click="showNetInfo">!</text>
        </view>
        <view class="mode-pills">
          <text
            class="mode-pill"
            :class="{ active: incomeDisplayMode === 'main' }"
            @click="incomeDisplayMode = 'main'"
          >主要收入</text>
          <text
            class="mode-pill"
            :class="{ active: incomeDisplayMode === 'total' }"
            @click="incomeDisplayMode = 'total'"
          >总收入</text>
        </view>
      </view>
      <text
        class="hero-amount mono-num"
        :class="isHeroPositive ? 'text-positive' : 'text-negative'"
      >
        {{ formattedNetAmount }}
      </text>
      <text class="hero-sub mono-num">
        ({{ heroHourlyRate }} 元/时)
      </text>
    </view>

    <!-- Breakdown Cards -->
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-title">今日工薪</text>
        <text class="stat-value mono-num text-positive">{{ isPrivacy ? '****' : '¥' + snapshot.earnedToday.toFixed(2) }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-title">今日负债</text>
        <text class="stat-value mono-num text-negative">{{ isPrivacy ? '****' : '¥' + snapshot.dailyDebtCost.toFixed(2) }}</text>
      </view>
      <view class="stat-card stat-card-wide" @click="promptEditLaborEarnings">
        <text class="stat-title">总所得 · 主要收入</text>
        <text class="stat-value mono-num">{{ isPrivacy ? '****' : '¥' + (snapshot.totalLaborEarningsLive || 0).toFixed(2) }}</text>
      </view>
    </view>

    <!-- Debt Payoff Progress Bar (负债进度) -->
    <view v-if="snapshot.totalDebt > 0" class="savings-card debt-card">
      <view class="savings-header">
        <text class="savings-title text-debt">负债情况</text>
        <text class="savings-ratio mono-num text-negative">
          待还: {{ isPrivacy ? '****' : '¥' + snapshot.totalDebtRemainingLive.toFixed(2) }}
        </text>
      </view>
      <view class="progress-track">
        <view class="progress-bar debt-bar" :style="{ width: snapshot.debtPayoffPercent + '%' }"></view>
      </view>
      <view class="savings-footer">
        <text class="footer-hint mono-num">已清偿 {{ snapshot.debtPayoffPercent }}%</text>
        <text class="footer-hint mono-num">预计还清 {{ snapshot.yearsToDebtFree }} 年</text>
      </view>
    </view>

    <!-- Savings Progress Bar -->
    <view class="savings-card">
      <view class="savings-header">
        <text class="savings-title">存钱进度</text>
        <view class="savings-ratio mono-num">
          <text @click="promptEditSavings">{{ isPrivacy ? '***' : '¥' + profile.currentSavings }}</text>
          <text> / </text>
          <text @click="promptEditTarget">{{ isPrivacy ? '***' : '¥' + profile.targetSavings }}</text>
        </view>
      </view>
      <view class="progress-track">
        <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <view class="savings-footer">
        <text class="footer-hint mono-num">{{ progressPercent }}%</text>
        <text class="footer-hint mono-num">剩余 {{ snapshot.remainingTimeFormatted || '0小时 0分钟' }}</text>
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
      incomeDisplayMode: 'main', // 'main' (主要收入) | 'total' (总收入)
      timer: null,
      profile: {
        monthlySalary: 20000,
        workDaysPerMonth: 21.75,
        workStartTime: '09:00',
        workEndTime: '18:00',
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
      incomeSources: [
        { id: 1, type: 'partner', title: '配偶月薪 (妻子/丈夫)', amount: 15000, frequency: 'monthly', status: 'active' },
        { id: 2, type: 'rent', title: '投资房租金', amount: 3200, frequency: 'monthly', status: 'active' },
        { id: 3, type: 'interest', title: '理财利息', amount: 600, frequency: 'monthly', status: 'active' },
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
    heroNetValue() {
      if (this.incomeDisplayMode === 'main') {
        return (this.snapshot.mainLaborEarnedToday || 0) - (this.snapshot.dailyDebtCost || 0);
      }
      return this.snapshot.netToday || 0;
    },
    isHeroPositive() {
      return this.heroNetValue >= 0;
    },
    heroHourlyRate() {
      if (this.incomeDisplayMode === 'main') {
        return (this.snapshot.salaryPerHour || (this.snapshot.salaryPerSecond * 3600)).toFixed(1);
      }
      return ((this.snapshot.totalIncomePerSecond || 0) * 3600).toFixed(1);
    },
    formattedNetAmount() {
      if (this.isPrivacy) return '****';
      const sign = this.heroNetValue >= 0 ? '+' : '-';
      return `${sign}¥${Math.abs(this.heroNetValue).toFixed(2)}`;
    },
    statusText() {
      if (this.snapshot.isWorkingTime) return '计费工作中';
      return '已下班';
    },
    statusClass() {
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
      this.snapshot = calculateTickerSnapshot(
        this.profile,
        this.liabilities,
        new Date(),
        [],
        this.incomeSources
      );
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
    showNetInfo() {
      uni.showToast({
        title: '净收入 = 今日收入 - 今日负债',
        icon: 'none',
        duration: 2500,
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
  background-color: transparent;
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
  background-color: rgba(120, 120, 128, 0.12);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 10rpx;
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
  background-color: rgba(120, 120, 128, 0.12);
  color: #71717a;
  border-color: #e4e4e7;
}

.actions {
  display: flex;
  gap: 16rpx;
}

.icon-btn {
  background-color: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1rpx 0 rgba(255,255,255,0.8) inset, 0 8rpx 32rpx rgba(0,0,0,0.06);
  border: 1rpx solid #e4e4e7;
  color: #18181b;
  font-size: 22rpx;
  padding: 6rpx 18rpx;
  line-height: 1.5;
  border-radius: 10rpx;
  margin: 0;
}

.hero-card {
  background-color: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1rpx 0 rgba(255,255,255,0.8) inset, 0 8rpx 32rpx rgba(0,0,0,0.06);
  border: 1rpx solid #e4e4e7;
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  text-align: center;
  margin-bottom: 24rpx;
}

.hero-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.mode-pills {
  display: flex;
  background-color: rgba(120, 120, 128, 0.12);
  border-radius: 14rpx;
  padding: 4rpx;
}

.mode-pill {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 10rpx;
  color: #71717a;
}

.mode-pill.active {
  background-color: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1rpx 0 rgba(255,255,255,0.8) inset, 0 8rpx 32rpx rgba(0,0,0,0.06);
  color: #18181b;
  font-weight: 600;
  box-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.05);
}

.hero-label {
  font-size: 22rpx;
  color: #71717a;
  display: block;
}

.info-icon {
  width: 28rpx;
  height: 28rpx;
  line-height: 26rpx;
  text-align: center;
  border-radius: 50%;
  border: 1rpx solid #d4d4d8;
  color: #71717a;
  font-size: 20rpx;
  font-weight: bold;
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
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1rpx 0 rgba(255,255,255,0.8) inset, 0 8rpx 32rpx rgba(0,0,0,0.06);
  border: 1rpx solid #e4e4e7;
  border-radius: 20rpx;
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
  background-color: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1rpx 0 rgba(255,255,255,0.8) inset, 0 8rpx 32rpx rgba(0,0,0,0.06);
  border: 1rpx solid #e4e4e7;
  border-radius: 20rpx;
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
  background-color: rgba(120, 120, 128, 0.12);
  border: 1rpx solid #e4e4e7;
  border-radius: 10rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.progress-bar {
  height: 100%;
  background-color: #10b981;
  border-radius: 10rpx;
}

.savings-footer {
  display: flex;
  justify-content: space-between;
}

.footer-hint {
  font-size: 20rpx;
  color: #71717a;
}
.stat-card-wide {
  flex: 1 1 100%;
}
</style>

