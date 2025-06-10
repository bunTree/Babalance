// 我的宝页面
const app = getApp()

Page({
  data: {
    // 宝宝基本信息
    babyInfo: {
      name: '',
      gender: '',
      birthday: '',
      avatar: ''
    },

    // 显示文本
    ageText: '请设置生日',
    genderText: '未设置',

    // 样式控制
    containerClass: 'container-default', // 默认粉色背景

    // 编辑弹窗
    showEditModal: false,
    editField: '',
    editFieldName: '',
    editType: 'text',
    editValue: '',
    editOptions: [],

    // 字段配置
    fieldConfig: {
      name: { name: '姓名', type: 'text' },
      gender: { 
        name: '性别', 
        type: 'radio',
        options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ]
      },
      birthday: { name: '生日', type: 'date' }
    },

    // 添加记录弹窗
    showModal: false,
    modalData: {
      height: '',
      weight: '',
      head: '',
      date: ''
    },
    submitting: false
  },

  async onLoad() {
    await this.loadBabyInfo()
    // 确保页面加载时背景色正确显示
    this.refreshDisplayTexts()
  },

  onShow() {
    this.refreshDisplayTexts()
    // 刷新TabBar性别色彩
    setTimeout(() => {
      this.refreshTabBarGender()
    }, 100)
  },

  // 加载宝宝信息
  async loadBabyInfo() {
    const app = getApp()
    
    try {
      // 先从本地加载
      const localBabyInfo = wx.getStorageSync('babyInfo') || {}
      this.setData({ babyInfo: localBabyInfo })
      this.calculateAge()
      this.refreshDisplayTexts()
      
      // 等待openid获取完成后从云端同步
      if (app.globalData.openid) {
        await app.loadBabyInfoFromCloud()
        const cloudBabyInfo = app.getBabyInfo()
        if (JSON.stringify(cloudBabyInfo) !== JSON.stringify(localBabyInfo)) {
          this.setData({ babyInfo: cloudBabyInfo })
          this.calculateAge()
          this.refreshDisplayTexts()
        }
      }
    } catch (error) {
      console.error('加载宝宝信息失败:', error)
    }
  },

  // 计算年龄
  calculateAge() {
    const { birthday } = this.data.babyInfo
    if (!birthday) {
      this.setData({ ageText: '请设置生日' })
      return
    }

    const birthDate = new Date(birthday)
    const now = new Date()
    
    let years = now.getFullYear() - birthDate.getFullYear()
    let months = now.getMonth() - birthDate.getMonth()
    let days = now.getDate() - birthDate.getDate()

    if (days < 0) {
      months--
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      days += lastMonth.getDate()
    }

    if (months < 0) {
      years--
      months += 12
    }

    let ageText = ''
    if (years > 0) {
      ageText += `${years}岁`
    }
    if (months > 0) {
      ageText += `${months}个月`
    }
    if (years === 0 && months === 0 && days >= 0) {
      ageText += `${days}天`
    }

    this.setData({ ageText: ageText || '新生儿' })
  },

  // 刷新显示文本
  refreshDisplayTexts() {
    const { babyInfo } = this.data
    
    // 性别文本
    const genderText = babyInfo.gender === 'male' ? '男' : 
                      babyInfo.gender === 'female' ? '女' : '未设置'

    // 根据性别设置背景样式
    const containerClass = babyInfo.gender === 'male' ? 'container-boy' : 'container-girl'

    this.setData({
      genderText,
      containerClass
    })
  },

  // 编辑字段
  editField(e) {
    const { field } = e.currentTarget.dataset
    const config = this.data.fieldConfig[field]
    
    if (!config) return

    this.setData({
      showEditModal: true,
      editField: field,
      editFieldName: config.name,
      editType: config.type,
      editValue: this.data.babyInfo[field] || '',
      editOptions: config.options || []
    })
  },

  // 更换头像
  changeAvatar() {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success(res) {
        const avatar = res.tempFilePaths[0]
        that.updateBabyInfo('avatar', avatar)
      },
      fail(error) {
        console.error('选择头像失败:', error)
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        })
      }
    })
    },

  // 编辑输入处理
  onEditInput(e) {
    this.setData({
      editValue: e.detail.value
    })
  },

  // 日期选择
  onDateSelect(e) {
    this.setData({
      editValue: e.detail.value
    })
  },

  // 单选选择
  onRadioSelect(e) {
    const { value } = e.currentTarget.dataset
    this.setData({
      editValue: value
    })
  },

  // 确认编辑
  async confirmEdit() {
    const { editField, editValue } = this.data
    
    // 基本验证
    if (!editValue) {
      wx.showToast({
        title: '请输入有效值',
        icon: 'none'
      })
      return
    }

    await this.updateBabyInfo(editField, editValue)
    this.closeModal()
  },

  // 更新宝宝信息 - 智能创建/更新
  async updateBabyInfo(field, value) {
    const app = getApp()
    
    try {
      wx.showLoading({
        title: '保存中...',
        mask: true
      })
      
      // 准备更新的宝宝信息
      const babyInfo = { ...this.data.babyInfo }
      babyInfo[field] = value
      
      console.log('🔄 字段更新:', { field, from: this.data.babyInfo[field], to: value })
      
      // 检查是否为首次创建
      const currentInfo = app.getBabyInfo()
      const isFirstTime = app.isNewBaby ? app.isNewBaby(currentInfo) : this.isFirstTimeCreating(currentInfo)
      
      console.log(`📝 操作类型: ${isFirstTime ? '创建' : '更新'}宝宝信息`)
      
      // 使用app的智能保存方法
      const success = await app.saveBabyInfo(babyInfo)
      
      if (success) {
        // 更新页面数据
        this.setData({ babyInfo })
        
        // 重新计算相关数据
        if (field === 'birthday') {
          this.calculateAge()
        }
        
        this.refreshDisplayTexts()
        
        // 如果更新的是性别，通知tabBar刷新
        if (field === 'gender') {
          this.refreshTabBarGender()
        }
        
        // 显示成功提示（app.saveBabyInfo已经处理了提示）
        console.log('✅ 宝宝信息保存成功')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('❌ 保存失败:', error)
      
      // 如果app.saveBabyInfo没有显示提示，则这里显示
      if (!error.userNotified) {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        })
      }
    } finally {
      wx.hideLoading()
    }
  },
  
  // 判断是否为首次创建（页面级别的判断）
  isFirstTimeCreating(currentInfo) {
    const keyFields = ['name', 'gender', 'birthday']
    const hasAnyContent = keyFields.some(field => {
      const value = String(currentInfo[field] || '').trim()
      return value.length > 0
    })
    
    return !hasAnyContent
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showEditModal: false,
      editField: '',
      editValue: '',
      editOptions: []
    })
  },

  // 阻止冒泡
  stopPropagation() {
    // 空函数，阻止事件冒泡
  },

  // 刷新TabBar性别色彩
  refreshTabBarGender() {
    try {
      // 获取自定义tabBar实例
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().refreshGender()
        console.log('🎨 已通知TabBar刷新性别色彩')
      }
    } catch (error) {
      console.error('刷新TabBar性别色彩失败:', error)
    }
  },

  // 显示添加记录弹窗
  showAddRecordModal() {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    
    this.setData({
      showModal: true,
      'modalData.date': date,
      'modalData.height': '',
      'modalData.weight': '',
      'modalData.head': ''
    })
  },

  // 关闭记录弹窗
  hideModal() {
    this.setData({
      showModal: false,
      submitting: false
    })
  },

  // 弹窗输入处理
  onModalInput(e) {
    const { field } = e.currentTarget.dataset
    let { value } = e.detail
    
    // 验证数字输入格式，允许小数点
    if (value && !/^\d*\.?\d*$/.test(value)) {
      // 移除非法字符，只保留数字和一个小数点
      value = value.replace(/[^\d.]/g, '')
      // 确保只有一个小数点
      const parts = value.split('.')
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
      }
    }
    
    this.setData({
      [`modalData.${field}`]: value
    })
  },

  // 日期选择
  onModalDateChange(e) {
    this.setData({
      'modalData.date': e.detail.value
    })
  },

  // 提交记录
  async submitRecord() {
    const { modalData } = this.data
    
    // 验证至少填写一项
    if (!modalData.height && !modalData.weight && !modalData.head) {
      wx.showToast({
        title: '请至少填写一项数据',
        icon: 'none'
      })
      return
    }

    // 验证数值范围
    if (modalData.weight && (parseFloat(modalData.weight) < 0 || parseFloat(modalData.weight) > 50)) {
      wx.showToast({
        title: '体重数值不合理',
        icon: 'none'
      })
      return
    }

    if (modalData.height && (parseFloat(modalData.height) < 0 || parseFloat(modalData.height) > 200)) {
      wx.showToast({
        title: '身高数值不合理',
        icon: 'none'
      })
      return
    }

    if (modalData.head && (parseFloat(modalData.head) < 0 || parseFloat(modalData.head) > 100)) {
      wx.showToast({
        title: '头围数值不合理',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      const now = new Date()
      
      // 构建当天的测量记录
      const measureRecord = {
        date: modalData.date,
        datetime: `${modalData.date} ${now.toTimeString().slice(0, 8)}`,
        timestamp: now.getTime(),
        measurements: {}
      }

      // 添加有效的测量数据
      if (modalData.height) {
        measureRecord.measurements.height = {
          value: parseFloat(modalData.height),
          unit: 'cm'
        }
      }

      if (modalData.weight) {
        measureRecord.measurements.weight = {
          value: parseFloat(modalData.weight),
          unit: 'kg'
        }
      }

      if (modalData.head) {
        measureRecord.measurements.head = {
          value: parseFloat(modalData.head),
          unit: 'cm'
        }
      }

      // 保存到本地存储（按日期覆盖）
      this.saveToLocal(measureRecord)

      // 同步到云端（b-measure集合）
      await this.syncToCloud(measureRecord)

      // 关闭弹窗
      this.hideModal()

      wx.showToast({
        title: '记录保存成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存记录失败:', error)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 保存到本地存储
  saveToLocal(measureRecord) {
    try {
      const records = wx.getStorageSync('measureRecords') || []
      
      // 查找是否已有当天的记录
      const existingIndex = records.findIndex(record => record.date === measureRecord.date)
      
      if (existingIndex >= 0) {
        // 覆盖当天的记录
        records[existingIndex] = measureRecord
        console.log(`📝 覆盖${measureRecord.date}的测量记录`)
      } else {
        // 添加新记录
        records.push(measureRecord)
        console.log(`📝 新增${measureRecord.date}的测量记录`)
      }
      
      wx.setStorageSync('measureRecords', records)
    } catch (error) {
      console.error('本地保存失败:', error)
      throw error
    }
  },

  // 同步数据到云端
  async syncToCloud(measureRecord) {
    try {
      const app = getApp()
      if (!app.globalData.openid) {
        console.log('未获取到openid，跳过云端同步')
        return
      }

      const db = wx.cloud.database()
      const collection = db.collection('b-measure')
      
      // 查询当天是否已有记录
      const queryResult = await collection.where({
        openid: app.globalData.openid,
        date: measureRecord.date
      }).get()

      const data = {
        ...measureRecord,
        openid: app.globalData.openid,
        updateTime: new Date()
      }

      if (queryResult.data && queryResult.data.length > 0) {
        // 存在记录，执行更新
        const docId = queryResult.data[0]._id
        await collection.doc(docId).update({
          data: {
            measurements: measureRecord.measurements,
            datetime: measureRecord.datetime,
            timestamp: measureRecord.timestamp,
            updateTime: new Date()
          }
        })
        console.log(`☁️ 云端更新${measureRecord.date}的测量记录`)
      } else {
        // 不存在记录，新增
        data.createTime = new Date()
        await collection.add({ data })
        console.log(`☁️ 云端新增${measureRecord.date}的测量记录`)
      }

      console.log('云端同步成功')
    } catch (error) {
      console.error('云端同步失败:', error)
      // 云端同步失败不影响本地保存成功
    }
  }
}) 