Page({
  data: {
    theme: "dark",
    fontSize: 16
  },
  toggleTheme(e) {
    const theme = e.detail.value ? "dark" : "light";
    this.setData({ theme });
    // 模拟保存设置
    console.log("主题切换为：", theme);
  },
  changeFontSize(e) {
    const fontSize = e.detail.value;
    this.setData({ fontSize });
    // 模拟保存设置
    console.log("字体大小设置为：", fontSize);
  },
  goBack() {
    wx.navigateBack();
  }
});
