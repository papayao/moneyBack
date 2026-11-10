<template>
  <view class="container">
    <view class="header-section">
      <text class="title">工时与薪资配置</text>
      <text class="subtitle">用于精确计算每秒收入与存钱剩余工时</text>
    </view>

    <view class="form-box">
      <view class="form-item">
        <text class="label">月收入 (元/月)</text>
        <input v-model="profile.monthlySalary" type="digit" class="input" />
      </view>

      <view class="form-item">
        <text class="label">月工作天数 (默认 21.75 天)</text>
        <input v-model="profile.workDaysPerMonth" type="digit" class="input" />
      </view>

      <view class="form-row">
        <view class="form-item half">
          <text class="label">上班时间</text>
          <input v-model="profile.workStartTime" class="input" />
        </view>
        <view class="form-item half">
          <text class="label">下班时间</text>
          <input v-model="profile.workEndTime" class="input" />
        </view>
      </view>

      <view class="form-row">
        <view class="form-item half">
          <text class="label">午休开始</text>
          <input v-model="profile.lunchStartTime" class="input" />
        </view>
        <view class="form-item half">
          <text class="label">午休结束</text>
          <input v-model="profile.lunchEndTime" class="input" />
        </view>
      </view>

      <button class="save-btn" @click="saveProfile">
        <text class="save-text">保存配置</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      profile: {
        monthlySalary: 20000,
        workDaysPerMonth: 21.75,
        workStartTime: '09:00',
        workEndTime: '18:00',
        lunchStartTime: '12:00',
        lunchEndTime: '13:30',
        targetSavings: 100000,
        currentSavings: 35000,
      },
    };
  },
  mounted() {
    try {
      const saved = uni.getStorageSync('st_profile');
      if (saved) this.profile = JSON.parse(saved);
    } catch (e) {}
  },
  methods: {
    saveProfile() {
      uni.setStorageSync('st_profile', JSON.stringify(this.profile));
      uni.showToast({
        title: '已保存',
        icon: 'success',
      });
    },
  },
};
</script>

<style scoped>
.container {
  padding: 32rpx;
  background-color: #09090b;
  min-height: 100vh;
}
.header-section {
  margin-bottom: 32rpx;
}
.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #f4f4f5;
  display: block;
}
.subtitle {
  font-size: 22rpx;
  color: #71717a;
  margin-top: 8rpx;
  display: block;
}
.form-box {
  background-color: #18181b;
  border: 1rpx solid #27272a;
  border-radius: 8rpx;
  padding: 24rpx;
}
.form-item {
  margin-bottom: 24rpx;
}
.form-row {
  display: flex;
  gap: 20rpx;
}
.half {
  flex: 1;
}
.label {
  font-size: 22rpx;
  color: #a1a1aa;
  margin-bottom: 8rpx;
  display: block;
}
.input {
  background-color: #09090b;
  border: 1rpx solid #27272a;
  border-radius: 4rpx;
  color: #f4f4f5;
  font-size: 26rpx;
  padding: 16rpx;
  font-family: monospace;
}
.save-btn {
  background-color: #f4f4f5;
  color: #09090b;
  font-size: 26rpx;
  font-weight: bold;
  border-radius: 4rpx;
  margin-top: 16rpx;
}
</style>
