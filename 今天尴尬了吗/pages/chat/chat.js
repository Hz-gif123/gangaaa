Page({
  data: {
    scene: "",
    role: "",
    messages: [],
    inputValue: "",
    isTyping: false,
    scrollToMessage: "",
    isGenerating: false,
    retryCount: 0,
    maxRetries: 3,
    serverUrl: 'http://localhost:3000', // 填入你的本地服务器地址
    isConnected: false,
    lastError: null,
    lastErrorTime: null
  },

  onLoad: function(options) {
    this.checkApiStatus();
    // 定期检查服务器状态
    this.statusCheckInterval = setInterval(() => {
      this.checkApiStatus();
    }, 30000); // 每30秒检查一次
  },

  onUnload: function() {
    // 清理定时器
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  },

  // 检查API状态
  checkApiStatus: function() {
    wx.request({
      url: this.data.serverUrl + '/api/status',
      method: 'GET',
      success: (res) => {
        const isConnected = res.statusCode === 200 && res.data.status === 'ok';
        this.setData({ 
          isConnected,
          lastError: isConnected ? null : '服务暂时不可用',
          lastErrorTime: isConnected ? null : new Date().toISOString()
        });
        if (isConnected && !this.data.scene) {
          this.generateNewScenario();
        }
      },
      fail: () => {
        this.setData({ 
          isConnected: false,
          lastError: '无法连接到服务器',
          lastErrorTime: new Date().toISOString()
        });
      }
    });
  },

  onInput: function(e) {
    this.setData({ inputValue: e.detail.value });
  },

  sendMsg: function() {
    if (!this.data.isConnected) {
      wx.showToast({
        title: '服务器未连接',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    var msg = this.data.inputValue.trim();
    if (!msg) return;

    this.addMessage("user", msg);
    this.setData({ 
      inputValue: "",
      isTyping: true
    });

    // 调用AI接口获取回复
    wx.request({
      url: this.data.serverUrl + '/api/get-response',
      method: 'POST',
      data: {
        message: msg,
        scenario: this.data.scene,
        role: this.data.role
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.response) {
          this.addMessage("ai", res.data.response);
          this.setData({ 
            retryCount: 0,
            lastError: null,
            lastErrorTime: null
          });
        } else if (res.statusCode === 429) {
          this.handleError('请求过于频繁，请稍后再试', res);
        } else {
          this.handleError('获取回复失败', res);
        }
      },
      fail: (error) => {
        this.handleError('获取回复失败', error);
      },
      complete: () => {
        this.setData({ isTyping: false });
      }
    });
  },

  handleError: function(message, error) {
    console.error(message + ':', error);
    const now = new Date();
    const lastErrorTime = this.data.lastErrorTime ? new Date(this.data.lastErrorTime) : null;
    const timeSinceLastError = lastErrorTime ? now - lastErrorTime : Infinity;

    // 如果距离上次错误超过5分钟，重置重试计数
    if (timeSinceLastError > 5 * 60 * 1000) {
      this.setData({ retryCount: 0 });
    }

    if (this.data.retryCount < this.data.maxRetries) {
      this.setData({ 
        retryCount: this.data.retryCount + 1,
        lastError: message,
        lastErrorTime: now.toISOString()
      });
      setTimeout(() => {
        this.sendMsg();
      }, 1000 * this.data.retryCount); // 递增重试延迟
    } else {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
      this.setData({ 
        retryCount: 0,
        lastError: message,
        lastErrorTime: now.toISOString()
      });
    }
  },

  addMessage: function(role, content) {
    var messages = this.data.messages.concat([{ 
      role: role, 
      content: content,
      timestamp: new Date().toISOString()
    }]);
    this.setData({ 
      messages: messages,
      scrollToMessage: 'msg-' + (messages.length - 1)
    });

    // 自动滚动到底部
    wx.createSelectorQuery()
      .select(`#${this.data.scrollToMessage}`)
      .boundingClientRect()
      .exec((res) => {
        if (res[0]) {
          wx.pageScrollTo({
            scrollTop: res[0].top,
            duration: 300
          });
        }
      });
  },

  clearChat: function() {
    var that = this;
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前对话吗？',
      success: function(res) {
        if (res.confirm) {
          that.setData({
            messages: [],
            retryCount: 0,
            lastError: null,
            lastErrorTime: null
          });
          that.generateNewScenario();
        }
      }
    });
  },

  goBack: function() {
    wx.navigateBack();
  },

  generateNewScenario: function() {
    if (this.data.isGenerating || !this.data.isConnected) return;
    
    this.setData({ isGenerating: true });
    wx.showLoading({
      title: '生成中...',
    });
    
    wx.request({
      url: this.data.serverUrl + '/api/generate-scenario',
      method: 'POST',
      success: (res) => {
        if (res.statusCode === 200 && res.data.scenario) {
          this.setData({
            scene: res.data.scenario,
            role: res.data.role,
            messages: [],
            retryCount: 0,
            lastError: null,
            lastErrorTime: null
          });
        } else if (res.statusCode === 429) {
          this.handleError('请求过于频繁，请稍后再试', res);
        } else {
          this.handleError('生成场景失败', res);
        }
      },
      fail: (error) => {
        this.handleError('生成场景失败', error);
      },
      complete: () => {
        wx.hideLoading();
        this.setData({ isGenerating: false });
      }
    });
  }
});
