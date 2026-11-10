<template>
  <view class="container">
    <view class="header-section">
      <text class="title">刚性负债管理</text>
      <text class="subtitle">房贷、车贷及本月信用卡待还金额</text>
    </view>

    <!-- Add Button -->
    <button class="add-btn" @click="showModal = true">
      <text class="add-text">+ 新增负债项</text>
    </button>

    <!-- List -->
    <view class="list">
      <view v-for="item in liabilities" :key="item.id" class="card">
        <view class="card-left">
          <text class="card-title">{{ item.title }}</text>
          <text class="card-desc">每月 {{ item.repayDay }} 日还款 | 剩余 ¥{{ item.remainingAmount }}</text>
        </view>
        <view class="card-right">
          <text class="card-amount mono-num">-¥{{ item.monthlyPayment }}/月</text>
          <text class="del-btn" @click="removeItem(item.id)">删除</text>
        </view>
      </view>
    </view>

    <!-- Add Modal -->
    <view v-if="showModal" class="modal-mask">
      <view class="modal-box">
        <text class="modal-title">添加负债项目</text>
        <input v-model="form.title" class="input" placeholder="名称 (如：按揭房贷)" />
        <input v-model="form.monthlyPayment" type="digit" class="input" placeholder="每月应还金额 (元)" />
        <input v-model="form.remainingAmount" type="digit" class="input" placeholder="剩余总额 (元)" />
        <input v-model="form.repayDay" type="number" class="input" placeholder="每月还款日 (1-31)" />
        <view class="modal-btns">
          <button class="m-btn cancel" @click="showModal = false">取消</button>
          <button class="m-btn confirm" @click="addItem">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      showModal: false,
      form: {
        title: '',
        monthlyPayment: '',
        remainingAmount: '',
        repayDay: '10',
      },
      liabilities: [
        { id: 1, title: '房贷', monthlyPayment: 4200, remainingAmount: 950000, repayDay: 15 },
        { id: 2, title: '车贷', monthlyPayment: 2100, remainingAmount: 48000, repayDay: 20 },
      ],
    };
  },
  mounted() {
    try {
      const saved = uni.getStorageSync('st_liabilities');
      if (saved) this.liabilities = JSON.parse(saved);
    } catch (e) {}
  },
  methods: {
    save() {
      uni.setStorageSync('st_liabilities', JSON.stringify(this.liabilities));
    },
    removeItem(id) {
      this.liabilities = this.liabilities.filter(item => item.id !== id);
      this.save();
    },
    addItem() {
      if (!this.form.title || !this.form.monthlyPayment) return;
      this.liabilities.unshift({
        id: Date.now(),
        title: this.form.title,
        monthlyPayment: parseFloat(this.form.monthlyPayment) || 0,
        remainingAmount: parseFloat(this.form.remainingAmount) || 0,
        repayDay: parseInt(this.form.repayDay) || 10,
      });
      this.save();
      this.showModal = false;
      this.form = { title: '', monthlyPayment: '', remainingAmount: '', repayDay: '10' };
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
  margin-bottom: 24rpx;
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
.add-btn {
  background-color: #27272a;
  border: 1rpx solid #3f3f46;
  border-radius: 4rpx;
  color: #f4f4f5;
  font-size: 24rpx;
  margin-bottom: 24rpx;
}
.card {
  background-color: #18181b;
  border: 1rpx solid #27272a;
  border-radius: 6rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.card-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #f4f4f5;
  display: block;
}
.card-desc {
  font-size: 20rpx;
  color: #71717a;
  margin-top: 6rpx;
  display: block;
}
.card-amount {
  font-size: 26rpx;
  font-weight: bold;
  color: #fb7185;
  display: block;
  text-align: right;
}
.del-btn {
  font-size: 20rpx;
  color: #a1a1aa;
  text-align: right;
  display: block;
  margin-top: 8rpx;
}
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}
.modal-box {
  background-color: #18181b;
  border: 1rpx solid #27272a;
  border-radius: 8rpx;
  padding: 32rpx;
  width: 100%;
}
.modal-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #f4f4f5;
  display: block;
  margin-bottom: 24rpx;
}
.input {
  background-color: #09090b;
  border: 1rpx solid #27272a;
  color: #f4f4f5;
  font-size: 24rpx;
  padding: 16rpx;
  border-radius: 4rpx;
  margin-bottom: 16rpx;
}
.modal-btns {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.m-btn {
  flex: 1;
  font-size: 24rpx;
  border-radius: 4rpx;
}
.cancel {
  background-color: #27272a;
  color: #a1a1aa;
}
.confirm {
  background-color: #f4f4f5;
  color: #09090b;
}
</style>
