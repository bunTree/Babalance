// app.js
App({
  globalData: {
    userInfo: null,
    babyInfo: null,
    systemInfo: null,
    openid: null
  },

  onLaunch() {
    console.log('宝宝成长记录小程序启动')
    this.initApp()
  },

  // 初始化应用
  async initApp() {
    // 初始化云开发
    await this.initCloud()
    
    // 获取系统信息
    this.getSystemInfo()
    
    // 加载宝宝信息
    await this.loadBabyInfo()
    
    // 检查存储权限
    this.checkStoragePermission()
    
    // 自定义tabBar
    this.customizeTabBar()
  },

  // 初始化云开发
  async initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    try {
      wx.cloud.init({
        env: 'cloud1-3gkpl0rm53f6eed4',
        traceUser: true,
      })
      
      console.log('云开发初始化成功')
      
      // 获取openid
      await this.getOpenId()
    } catch (error) {
      console.error('云开发初始化失败:', error)
    }
  },

  // 获取用户openid
  async getOpenId() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login'
      })
      this.globalData.openid = res.result.openid
      console.log('获取openid成功:', res.result.openid)
      return res.result.openid
    } catch (error) {
      console.error('获取openid失败:', error)
      wx.showToast({
        title: '网络连接失败',
        icon: 'none'
      })
      throw error
    }
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  },



  // 获取系统信息
  getSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      this.globalData.systemInfo = systemInfo
      console.log('系统信息:', systemInfo)
    } catch (error) {
      console.error('获取系统信息失败:', error)
    }
  },

  // 加载宝宝信息
  async loadBabyInfo() {
    try {
      // 先从本地存储获取
      const localBabyInfo = wx.getStorageSync('babyInfo')
      if (localBabyInfo) {
        this.globalData.babyInfo = localBabyInfo
      }
      
      // 如果有openid，则从云数据库获取
      if (this.globalData.openid) {
        await this.loadBabyInfoFromCloud()
      }
    } catch (error) {
      console.error('加载宝宝信息失败:', error)
    }
  },

  // 从云数据库加载宝宝信息
  async loadBabyInfoFromCloud() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('b-user').where({
        _openid: this.globalData.openid
      }).get()
      
      if (res.data.length > 0) {
        const babyInfo = res.data[0]
        this.globalData.babyInfo = babyInfo
        // 同步到本地存储
        wx.setStorageSync('babyInfo', babyInfo)
        console.log('从云数据库加载宝宝信息成功:', babyInfo)
      } else {
        console.log('云数据库暂无宝宝信息')
      }
    } catch (error) {
      console.error('从云数据库加载宝宝信息失败:', error)
    }
  },

  // 检查存储权限
  checkStoragePermission() {
    try {
      wx.setStorageSync('test', 'test')
      wx.removeStorageSync('test')
      console.log('存储权限正常')
    } catch (error) {
      console.error('存储权限异常:', error)
      wx.showToast({
        title: '存储权限异常',
        icon: 'none'
      })
    }
  },

  // 保存宝宝信息 - 智能创建/更新逻辑
  async saveBabyInfo(babyInfo) {
    let localSaveSuccess = false
    let cloudSaveSuccess = false
    let isCreate = false
    let isUpdate = false
    
    try {
      // 第一步：检测是否有信息变化
      const currentBabyInfo = this.getBabyInfo()
      const hasChanges = this.detectBabyInfoChanges(currentBabyInfo, babyInfo)
      
      if (!hasChanges.hasAnyChange) {
        console.log('ℹ️ 宝宝信息无变化，跳过保存')
        return true
      }
      
      console.log('🔄 检测到信息变化:', hasChanges.changedFields)
      
      // 判断是创建还是更新
      isCreate = this.isNewBaby(currentBabyInfo)
      isUpdate = !isCreate
      
      const operationType = isCreate ? '创建' : '更新'
      console.log(`📝 操作类型: ${operationType}宝宝信息`)
      
      // 第二步：本地保存
      console.log('💾 开始本地保存...')
      wx.setStorageSync('babyInfo', babyInfo)
      this.globalData.babyInfo = babyInfo
      localSaveSuccess = true
      console.log('✅ 本地保存成功')
      
      // 第三步：云数据库保存
      console.log('☁️ 开始云数据库保存...')
      
      // 确保有openid
      if (!this.globalData.openid) {
        console.log('🔄 openid未获取，尝试重新获取...')
        try {
          await this.getOpenId()
          console.log('✅ openid重新获取成功')
        } catch (error) {
          console.log('❌ openid获取失败，跳过云数据库保存')
          this.showSaveResult(localSaveSuccess, false, operationType)
          return localSaveSuccess
        }
      }
      
      if (this.globalData.openid) {
        try {
          await this.saveBabyInfoToCloud(babyInfo, operationType)
          cloudSaveSuccess = true
          console.log('🎉 云数据库保存成功')
        } catch (cloudError) {
          console.error('☁️ 云数据库保存失败:', cloudError)
          this.handleCloudSaveError(cloudError, operationType)
        }
      } else {
        console.log('⚠️ 无openid，跳过云数据库保存')
      }
      
      // 显示保存结果
      this.showSaveResult(localSaveSuccess, cloudSaveSuccess, operationType)
      
      return localSaveSuccess
      
    } catch (error) {
      console.error('❌ 保存宝宝信息失败:', error)
      
      if (!localSaveSuccess) {
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        })
        return false
      }
      
      return true
    }
  },
  
  // 检测宝宝信息变化
  detectBabyInfoChanges(oldInfo, newInfo) {
    const fields = ['name', 'gender', 'birthday', 'avatar']
    const changedFields = []
    
    fields.forEach(field => {
      const oldValue = String(oldInfo[field] || '').trim()
      const newValue = String(newInfo[field] || '').trim()
      
      if (oldValue !== newValue) {
        changedFields.push({
          field,
          from: oldValue || '空',
          to: newValue || '空'
        })
      }
    })
    
    return {
      hasAnyChange: changedFields.length > 0,
      changedFields,
      changeCount: changedFields.length
    }
  },
  
  // 判断是否为新宝宝（创建操作）
  isNewBaby(currentInfo) {
    // 如果所有关键字段都为空，则认为是新宝宝
    const keyFields = ['name', 'gender', 'birthday']
    const hasAnyContent = keyFields.some(field => {
      const value = String(currentInfo[field] || '').trim()
      return value.length > 0
    })
    
    return !hasAnyContent
  },
  
  // 处理云保存错误
  handleCloudSaveError(error, operationType) {
    let errorMsg = `云端${operationType}失败，数据已保存到本地`
    
    if (error.errCode === -502005) {
      errorMsg = '数据库权限不足，请检查设置'
    } else if (error.errCode === -502003) {
      errorMsg = '数据库集合不存在，请先创建'
    } else if (error.errCode === -501000) {
      errorMsg = '网络连接问题，请检查网络'
    }
    
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 3000
    })
  },
  
  // 显示保存结果
  showSaveResult(localSuccess, cloudSuccess, operationType) {
    console.log(`📊 ${operationType}结果总结 - 本地:${localSuccess ? '✅' : '❌'} 云端:${cloudSuccess ? '✅' : '❌'}`)
    
    if (localSuccess && cloudSuccess) {
      wx.showToast({
        title: `${operationType}成功`,
        icon: 'success',
        duration: 2000
      })
    } else if (localSuccess && !cloudSuccess) {
      // 本地成功，云端失败，不显示额外提示（已在error处理中显示）
      console.log('本地保存成功，云端同步将在网络恢复后重试')
    }
  },

  // 保存宝宝信息到云数据库
  async saveBabyInfoToCloud(babyInfo, operationType = '保存') {
    // 验证前置条件
    if (!this.globalData.openid) {
      console.error('❌ openid未获取，无法保存到云数据库')
      throw new Error('openid未获取')
    }

    if (!wx.cloud) {
      console.error('❌ 云开发SDK未初始化')
      throw new Error('云开发SDK未初始化')
    }

          try {
        console.log(`💾 开始${operationType}到云数据库...`)
        console.log('🔑 openid:', this.globalData.openid.substr(0, 8) + '...')
        console.log('📝 数据内容:', babyInfo)
      
      const db = wx.cloud.database()
      const collection = db.collection('b-user')
      
      // 数据清洗和验证
      const saveData = {
        name: String(babyInfo.name || '').trim(),
        gender: String(babyInfo.gender || '').trim(),
        birthday: String(babyInfo.birthday || '').trim(),
        avatar: String(babyInfo.avatar || '').trim(),
        updateTime: db.serverDate()
      }
      
              // 验证必要字段 - 至少有一个非空字段
        const hasValidData = saveData.name || saveData.gender || saveData.birthday || saveData.avatar
        if (!hasValidData) {
          throw new Error('至少需要填写一个字段')
        }
        
        console.log(`✅ 数据验证通过，准备${operationType}:`, saveData)
      
      // 第一步：测试数据库连接
      console.log('🔍 测试数据库连接...')
      const testRes = await collection.limit(1).get()
      console.log('✅ 数据库连接正常，集合记录数:', testRes.data.length)
      
      // 第二步：查询现有记录
      console.log('🔍 查询现有记录...')
      const existRes = await collection.where({
        _openid: this.globalData.openid
      }).limit(1).get()
      
      console.log('📊 查询结果 - 现有记录数:', existRes.data.length)
      
      if (existRes.data.length > 0) {
        // 更新现有记录
        const docId = existRes.data[0]._id
        console.log('🔄 更新现有记录，ID:', docId)
        
        const updateRes = await collection.doc(docId).update({
          data: saveData
        })
        
        console.log('✅ 更新操作完成:', updateRes)
        
        // 验证更新结果
        if (updateRes.stats && updateRes.stats.updated > 0) {
          console.log(`🎉 云数据库${operationType}成功！`)
        } else {
          console.log(`⚠️ ${operationType}操作执行但无记录被修改`)
          throw new Error(`${operationType}操作未影响任何记录`)
        }
      } else {
        // 创建新记录
        console.log('➕ 创建新记录...')
        saveData.createTime = db.serverDate()
        
        console.log('📤 准备添加的完整数据:', saveData)
        
        const addRes = await collection.add({
          data: saveData
        })
        
        console.log('✅ 添加操作完成:', addRes)
        
        // 验证创建结果
        if (addRes._id) {
          console.log(`🎉 云数据库${operationType}成功！新记录ID:`, addRes._id)
        } else {
          throw new Error(`${operationType}操作未返回记录ID`)
        }
      }
      
      console.log('✅ 云数据库操作完全成功')
      return true
      
    } catch (error) {
      console.error('❌ 云数据库操作失败:', error)
      
      // 详细错误分析和建议
      const errorAnalysis = {
        错误类型: error.name || 'Unknown',
        错误信息: error.message || error.errMsg || '未知错误',
        错误代码: error.errCode || 'N/A',
        openid状态: this.globalData.openid ? '✅ 已获取' : '❌ 未获取',  
        时间戳: new Date().toISOString()
      }
      
      console.table(errorAnalysis)
      
      // 根据错误码提供解决方案
      const solutions = {
        '-502005': '数据库权限不足 → 请将集合权限设为"仅创建者可读写"',
        '-502003': '集合不存在 → 请在云开发控制台创建"b-user"集合',
        '-501000': '网络或服务错误 → 请检查网络连接和云函数部署',
        '-502002': '字段类型错误 → 请检查数据格式',
        'timeout': '请求超时 → 请检查网络连接'
      }
      
      const solution = solutions[error.errCode] || solutions[error.message] || '请查看控制台详细日志'
      console.error('💡 解决建议:', solution)
      
      throw error
    }
  },

  // 获取宝宝信息
  getBabyInfo() {
    return this.globalData.babyInfo || wx.getStorageSync('babyInfo') || {}
  },

  // 测试云数据库连接
  async testCloudDatabase() {
    try {
      if (!this.globalData.openid) {
        throw new Error('openid未获取')
      }
      
      const db = wx.cloud.database()
      const res = await db.collection('b-user').where({
        _openid: this.globalData.openid
      }).get()
      
      console.log('云数据库连接测试成功:', res)
      return true
    } catch (error) {
      console.error('云数据库连接测试失败:', error)
      return false
    }
  },

  // 保存成长记录
  saveGrowthRecord(record) {
    try {
      const records = wx.getStorageSync('growthRecords') || []
      records.push({
        ...record,
        id: Date.now(),
        createTime: new Date().toISOString()
      })
      wx.setStorageSync('growthRecords', records)
      console.log('保存成长记录成功')
      return true
    } catch (error) {
      console.error('保存成长记录失败:', error)
      return false
    }
  },

  // 获取成长记录
  getGrowthRecords() {
    try {
      return wx.getStorageSync('growthRecords') || []
    } catch (error) {
      console.error('获取成长记录失败:', error)
      return []
    }
  },

  // 清空所有数据
  clearAllData() {
    try {
      wx.removeStorageSync('babyInfo')
      wx.removeStorageSync('growthRecords')
      this.globalData.babyInfo = null
      console.log('清空数据成功')
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  },

  // 工具函数：格式化日期
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return ''
    
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
  },

  // 工具函数：计算年龄
  calculateAge(birthday) {
    if (!birthday) return '未知'
    
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
    if (years === 0 && days > 0) {
      ageText += `${days}天`
    }

    return ageText || '新生儿'
  },

  // 工具函数：数据验证
  validateData(type, value) {
    if (!value) return false
    
    const rules = {
      weight: { min: 0.5, max: 50 },
      height: { min: 30, max: 200 },
      head: { min: 25, max: 70 },
      milk: { min: 0, max: 500 },
      temperature: { min: 35, max: 42 }
    }
    
    if (rules[type]) {
      const num = parseFloat(value)
      return !isNaN(num) && num >= rules[type].min && num <= rules[type].max
    }
    
    return true
  },

  // 自定义TabBar样式（已使用自定义tabBar组件，此方法保留但不再使用）
  customizeTabBar() {
    // 使用自定义tabBar组件，此方法不再需要
    console.log('使用自定义tabBar组件')
  }
})
