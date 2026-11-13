<script>
export default {
  onLaunch: function () {
    console.log('SalaryTicker App Launch');
  },
  onShow: function () {
    console.log('SalaryTicker App Show');
  },
  onHide: function () {
    console.log('SalaryTicker App Hide');
  },
};
</script>

<style>
page {
  background-color: #f2f2f7;
  background-image:
    radial-gradient(at 12% 8%, rgba(255, 214, 165, 0.45) 0, transparent 45%),
    radial-gradient(at 88% 20%, rgba(186, 230, 210, 0.45) 0, transparent 45%),
    radial-gradient(at 50% 100%, rgba(229, 229, 234, 0.9) 0, transparent 60%);
  background-attachment: fixed;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
}

.mono-num {
  font-family: -apple-system, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
</style>
