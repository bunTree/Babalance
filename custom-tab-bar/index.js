Component({
  data: {
    selected: 0,
    color: "#94a3b8",
    selectedColor: "#667eea",
    babyGender: 'unknown',
    list: [
      {
        pagePath: "/pages/monitor/monitor",
        text: "🍼",
        title: "查看",
        iconPath: "",
        selectedIconPath: ""
      },
      {
        text: "+",
        title: "记录",
        isButton: true
      },
      {
        pagePath: "/pages/profile/profile", 
        text: "👶",
        title: "宝宝",
        iconPath: "",
        selectedIconPath: "",
        isDynamic: true
      }
    ],
    isTabSwitching: false // 防止重复点击
  },

  attached() {
    this.setSelected()
    this.loadBabyGender()
  },

  methods: {
    switchTab(e) {
      // 防抖处理
      if (this.data.isTabSwitching) {
        return
      }
      
      this.setData({ isTabSwitching: true })
      
      // 使用setTimeout确保状态更新后再处理点击
      setTimeout(() => {
        this.setData({ isTabSwitching: false })
      }, 300)
      
      const data = e.currentTarget.dataset
      const url = data.path
      
      if (data.isButton) {
        // 触发添加记录弹窗
        this.showAddRecordModal()
        return
      }

      // 检查是否已经在当前页面
      try {
        const pages = getCurrentPages()
        if (pages && pages.length > 0) {
          const currentPage = pages[pages.length - 1]
          if (currentPage && currentPage.route) {
            const currentPath = currentPage.route
            if (`/${currentPath}` === url) {
              return // 已在当前页面，无需切换
            }
          }
        }
      } catch (error) {
        console.warn('TabBar: 获取当前页面路径失败:', error)
      }

      wx.switchTab({ 
        url,
        success: () => {
          this.setSelected()
        },
        fail: (err) => {
          console.error('TabBar切换失败:', err)
          this.setData({ isTabSwitching: false })
        }
      })
    },

    setSelected() {
      try {
        const pages = getCurrentPages()
        if (!pages || pages.length === 0) {
          console.warn('TabBar: 无法获取当前页面')
          return
        }
        
        const currentPage = pages[pages.length - 1]
        if (!currentPage || !currentPage.route) {
          console.warn('TabBar: 当前页面或route未定义')
          return
        }
        
        const currentPath = currentPage.route
        const selected = this.data.list.findIndex(item => 
          item.pagePath === `/${currentPath}`
        )
        
        this.setData({
          selected: selected >= 0 ? selected : 0
        })
      } catch (error) {
        console.error('TabBar setSelected 错误:', error)
        // 默认选中第一个tab
        this.setData({ selected: 0 })
      }
    },

    loadBabyGender() {
      try {
        const babyInfo = wx.getStorageSync('babyInfo') || {}
        const gender = babyInfo.gender || 'unknown'
        
        // 只在性别改变时更新
        if (this.data.babyGender !== gender) {
          const updatedList = this.data.list.map(item => {
            if (item.isDynamic) {
              return {
                ...item,
                text: this.getBabyEmoji(gender)
              }
            }
            return item
          })
          
          this.setData({
            babyGender: gender,
            list: updatedList
          })
          
          console.log('🎨 TabBar更新性别信息:', gender)
        }
      } catch (error) {
        console.error('加载宝宝性别失败:', error)
      }
    },

    getBabyEmoji(gender) {
      switch(gender) {
        case 'male':
          return '👦🏻'
        case 'female':
          return '👧🏻'
        default:
          return '👶🏻'
      }
    },



    refreshGender() {
      this.loadBabyGender()
    },

    showAddRecordModal() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      
      if (currentPage.showAddRecordModal) {
        currentPage.showAddRecordModal()
      } else {
        wx.showToast({
          title: '请在查看或宝宝页面使用此功能',
          icon: 'none',
          duration: 2000
        })
      }
    }
  }
}) 