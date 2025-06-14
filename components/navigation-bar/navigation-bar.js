Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      try {
        const rect = wx.getMenuButtonBoundingClientRect()
        
        // 获取设备信息
        let platform = 'ios'
        try {
          platform = wx.getDeviceInfo().platform
        } catch (error) {
          console.warn('获取设备信息失败，尝试降级:', error)
          try {
            platform = wx.getSystemInfoSync().platform
          } catch (fallbackError) {
            console.warn('降级获取设备信息失败，使用默认值:', fallbackError)
          }
        }
        
        const isAndroid = platform === 'android'
        const isDevtools = platform === 'devtools'
        
        // 获取窗口信息
        let windowWidth = 375
        let safeAreaTop = 0
        
        try {
          const windowInfo = wx.getWindowInfo()
          windowWidth = windowInfo.windowWidth
          safeAreaTop = windowInfo.safeArea?.top || 0
        } catch (error) {
          console.warn('获取窗口信息失败，尝试降级:', error)
          try {
            const systemInfo = wx.getSystemInfoSync()
            windowWidth = systemInfo.windowWidth
            safeAreaTop = systemInfo.safeArea?.top || 0
          } catch (fallbackError) {
            console.warn('降级获取窗口信息失败，使用默认值:', fallbackError)
          }
        }
        
        this.setData({
          ios: !isAndroid,
          innerPaddingRight: `padding-right: ${windowWidth - rect.left}px`,
          leftWidth: `width: ${windowWidth - rect.left}px`,
          safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${safeAreaTop}px); padding-top: ${safeAreaTop}px` : ``
        })
      } catch (error) {
        console.error('navigation-bar attached 失败:', error)
      }
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'
          };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta
        })
      }
      this.triggerEvent('back', { delta: data.delta }, {})
    }
  },
})
