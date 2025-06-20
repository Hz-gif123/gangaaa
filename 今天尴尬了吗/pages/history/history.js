Page({
  data: {
    history: []
  },
  onLoad() {
    // 模拟加载历史记录
    this.setData({
      history: [
        "用户：你好",
        "AI：你好，有什么可以帮你的吗？",
        "用户：今天的天气怎么样？",
        "AI：今天是晴天，适合出门哦！"
      ]
    });
  },
  goBack() {
    wx.navigateBack();
  }
});
