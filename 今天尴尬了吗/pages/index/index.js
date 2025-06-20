Page({
  data: {
    features: [
      {
        icon: '🎲',
        text: '随机生成尴尬场景'
      },
      {
        icon: '🤖',
        text: 'AI 角色扮演对话'
      },
      {
        icon: '💡',
        text: '真实社交情境体验'
      }
    ]
  },

  onLoad() {
    // 页面加载时的逻辑
  },

  startChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    })
  },

  chooseScene(e) {
    const scene = e.currentTarget.dataset.scene;
    wx.navigateTo({
      url: `/pages/chat/chat?scene=${encodeURIComponent(scene)}`
    });
  },

  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  }
});
