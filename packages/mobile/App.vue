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
  background-color: #f4f4f5;
  color: #18181b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.mono-num {
  font-family: 'Courier New', Courier, monospace;
  font-variant-numeric: tabular-nums;
}
</style>
