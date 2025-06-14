// 数据监测页面
const app = getApp()

Page({
  data: {
    // 状态栏高度
    statusBarHeight: 0,
    
    // 背景类型，根据宝宝性别动态变化
    backgroundClass: 'container-default',
    
    // 最新数据指标
    metrics: [
      { key: 'height', icon: '高', label: '身高', unit: 'cm', value: '--' },
      { key: 'weight', icon: '重', label: '体重', unit: 'kg', value: '--' },
      { key: 'head', icon: '围', label: '头围', unit: 'cm', value: '--' }
    ],
    
    // 最后更新时间
    lastUpdateDate: '--',
    
    // 时间选项
    timeOptions: [
      { key: '7d', label: '7天', active: false },
      { key: '30d', label: '30天', active: true },
      { key: 'all', label: '全部', active: false }
    ],
    
    // 图表类型
    chartTypes: [
      { key: 'weight', label: '体重', icon: '重', active: true },
      { key: 'height', label: '身高', icon: '高', active: false },
      { key: 'head', label: '头围', icon: '围', active: false }
    ],
    
    // 当前图表
    currentChart: '体重',
    

    
    // 最近记录（使用新的数据结构）
    recentRecords: [],
    
    // 图表数据
    chartData: {
      weight: {
        labels: [],
        values: [],
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      },
      height: {
        labels: [],
        values: [],
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      },
      head: {
        labels: [],
        values: [],
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      }
    },

    // 添加记录弹窗
    showModal: false,
    modalData: {
      height: '',
      weight: '',
      head: '',
      date: ''
    },
    submitting: false,

    // 下拉刷新状态
    refreshing: false,

    // 当前性别主题
    currentGender: 'default',
    
    // 最后更新文本
    lastUpdateText: '暂无记录',
    
    // 时间范围选择
    timeRange: '30',
    
    // 图表类型选择
    activeChartType: 'weight',
    
    // 当前指标显示数据
    currentMetricLabel: '体重',
    currentMetricValue: '--',
    currentMetricUnit: 'kg',
    currentMetricIcon: '重',
    
    // 编辑记录弹窗
    showEditModal: false,
    editingRecord: {
      date: '',
      displayDate: '',
      weight: '',
      height: '',
      headCircumference: ''
    },
    
    // 添加记录弹窗
    showModal: false,
    modalData: {
      date: '',
      weight: '',
      height: '',
      head: ''
    },
    submitting: false,
    
    // 宝宝信息
    babyInfo: {},
    genderText: '未设置',
    ageText: '未设置',
    
    // 预计算的指标值（用于模板显示）
    weightValue: '--',
    heightValue: '--',
    headValue: '--',
    
    // 容器样式
    containerStyle: '--status-bar-height: 88rpx;',
    
    // 图表提示框
    showTooltip: false,
    tooltipX: 0,
    tooltipY: 0,
    tooltipTime: '',
    tooltipValues: [],
    
    // 日期限制
    maxDate: new Date().toISOString().split('T')[0]  // 今天的日期
  },

  // 标准化性别值 (兼容不同的性别表示方式)
  normalizeGender(rawGender) {
    if (rawGender === 'male' || rawGender === 'boy') {
      return 'boy'
    } else if (rawGender === 'female' || rawGender === 'girl') {
      return 'girl'
    } else {
      return 'default'
    }
  },

  // 获取性别显示文本
  getGenderText(gender) {
    if (gender === 'male' || gender === 'boy') {
      return '男宝'
    } else if (gender === 'female' || gender === 'girl') {
      return '女宝'
    } else {
      return '未设置'
    }
  },

  // 计算年龄
  calculateAge(birthday) {
    if (!birthday) {
      return '未设置'
    }
    
    try {
      const birthDate = new Date(birthday)
      const now = new Date()
      
      // 计算月龄
      let months = (now.getFullYear() - birthDate.getFullYear()) * 12
      months += now.getMonth() - birthDate.getMonth()
      
      // 如果当前日期小于出生日期，减去一个月
      if (now.getDate() < birthDate.getDate()) {
        months--
      }
      
      if (months < 0) {
        return '未出生'
      } else if (months < 12) {
        return `${months}个月`
      } else {
        const years = Math.floor(months / 12)
        const remainingMonths = months % 12
        if (remainingMonths === 0) {
          return `${years}岁`
        } else {
          return `${years}岁${remainingMonths}个月`
        }
      }
    } catch (error) {
      console.error('计算年龄失败:', error)
      return '未设置'
    }
  },

  async onLoad() {
    console.log('📊 Monitor页面加载')
    
    // 首先更新性别主题
    this.updateGenderTheme()
    
    // 获取设备信息
    try {
      const windowInfo = wx.getWindowInfo()
      const statusBarHeight = windowInfo.statusBarHeight || 44
      const statusBarHeightRpx = statusBarHeight * 2 // px转rpx
      
      this.setData({
        statusBarHeight: statusBarHeight,
        containerStyle: `--status-bar-height: ${statusBarHeightRpx}rpx;`
      })
    } catch (error) {
      console.error('获取设备信息失败:', error)
      // 设置默认值
      this.setData({
        statusBarHeight: 44,
        containerStyle: '--status-bar-height: 88rpx;'
      })
    }
    
    // 初始化图表
    this.initChart()
    
    // 初始化当前指标显示
    this.updateCurrentMetricDisplay()
    
    // 延迟加载数据，确保UI已渲染
    setTimeout(async () => {
      await this.loadData()
    }, 300)

    // 注册数据更新监听
    const app = getApp()
    this.dataUpdateCallback = async () => {
      console.log('📊 monitor页面收到数据更新通知')
      try {
        await this.refreshData()
        console.log('📊 monitor页面数据刷新完成')
      } catch (error) {
        console.error('📊 monitor页面数据刷新失败:', error)
      }
    }
    app.onDataUpdate(this.dataUpdateCallback)
  },

  onShow() {
    console.log('📊 Monitor页面显示')
    
    // 检查并更新性别主题
    this.updateGenderTheme()
    
    // 更新宝宝信息
    const babyInfo = wx.getStorageSync('babyInfo') || {}
    const genderText = this.getGenderText(babyInfo.gender)
    const ageText = this.calculateAge(babyInfo.birthday)
    
    this.setData({
      babyInfo: babyInfo,
      genderText: genderText,
      ageText: ageText
    })
    
    // 如果Canvas已初始化，则重新绘制图表
    if (this.ctx) {
      this.drawChart()
    }
  },

  onUnload() {
    // 页面卸载时移除监听器
    const app = getApp()
    if (this.dataUpdateCallback) {
      app.offDataUpdate(this.dataUpdateCallback)
    }
  },

  // 加载宝宝数据
  async loadData() {
    try {
      console.log('📊 开始加载数据')
      
      // 获取宝宝信息并更新主题
      const babyInfo = wx.getStorageSync('babyInfo') || {}
      const normalizedGender = this.normalizeGender(babyInfo.gender)
      
      console.log('📊 加载宝宝信息:', babyInfo, '性别主题:', normalizedGender)
      
      // 计算性别文本和年龄文本
      const genderText = this.getGenderText(babyInfo.gender)
      const ageText = this.calculateAge(babyInfo.birthday)
      
      this.setData({
        currentGender: normalizedGender,
        babyInfo: babyInfo,
        genderText: genderText,
        ageText: ageText
      })
      
      // 获取测量记录
      const records = await this.getMeasureRecords()
      console.log('📊 获取到记录数量:', records.length)
      
      if (records.length > 0) {
        this.updateMetrics(records)
        this.updateRecentRecords(records)
        this.updateChartData(records)
        
        // 更新最后更新时间
        const latest = records[records.length - 1]
        this.setData({
          lastUpdateText: this.formatDate(latest.date)
        })
        
        // 更新当前指标显示
        this.updateCurrentMetricDisplay()
        
        console.log('📊 数据更新完成')
      } else {
        console.log('📊 暂无数据')
        // 重置指标为默认值
        const defaultMetrics = this.data.metrics.map(metric => ({
          ...metric,
          value: '--'
        }))
        
        this.setData({
          lastUpdateText: '暂无记录',
          recentRecords: [],
          metrics: defaultMetrics,
          weightValue: '--',
          heightValue: '--',
          headValue: '--'
        })
        
        // 更新当前指标显示
        this.updateCurrentMetricDisplay()
      }
      
    } catch (error) {
      console.error('📊 加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 获取测量记录
  async getMeasureRecords() {
    try {
      // 优先从云端获取
      if (app.globalData.openid) {
        console.log('📊 从云端获取数据')
        const db = wx.cloud.database()
        // 尝试不同的openid字段名
        console.log('📊 当前openid:', app.globalData.openid)
        
        // 先尝试使用 _openid 查询
        let result = await db.collection('b-measure')
          .where({
            _openid: app.globalData.openid
          })
          .orderBy('date', 'asc')
          .get()
        
        console.log('📊 使用_openid查询结果:', result.data.length)
        
        // 如果_openid查询无结果，尝试openid
        if (result.data.length === 0) {
          console.log('📊 _openid查询无结果，尝试openid字段')
          result = await db.collection('b-measure')
            .where({
              openid: app.globalData.openid
            })
            .orderBy('date', 'asc')
            .get()
          console.log('📊 使用openid查询结果:', result.data.length)
        }
        
        // 如果还是无结果，查询所有数据看看结构
        if (result.data.length === 0) {
          console.log('📊 两种openid都无结果，查询所有数据检查结构')
          const allResult = await db.collection('b-measure')
            .limit(5)
            .get()
          console.log('📊 数据库中的所有数据样本:', allResult.data)
          if (allResult.data.length > 0) {
            console.log('📊 第一条数据的字段:', Object.keys(allResult.data[0]))
            console.log('📊 第一条数据详情:', allResult.data[0])
          }
        }
        
        console.log('📊 云端数据:', result.data)
        console.log('📊 云端数据详情:', JSON.stringify(result.data, null, 2))
        if (result.data && result.data.length > 0) {
          console.log('📊 第一条记录详情:', result.data[0])
          console.log('📊 第一条记录字段:', Object.keys(result.data[0]))
        }
        
        // 转换云端数据格式
        const convertedData = this.convertCloudData(result.data || [])
        console.log('📊 转换后的数据:', convertedData)
        return convertedData
      } else {
        console.log('📊 从本地获取数据')
        return wx.getStorageSync('measureRecords') || []
      }
    } catch (error) {
      console.error('📊 获取数据失败:', error)
      // 降级到本地数据
      return wx.getStorageSync('measureRecords') || []
    }
  },

  // 转换云端数据格式
  convertCloudData(cloudData) {
    console.log('📊 开始转换云端数据，原始数据:', cloudData)
    
    return cloudData.map((record, index) => {
      console.log(`📊 转换第${index + 1}条记录:`, record)
      console.log(`📊 记录的所有字段:`, Object.keys(record))
      
      // 检查不同可能的数据结构
      let weight, height, headCircumference, date
      
      // measurements对象结构 - 优先检查
      if (record.measurements) {
        console.log('📊 使用measurements结构:', record.measurements)
        weight = record.measurements.weight && record.measurements.weight.value
        height = record.measurements.height && record.measurements.height.value
        headCircumference = (record.measurements.headCircumference && record.measurements.headCircumference.value) || (record.measurements.head && record.measurements.head.value)
        date = record.date
      }
      // measure对象结构
      else if (record.measure) {
        console.log('📊 使用measure结构:', record.measure)
        weight = (record.measure.weight && record.measure.weight.value) || record.measure.weight
        height = (record.measure.height && record.measure.height.value) || record.measure.height
        headCircumference = (record.measure.headCircumference && record.measure.headCircumference.value) || (record.measure.head && record.measure.head.value) || record.measure.headCircumference || record.measure.head
        date = record.date
      }
      // 直接字段访问
      else if (record.weight !== undefined || record.height !== undefined || record.headCircumference !== undefined || record.head !== undefined) {
        console.log('📊 使用直接字段访问')
        weight = record.weight
        height = record.height
        headCircumference = record.headCircumference || record.head
        date = record.date
      }
      // 其他可能的字段名
      else {
        console.log('📊 尝试其他可能的字段名')
        // 尝试其他可能的字段名
        weight = record.weight || record.体重 || record.w
        height = record.height || record.身高 || record.h
        headCircumference = record.headCircumference || record.head || record.头围 || record.hc
        date = record.date || record.recordDate || record.测量日期
      }
      
      console.log(`📊 提取的原始值:`, { weight, height, headCircumference, date })
      
      // 过滤掉没有任何测量数据的记录
      if (!weight && !height && !headCircumference) {
        console.log(`📊 ⚠️ 第${index + 1}条记录没有有效的测量数据，跳过`)
        return null
      }
      
      const converted = {
        date: date || record.date || new Date().toISOString().split('T')[0],
        weight: weight ? String(weight) : undefined,
        height: height ? String(height) : undefined,
        headCircumference: headCircumference ? String(headCircumference) : undefined,
        timestamp: record.timestamp || Date.now(),
        _id: record._id,
        openid: record.openid
      }
      
      console.log(`📊 转换结果:`, converted)
      return converted
    }).filter(record => record !== null) // 过滤掉null记录
  },

  // 更新最新指标
  updateMetrics(records) {
    if (records.length === 0) return
    
    const latest = records[records.length - 1]
    console.log('📊 最新记录数据:', latest)
    
    const metrics = this.data.metrics.map(metric => {
      let value = '--'
      let key = metric.label === '身高' ? 'height' : 
                metric.label === '体重' ? 'weight' : 'headCircumference'
      
      console.log(`📊 处理指标 ${metric.label}, 查找字段 ${key}, 值:`, latest[key])
      
      if (latest[key] && latest[key] !== undefined && latest[key] !== '') {
        value = latest[key]
      }
      
      return { ...metric, value }
    })
    
    // 预计算指标值用于模板显示
    const weightMetric = metrics.find(m => m.label === '体重')
    const heightMetric = metrics.find(m => m.label === '身高')
    const headMetric = metrics.find(m => m.label === '头围')
    
    const weightValue = weightMetric && weightMetric.value !== '--' ? `${weightMetric.value}${weightMetric.unit}` : '--'
    const heightValue = heightMetric && heightMetric.value !== '--' ? `${heightMetric.value}${heightMetric.unit}` : '--'
    const headValue = headMetric && headMetric.value !== '--' ? `${headMetric.value}${headMetric.unit}` : '--'
    
    this.setData({ 
      metrics,
      weightValue,
      heightValue,
      headValue
    })
    console.log('📊 更新指标完成:', metrics)
    console.log('📊 预计算指标值:', { weightValue, heightValue, headValue })
  },

  // 检查云端数据结构
  async checkCloudDataStructure() {
    try {
      if (!app.globalData.openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }

      console.log('🔍 开始检查云端数据结构...')
      const db = wx.cloud.database()
      
      // 尝试不同的openid字段名
      let result = await db.collection('b-measure')
        .where({
          _openid: app.globalData.openid
        })
        .limit(1)
        .get()
      
      console.log('🔍 使用_openid查询结果:', result.data.length)
      
      // 如果_openid查询无结果，尝试openid
      if (result.data.length === 0) {
        result = await db.collection('b-measure')
          .where({
            openid: app.globalData.openid
          })
          .limit(1)
          .get()
        console.log('🔍 使用openid查询结果:', result.data.length)
      }
      
      if (result.data && result.data.length > 0) {
        const record = result.data[0]
        console.log('🔍 云端数据样本:', record)
        console.log('🔍 数据字段列表:', Object.keys(record))
        console.log('🔍 完整数据结构:', JSON.stringify(record, null, 2))
        
        // 显示数据结构信息
        let structInfo = '云端数据字段:\n'
        Object.keys(record).forEach(key => {
          const value = record[key]
          const type = typeof value
          structInfo += `${key}: ${type === 'object' ? JSON.stringify(value) : value} (${type})\n`
        })
        
        wx.showModal({
          title: '云端数据结构',
          content: structInfo,
          showCancel: false
        })
      } else {
        wx.showToast({
          title: '无云端数据',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('🔍 检查云端数据失败:', error)
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
  },

  // 添加基于WHO P50标准的测试数据（仅用于测试）
  async addTestData() {
    console.log('📊 准备添加基于WHO P50标准的测试数据')
    
    // 获取宝宝信息
    const babyInfo = this.data.babyInfo || {}
    const babyGender = this.normalizeGender(babyInfo.gender) || 'boy'
    const babyBirthday = babyInfo.birthday
    
    console.log('📊 宝宝信息:', { gender: babyGender, birthday: babyBirthday })
    
    // 生成10条测试数据，从6个月到24个月，每2个月一条记录
    const testRecords = []
    
    // 检查宝宝出生日期
    if (!babyBirthday) {
      wx.showToast({
        title: '请先设置宝宝出生日期',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    const birthDate = new Date(babyBirthday)
    const now = new Date()
    
    // 生成0-1岁（0-12个月）的测试数据，每月一条记录
    for (let i = 0; i < 13; i++) {
      // 计算月龄：从0个月开始，每次增加1个月，覆盖0-12个月
      const ageInMonths = i
      
      // 计算合理的记录日期
      const recordDate = this.calculateTestDataDate(birthDate, ageInMonths, i, 13)
      const dateStr = recordDate.toISOString().split('T')[0]
      
      console.log(`📊 生成第${i + 1}条数据: 月龄${ageInMonths}个月, 日期${dateStr}`)
      
      // 验证日期不早于出生日期
      if (recordDate < birthDate) {
        console.warn(`📊 警告: 记录日期${dateStr}早于出生日期${babyBirthday}，跳过此条记录`)
        continue
      }
      
      // 获取WHO P50标准值
      const weightP50 = this.getWHOPercentileValue('weight', ageInMonths, 'P50', babyGender)
      const heightP50 = this.getWHOPercentileValue('height', ageInMonths, 'P50', babyGender)
      const headP50 = this.getWHOPercentileValue('head', ageInMonths, 'P50', babyGender)
      
      // 在P50基础上添加小幅随机变化（±3%），模拟真实成长曲线
      const weightVariation = (Math.random() - 0.5) * 0.06 // ±3%
      const heightVariation = (Math.random() - 0.5) * 0.06 // ±3%
      const headVariation = (Math.random() - 0.5) * 0.06 // ±3%
      
      const weight = (weightP50 * (1 + weightVariation)).toFixed(1)
      const height = (heightP50 * (1 + heightVariation)).toFixed(1)
      const headCircumference = (headP50 * (1 + headVariation)).toFixed(1)
      
      testRecords.push({
        date: dateStr,
        weight: weight,
        height: height,
        headCircumference: headCircumference,
        timestamp: recordDate.getTime(),
        ageInMonths: ageInMonths, // 添加月龄信息用于调试
        whoP50: { // 添加WHO P50标准值用于调试
          weight: weightP50.toFixed(1),
          height: heightP50.toFixed(1),
          head: headP50.toFixed(1)
        }
      })
      
      console.log(`📊 生成第${i + 1}条数据 (${ageInMonths}个月):`, {
        date: dateStr,
        weight: weight,
        height: height,
        head: headCircumference,
        whoP50Weight: weightP50.toFixed(1),
        whoP50Height: heightP50.toFixed(1),
        whoP50Head: headP50.toFixed(1)
      })
    }
    
    console.log('📊 WHO P50标准测试数据生成完成:', testRecords)
    
    // 验证测试数据的合理性
    const validatedRecords = this.validateTestData(testRecords, birthDate)
    
    if (validatedRecords.length === 0) {
      wx.showToast({
        title: '无法生成有效的测试数据，请检查宝宝出生日期',
        icon: 'none',
        duration: 3000
      })
      return
    }
    
    // 转换为存储格式（移除调试信息）
    const storageRecords = validatedRecords.map(record => ({
      date: record.date,
      weight: record.weight,
      height: record.height,
      headCircumference: record.headCircumference,
      timestamp: record.timestamp
    }))
    
    wx.setStorageSync('measureRecords', storageRecords)
    console.log('📊 已保存WHO P50标准测试数据到本地存储')
    
    // 显示同步进度
    wx.showLoading({
      title: '正在同步数据到云端...',
      mask: true
    })
    
    // 同步测试数据到云端
    try {
      await this.syncTestDataToCloud(storageRecords, babyGender)
    } catch (error) {
      console.error('📊 同步失败，但本地数据已保存:', error)
    }
    
    wx.hideLoading()
    
    // 立即重新加载数据
    this.loadData().then(() => {
      console.log('📊 WHO P50标准测试数据加载完成')
      
      // 显示当前数据状态
      console.log('📊 当前页面数据状态:', {
        metrics: this.data.metrics,
        activeChartType: this.data.activeChartType,
        currentMetricValue: this.data.currentMetricValue,
        lastUpdateText: this.data.lastUpdateText
      })
      
      wx.showToast({
        title: `已添加${validatedRecords.length}条WHO P50标准测试数据\n(${babyGender === 'boy' ? '男宝' : '女宝'}标准)`,
        icon: 'success',
        duration: 3000
      })
    })
  },

  // 同步测试数据到云端
  async syncTestDataToCloud(testRecords, babyGender) {
    if (!app.globalData.openid) {
      console.log('📊 没有openid，跳过云端同步')
      return
    }

    try {
      console.log('📊 开始同步测试数据到云端')
      const db = wx.cloud.database()
      
      // 先清除现有的测试数据（可选）
      await db.collection('b-measure')
        .where({
          openid: app.globalData.openid
        })
        .remove()
      
      console.log('📊 已清除云端现有数据')
      
      // 批量添加测试数据
      const cloudRecords = testRecords.map(record => ({
        openid: app.globalData.openid,
        date: record.date,
        datetime: `${record.date} ${new Date(record.timestamp).toTimeString().split(' ')[0]}`,
        measurements: {
          weight: {
            value: parseFloat(record.weight),
            unit: 'kg'
          },
          height: {
            value: parseFloat(record.height),
            unit: 'cm'
          },
          head: {
            value: parseFloat(record.headCircumference),
            unit: 'cm'
          }
        },
        timestamp: record.timestamp,
        createdAt: new Date(record.timestamp),
        updatedAt: new Date(record.timestamp),
        isTestData: true // 标记为测试数据
      }))
      
      // 逐条添加测试数据（确保数据结构正确）
      for (let i = 0; i < cloudRecords.length; i++) {
        try {
          await db.collection('b-measure').add({
            data: cloudRecords[i]
          })
          console.log(`📊 已同步第${i + 1}条测试数据到云端`)
        } catch (error) {
          console.error(`📊 同步第${i + 1}条数据失败:`, error)
        }
      }
      
      console.log('📊 测试数据同步到云端完成')
    } catch (error) {
      console.error('📊 同步测试数据到云端失败:', error)
      // 不影响本地测试数据的使用
    }
  },

  // 添加多样化测试数据（包含不同成长模式）
  async addVariedTestData() {
    console.log('📊 准备添加多样化测试数据')
    
    // 获取宝宝信息
    const babyInfo = this.data.babyInfo || {}
    const babyGender = this.normalizeGender(babyInfo.gender) || 'boy'
    const babyBirthday = babyInfo.birthday
    
    console.log('📊 宝宝信息:', { gender: babyGender, birthday: babyBirthday })
    
    // 检查宝宝出生日期
    if (!babyBirthday) {
      wx.showToast({
        title: '请先设置宝宝出生日期',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 生成15条测试数据，模拟不同的成长模式
    const testRecords = []
    const birthDate = new Date(babyBirthday)
    const now = new Date()
    
    // 模式1: 正常成长（P50附近，0-4个月）
    for (let i = 0; i < 5; i++) {
      const ageInMonths = i
      
      // 计算合理的记录日期
      const recordDate = this.calculateTestDataDate(birthDate, ageInMonths, i, 15)
      const dateStr = recordDate.toISOString().split('T')[0]
      
      // 验证日期不早于出生日期
      if (recordDate < birthDate) {
        console.warn(`📊 模式1: 记录日期${dateStr}早于出生日期，跳过`)
        continue
      }
      
      const weightP50 = this.getWHOPercentileValue('weight', ageInMonths, 'P50', babyGender)
      const heightP50 = this.getWHOPercentileValue('height', ageInMonths, 'P50', babyGender)
      const headP50 = this.getWHOPercentileValue('head', ageInMonths, 'P50', babyGender)
      
      // P50附近小幅波动
      const variation = (Math.random() - 0.5) * 0.08 // ±4%
      
      testRecords.push({
        date: dateStr,
        weight: (weightP50 * (1 + variation)).toFixed(1),
        height: (heightP50 * (1 + variation)).toFixed(1),
        headCircumference: (headP50 * (1 + variation)).toFixed(1),
        timestamp: recordDate.getTime()
      })
    }
    
    // 模式2: 快速成长（P85附近，5-9个月）
    for (let i = 0; i < 5; i++) {
      const ageInMonths = 5 + i
      
      // 计算合理的记录日期
      const recordDate = this.calculateTestDataDate(birthDate, ageInMonths, i + 5, 15)
      const dateStr = recordDate.toISOString().split('T')[0]
      
      // 验证日期不早于出生日期
      if (recordDate < birthDate) {
        console.warn(`📊 模式2: 记录日期${dateStr}早于出生日期，跳过`)
        continue
      }
      
      const weightP85 = this.getWHOPercentileValue('weight', ageInMonths, 'P85', babyGender)
      const heightP85 = this.getWHOPercentileValue('height', ageInMonths, 'P85', babyGender)
      const headP85 = this.getWHOPercentileValue('head', ageInMonths, 'P85', babyGender)
      
      // P85附近小幅波动
      const variation = (Math.random() - 0.5) * 0.06 // ±3%
      
      testRecords.push({
        date: dateStr,
        weight: (weightP85 * (1 + variation)).toFixed(1),
        height: (heightP85 * (1 + variation)).toFixed(1),
        headCircumference: (headP85 * (1 + variation)).toFixed(1),
        timestamp: recordDate.getTime()
      })
    }
    
    // 模式3: 缓慢成长（P15附近，10-12个月）
    for (let i = 0; i < 3; i++) {
      const ageInMonths = 10 + i
      
      // 计算合理的记录日期
      const recordDate = this.calculateTestDataDate(birthDate, ageInMonths, i + 10, 15)
      const dateStr = recordDate.toISOString().split('T')[0]
      
      // 验证日期不早于出生日期
      if (recordDate < birthDate) {
        console.warn(`📊 模式3: 记录日期${dateStr}早于出生日期，跳过`)
        continue
      }
      
      const weightP15 = this.getWHOPercentileValue('weight', ageInMonths, 'P15', babyGender)
      const heightP15 = this.getWHOPercentileValue('height', ageInMonths, 'P15', babyGender)
      const headP15 = this.getWHOPercentileValue('head', ageInMonths, 'P15', babyGender)
      
      // P15附近小幅波动
      const variation = (Math.random() - 0.5) * 0.1 // ±5%
      
      testRecords.push({
        date: dateStr,
        weight: (weightP15 * (1 + variation)).toFixed(1),
        height: (heightP15 * (1 + variation)).toFixed(1),
        headCircumference: (headP15 * (1 + variation)).toFixed(1),
        timestamp: recordDate.getTime()
      })
    }
    
    // 模式4: 混合成长（P50-P85之间，补充2条记录）
    for (let i = 0; i < 2; i++) {
      const ageInMonths = 13 + i // 超出1岁的数据，用于展示更长期趋势
      
      // 计算合理的记录日期
      const recordDate = this.calculateTestDataDate(birthDate, ageInMonths, i + 13, 15)
      const dateStr = recordDate.toISOString().split('T')[0]
      
      // 验证日期不早于出生日期
      if (recordDate < birthDate) {
        console.warn(`📊 模式4: 记录日期${dateStr}早于出生日期，跳过`)
        continue
      }
      
      // 在P50和P85之间随机选择
      const percentile = Math.random() > 0.5 ? 'P50' : 'P85'
      const weightValue = this.getWHOPercentileValue('weight', ageInMonths, percentile, babyGender)
      const heightValue = this.getWHOPercentileValue('height', ageInMonths, percentile, babyGender)
      const headValue = this.getWHOPercentileValue('head', ageInMonths, percentile, babyGender)
      
      // 小幅波动
      const variation = (Math.random() - 0.5) * 0.06 // ±3%
      
      testRecords.push({
        date: dateStr,
        weight: (weightValue * (1 + variation)).toFixed(1),
        height: (heightValue * (1 + variation)).toFixed(1),
        headCircumference: (headValue * (1 + variation)).toFixed(1),
        timestamp: recordDate.getTime()
      })
    }
    
    // 按时间排序
    testRecords.sort((a, b) => a.timestamp - b.timestamp)
    
    console.log('📊 多样化测试数据生成完成:', testRecords)
    
    // 验证测试数据的合理性
    const validatedRecords = this.validateTestData(testRecords, birthDate)
    
    if (validatedRecords.length === 0) {
      wx.showToast({
        title: '无法生成有效的测试数据，请检查宝宝出生日期',
        icon: 'none',
        duration: 3000
      })
      return
    }
    
    wx.setStorageSync('measureRecords', validatedRecords)
    console.log('📊 已保存多样化测试数据到本地存储')
    
    // 显示同步进度
    wx.showLoading({
      title: '正在同步数据到云端...',
      mask: true
    })
    
    // 同步测试数据到云端
    try {
      await this.syncTestDataToCloud(validatedRecords, babyGender)
    } catch (error) {
      console.error('📊 同步失败，但本地数据已保存:', error)
    }
    
    wx.hideLoading()
    
    // 立即重新加载数据
    this.loadData().then(() => {
      wx.showToast({
        title: `已添加${validatedRecords.length}条多样化测试数据\n(${babyGender === 'boy' ? '男宝' : '女宝'}标准)`,
        icon: 'success',
        duration: 3000
      })
    })
  },

  // 计算合理的测试数据日期
  calculateTestDataDate(birthDate, ageInMonths, index, totalCount) {
    const now = new Date()
    
    // 基于出生日期计算理论日期
    const theoreticalDate = new Date(birthDate)
    theoreticalDate.setMonth(theoreticalDate.getMonth() + ageInMonths)
    
    // 如果理论日期超过当前时间，需要调整
    if (theoreticalDate > now) {
      // 计算宝宝当前实际月龄
      const currentAge = this.calculateAgeInMonths(birthDate.toISOString().split('T')[0])
      
      if (ageInMonths > currentAge) {
        // 如果要求的月龄超过当前月龄，则使用当前时间往前推
        const daysBack = (totalCount - index) * 7 // 每条记录间隔一周
        const adjustedDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
        
        // 确保调整后的日期不早于出生日期
        return adjustedDate > birthDate ? adjustedDate : new Date(birthDate.getTime() + index * 7 * 24 * 60 * 60 * 1000)
      }
    }
    
    // 如果理论日期合理，直接使用
    return theoreticalDate
  },

  // 添加本地测试数据（不同步云端，仅用于本地测试）
  addLocalTestData() {
    console.log('📊 准备添加本地测试数据（不同步云端）')
    
    // 获取宝宝信息
    const babyInfo = this.data.babyInfo || {}
    const babyGender = this.normalizeGender(babyInfo.gender) || 'boy'
    const babyBirthday = babyInfo.birthday
    
    // 检查宝宝出生日期
    if (!babyBirthday) {
      wx.showToast({
        title: '请先设置宝宝出生日期',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 生成10条测试数据
    const testRecords = []
    const birthDate = new Date(babyBirthday)
    const now = new Date()
    
    // 生成0-1岁（0-12个月）的测试数据，每月一条记录
    for (let i = 0; i < 13; i++) {
      const ageInMonths = i
      
      // 计算合理的记录日期
      const recordDate = this.calculateTestDataDate(birthDate, ageInMonths, i, 13)
      const dateStr = recordDate.toISOString().split('T')[0]
      
      // 验证日期不早于出生日期
      if (recordDate < birthDate) {
        console.warn(`📊 本地测试: 记录日期${dateStr}早于出生日期，跳过`)
        continue
      }
      
      const weightP50 = this.getWHOPercentileValue('weight', ageInMonths, 'P50', babyGender)
      const heightP50 = this.getWHOPercentileValue('height', ageInMonths, 'P50', babyGender)
      const headP50 = this.getWHOPercentileValue('head', ageInMonths, 'P50', babyGender)
      
      const weightVariation = (Math.random() - 0.5) * 0.06
      const heightVariation = (Math.random() - 0.5) * 0.06
      const headVariation = (Math.random() - 0.5) * 0.06
      
      testRecords.push({
        date: dateStr,
        weight: (weightP50 * (1 + weightVariation)).toFixed(1),
        height: (heightP50 * (1 + heightVariation)).toFixed(1),
        headCircumference: (headP50 * (1 + headVariation)).toFixed(1),
        timestamp: recordDate.getTime()
      })
    }
    
    // 验证测试数据的合理性
    const validatedRecords = this.validateTestData(testRecords, birthDate)
    
    if (validatedRecords.length === 0) {
      wx.showToast({
        title: '无法生成有效的测试数据，请检查宝宝出生日期',
        icon: 'none',
        duration: 3000
      })
      return
    }
    
    // 只保存到本地存储
    wx.setStorageSync('measureRecords', validatedRecords)
    console.log('📊 已保存本地测试数据')
    
    // 强制使用本地数据重新加载
    this.loadDataFromLocal().then(() => {
      wx.showToast({
        title: `已添加${validatedRecords.length}条本地测试数据\n(${babyGender === 'boy' ? '男宝' : '女宝'}标准)`,
        icon: 'success',
        duration: 3000
      })
    })
  },

  // 强制从本地加载数据
  async loadDataFromLocal() {
    try {
      console.log('📊 强制从本地加载数据')
      
      // 获取宝宝信息
      const babyInfo = wx.getStorageSync('babyInfo') || {}
      const normalizedGender = this.normalizeGender(babyInfo.gender)
      const genderText = this.getGenderText(babyInfo.gender)
      const ageText = this.calculateAge(babyInfo.birthday)
      
      this.setData({
        currentGender: normalizedGender,
        babyInfo: babyInfo,
        genderText: genderText,
        ageText: ageText
      })
      
      // 直接从本地获取数据
      const records = wx.getStorageSync('measureRecords') || []
      console.log('📊 本地数据记录数量:', records.length)
      
      if (records.length > 0) {
        this.updateMetrics(records)
        this.updateRecentRecords(records)
        this.updateChartData(records)
        
        const latest = records[records.length - 1]
        this.setData({
          lastUpdateText: this.formatDate(latest.date)
        })
        
        this.updateCurrentMetricDisplay()
        console.log('📊 本地数据加载完成')
      }
      
    } catch (error) {
      console.error('📊 本地数据加载失败:', error)
    }
  },

  // 显示测试数据说明
  showTestDataInfo() {
    const message = `🧪 测试数据说明：

📊 WHO P50测试数据 (13条)：
• 基于WHO儿童生长标准P50百分位
• 模拟0-12个月婴儿期成长轨迹
• 数据在P50附近小幅波动(±3%)
• 每月一条记录，完整覆盖第一年
• 同步到云端数据库

📈 多样化测试数据 (15条)：
• 包含4种不同成长模式
• 正常成长(P50附近) - 0-4个月
• 快速成长(P85附近) - 5-9个月  
• 缓慢成长(P15附近) - 10-12个月
• 混合成长(P50-P85) - 13-14个月
• 同步到云端数据库

💾 本地测试数据 (13条)：
• 基于WHO P50标准生成
• 覆盖0-12个月婴儿期
• 仅保存在本地存储
• 不同步云端，快速测试用
• 适合离线调试

💡 数据特点：
• 专注0-1岁婴儿期成长监测
• 自动适配宝宝性别
• 基于出生日期计算记录时间
• 确保所有日期不早于出生日期
• 符合WHO儿童生长标准
• 包含体重、身高、头围三项指标
• 智能处理超出当前月龄的情况`
    
    wx.showModal({
      title: '测试数据说明',
      content: message,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 验证测试数据的合理性
  validateTestData(testRecords, birthDate) {
    const validRecords = []
    const invalidRecords = []
    
    testRecords.forEach((record, index) => {
      const recordDate = new Date(record.date)
      const isValid = recordDate >= birthDate && recordDate <= new Date()
      
      if (isValid) {
        validRecords.push(record)
      } else {
        invalidRecords.push({
          index: index + 1,
          date: record.date,
          reason: recordDate < birthDate ? '早于出生日期' : '晚于当前日期'
        })
      }
    })
    
    console.log('📊 测试数据验证结果:', {
      总数: testRecords.length,
      有效: validRecords.length,
      无效: invalidRecords.length,
      无效记录: invalidRecords
    })
    
    return validRecords
  },

  // 测试数据生成功能
  testDataGeneration() {
    console.log('🧪 开始测试数据生成功能')
    
    const babyInfo = this.data.babyInfo || {}
    const babyGender = this.normalizeGender(babyInfo.gender) || 'boy'
    
    console.log('🧪 测试参数:', {
      gender: babyGender,
      birthday: babyInfo.birthday
    })
    
    // 测试WHO标准值获取
    for (let age = 6; age <= 24; age += 6) {
      const weight = this.getWHOPercentileValue('weight', age, 'P50', babyGender)
      const height = this.getWHOPercentileValue('height', age, 'P50', babyGender)
      const head = this.getWHOPercentileValue('head', age, 'P50', babyGender)
      
      console.log(`🧪 ${age}个月WHO P50标准值:`, {
        weight: weight.toFixed(1),
        height: height.toFixed(1),
        head: head.toFixed(1)
      })
    }
    
    wx.showModal({
      title: '数据生成测试',
      content: '测试完成，请查看控制台输出',
      showCancel: false
    })
  },

  // 显示当前数据统计
  showDataStats() {
    const records = wx.getStorageSync('measureRecords') || []
    
    if (records.length === 0) {
      wx.showToast({
        title: '暂无数据',
        icon: 'none'
      })
      return
    }
    
    // 计算统计信息
    const stats = {
      total: records.length,
      dateRange: {
              start: records[0] && records[0].date,
      end: records[records.length - 1] && records[records.length - 1].date
      },
      latest: records[records.length - 1]
    }
    
    // 计算百分位分布
    const babyInfo = this.data.babyInfo || {}
    const babyGender = this.normalizeGender(babyInfo.gender) || 'boy'
    
    let percentileStats = {
      weight: { low: 0, normal: 0, high: 0 },
      height: { low: 0, normal: 0, high: 0 },
      head: { low: 0, normal: 0, high: 0 }
    }
    
    records.forEach((record, index) => {
      const ageInMonths = 6 + index * 2 // 简化计算
      
      ['weight', 'height', 'head'].forEach(type => {
        const value = parseFloat(record[type === 'head' ? 'headCircumference' : type])
        if (value) {
          const position = this.calculatePercentilePosition(value, type, ageInMonths, babyGender)
          if (position) {
            if (position.level === 'low' || position.level === 'below-average') {
              percentileStats[type].low++
            } else if (position.level === 'high' || position.level === 'above-average') {
              percentileStats[type].high++
            } else {
              percentileStats[type].normal++
            }
          }
        }
      })
    })
    
    const message = `数据统计信息：
📊 总记录数：${stats.total}条
📅 时间范围：${stats.dateRange.start} 至 ${stats.dateRange.end}
📈 最新数据：
  体重：${stats.latest.weight}kg
  身高：${stats.latest.height}cm
  头围：${stats.latest.headCircumference}cm

百分位分布：
体重 - 偏低:${percentileStats.weight.low} 正常:${percentileStats.weight.normal} 偏高:${percentileStats.weight.high}
身高 - 偏低:${percentileStats.height.low} 正常:${percentileStats.height.normal} 偏高:${percentileStats.height.high}
头围 - 偏低:${percentileStats.head.low} 正常:${percentileStats.head.normal} 偏高:${percentileStats.head.high}`
    
    wx.showModal({
      title: '数据统计',
      content: message,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 清除所有测试数据
  clearTestData() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有测试数据吗？此操作不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          // 清除本地数据
          wx.removeStorageSync('measureRecords')
          console.log('📊 已清除本地测试数据')
          
          // 清除云端数据
          await this.clearCloudData()
          
          // 重新加载数据
          this.loadData().then(() => {
            wx.showToast({
              title: '测试数据已清除',
              icon: 'success'
            })
          })
        }
      }
    })
  },

  // 清除云端数据
  async clearCloudData() {
    if (!app.globalData.openid) {
      console.log('📊 没有openid，跳过云端清除')
      return
    }

    try {
      console.log('📊 开始清除云端数据')
      const db = wx.cloud.database()
      
      await db.collection('b-measure')
        .where({
          openid: app.globalData.openid
        })
        .remove()
      
      console.log('📊 云端数据清除完成')
    } catch (error) {
      console.error('📊 清除云端数据失败:', error)
    }
  },

  // 更新最近记录
  updateRecentRecords(records) {
    const recentRecords = records
      .slice(-5) // 取最后5条
      .reverse() // 最新的在前
      .map(record => ({
        date: record.date,
        displayDate: this.formatDateShort(record.date),
        weight: record.weight,
        height: record.height,
        headCircumference: record.headCircumference
      }))
    
    this.setData({ recentRecords })
    console.log('📊 更新最近记录:', recentRecords)
  },

  // 更新图表数据
  updateChartData(records) {
    console.log('📊 开始更新图表数据，输入记录:', records)
    
    const filteredRecords = this.filterRecordsByTimeRange(records)
    console.log('📊 过滤后的记录:', filteredRecords)
    
    // 添加函数开始时的调试信息
    console.log('📊 updateChartData函数开始执行')
    console.log('📊 当前this.data.chartData:', this.data.chartData)
    
    // 获取宝宝信息用于计算WHO标准值
    const babyInfo = this.data.babyInfo || {}
    const babyGender = this.normalizeGender(babyInfo.gender)
    const babyBirthday = babyInfo.birthday
    
    console.log('📊 宝宝信息:', {
      gender: babyGender,
      birthday: babyBirthday
    })

    // 如果没有用户数据，生成默认的WHO成长曲线
    if (!filteredRecords || filteredRecords.length === 0) {
      console.log('📊 没有用户数据，生成默认WHO成长曲线')
      this.generateDefaultWHOChart(babyGender, babyBirthday)
      return
    }
    
    const chartData = {
      weight: { 
        labels: [], 
        values: [], 
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      },
      height: { 
        labels: [], 
        values: [], 
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      },
      head: { 
        labels: [], 
        values: [], 
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      }
    }
    
    console.log('📊 chartData对象创建完成:', chartData)
    console.log('📊 chartData类型:', typeof chartData)
    console.log('📊 chartData是否为null:', chartData === null)
    console.log('📊 chartData是否为undefined:', chartData === undefined)
    
    // 创建chartData的备份，防止意外修改
    const chartDataBackup = JSON.parse(JSON.stringify(chartData))
    
    // 收集所有实际数据的月龄，用于生成WHO百分位曲线的范围
    const dataAgeMonths = []
    
    // 先处理实际数据，收集月龄信息
    filteredRecords.forEach((record, index) => {
      const label = this.formatDateForChart(record.date)
      
      // 计算记录时宝宝的月龄
      let ageInMonths = 0
      if (babyBirthday && record.date) {
        try {
          const birthDate = new Date(babyBirthday)
          const recordDate = new Date(record.date)
          
          let months = (recordDate.getFullYear() - birthDate.getFullYear()) * 12
          months += recordDate.getMonth() - birthDate.getMonth()
          
          if (recordDate.getDate() < birthDate.getDate()) {
            months--
          }
          
          ageInMonths = Math.max(0, months)
        } catch (error) {
          console.error('计算记录时月龄失败:', error)
          ageInMonths = this.calculateAgeInMonths(babyBirthday)
        }
      } else {
        // 如果没有生日信息，使用默认月龄（比如2个月，对应测试数据）
        ageInMonths = 2
        console.log('📊 ⚠️ 没有生日信息，使用默认月龄:', ageInMonths)
      }
      
      console.log(`📊 处理第${index + 1}条记录:`, {
        date: record.date,
        ageInMonths: ageInMonths,
        weight: record.weight,
        height: record.height,
        headCircumference: record.headCircumference
      })
      
      // 为有数据的指标添加数据点
      if (record.weight) {
        chartData.weight.labels.push(label)
        chartData.weight.values.push(parseFloat(record.weight))
        dataAgeMonths.push(ageInMonths)
        console.log('📊 添加体重数据:', parseFloat(record.weight))
      }
      
      if (record.height) {
        chartData.height.labels.push(label)
        chartData.height.values.push(parseFloat(record.height))
        if (!dataAgeMonths.includes(ageInMonths)) {
          dataAgeMonths.push(ageInMonths)
        }
        console.log('📊 添加身高数据:', parseFloat(record.height))
      }
      
      if (record.headCircumference) {
        chartData.head.labels.push(label)
        chartData.head.values.push(parseFloat(record.headCircumference))
        if (!dataAgeMonths.includes(ageInMonths)) {
          dataAgeMonths.push(ageInMonths)
        }
        console.log('📊 添加头围数据:', parseFloat(record.headCircumference))
      }
    })
    
    // 确定WHO百分位曲线的范围：从最小月龄-1到最大月龄+1，确保有足够的上下文
    if (dataAgeMonths.length === 0) {
      console.log('📊 ⚠️ 没有有效的数据月龄，跳过WHO百分位数据生成')
      this.setData({ chartData }, () => {
        console.log('📊 图表数据已设置到页面状态（无WHO数据）')
        setTimeout(() => {
          this.drawChart()
        }, 100)
      })
      return
    }
    
    const minAge = Math.max(0, Math.min(...dataAgeMonths) - 1)
    const maxAge = Math.max(...dataAgeMonths) + 1
    
    console.log('📊 WHO曲线范围:', minAge, '-', maxAge, '个月，基于数据月龄:', dataAgeMonths)
    console.log('📊 chartData结构检查:', {
      weight: !!chartData.weight,
      height: !!chartData.height,
      head: !!chartData.head,
      weightPercentiles: !!(chartData.weight && chartData.weight.percentiles),
      heightPercentiles: !!(chartData.height && chartData.height.percentiles),
      headPercentiles: !!(chartData.head && chartData.head.percentiles)
    })
    
    // 确保chartData对象完整性
    ['weight', 'height', 'head'].forEach(type => {
      if (!chartData[type]) {
        console.log(`📊 ⚠️ 修复缺失的chartData[${type}]`)
        chartData[type] = {
          labels: [],
          values: [],
          percentiles: {
            P3: [], P15: [], P50: [], P85: [], P97: []
          }
        }
      }
      if (!chartData[type].percentiles) {
        console.log(`📊 ⚠️ 修复缺失的chartData[${type}].percentiles`)
        chartData[type].percentiles = {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      }
    })
    
    // 为每个指标生成WHO百分位数据
    try {
      ['weight', 'height', 'head'].forEach(type => {
        console.log(`📊 处理指标类型: ${type}`)
        console.log(`📊 chartData类型:`, typeof chartData)
        console.log(`📊 chartData是否为null:`, chartData === null)
        console.log(`📊 chartData是否为undefined:`, chartData === undefined)
        
        // 如果chartData被意外修改，重新创建
        if (!chartData || typeof chartData !== 'object') {
          console.log(`📊 ⚠️ chartData被意外修改，重新创建`)
          chartData = chartDataBackup ? JSON.parse(JSON.stringify(chartDataBackup)) : {
            weight: { labels: [], values: [], percentiles: { P3: [], P15: [], P50: [], P85: [], P97: [] } },
            height: { labels: [], values: [], percentiles: { P3: [], P15: [], P50: [], P85: [], P97: [] } },
            head: { labels: [], values: [], percentiles: { P3: [], P15: [], P50: [], P85: [], P97: [] } }
          }
        }
        
        console.log(`📊 chartData[${type}]存在:`, !!chartData[type])
        console.log(`📊 chartData完整结构:`, Object.keys(chartData))
        
        // 确保chartData[type]存在
        if (!chartData[type]) {
          console.log(`📊 ⚠️ chartData[${type}]不存在，跳过`)
          return
        }
        
        const hasData = chartData[type] && chartData[type].values && chartData[type].values.length > 0
        if (hasData) {
          // 确保percentiles对象存在
          if (!chartData[type].percentiles) {
            console.log(`📊 ⚠️ chartData[${type}].percentiles不存在，跳过`)
            return
          }
          
          // 为有实际数据的指标生成WHO百分位曲线
          for (let ageInMonths = minAge; ageInMonths <= maxAge; ageInMonths++) {
            Object.keys(chartData[type].percentiles).forEach(percentile => {
              const value = this.getWHOPercentileValue(type, ageInMonths, percentile, babyGender)
              chartData[type].percentiles[percentile].push(value)
            })
          }
          console.log(`📊 为${type}生成WHO百分位数据，范围:${minAge}-${maxAge}个月`)
        } else {
          console.log(`📊 ${type}没有数据，跳过WHO百分位数据生成`)
        }
      })
    } catch (error) {
      console.error('📊 ❌ 生成WHO百分位数据时发生错误:', error)
      console.error('📊 ❌ 错误详情:', {
        message: error.message,
        stack: error.stack,
        chartData: chartData,
        chartDataType: typeof chartData
      })
      
      // 尝试使用备份数据
      console.log('📊 🔄 尝试使用备份数据恢复')
      if (chartDataBackup && typeof chartDataBackup === 'object') {
        console.log('📊 ✅ 使用备份数据继续执行')
        // 不生成WHO百分位数据，直接使用备份的基础结构
        this.setData({ chartData: chartDataBackup }, () => {
          console.log('📊 图表数据已设置到页面状态（使用备份）')
          setTimeout(() => {
            this.drawChart()
          }, 100)
        })
        return
      } else {
        throw error // 如果备份也有问题，重新抛出错误
      }
    }
    
    console.log('📊 最终图表数据:', chartData)
    console.log('📊 当前活动图表类型:', this.data.activeChartType)
    
    this.setData({ chartData }, () => {
      console.log('📊 图表数据已设置到页面状态')
      // 延迟绘制确保数据已更新
      setTimeout(() => {
        this.drawChart()
      }, 100)
    })
  },

  // 根据时间范围过滤记录
  filterRecordsByTimeRange(records) {
    if (this.data.timeRange === 'all') {
      return records
    }
    
    const days = parseInt(this.data.timeRange)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return records.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate >= cutoffDate
    })
  },

  // 生成默认的WHO成长曲线（当没有用户数据时）
  generateDefaultWHOChart(babyGender, babyBirthday) {
    console.log('📊 生成默认WHO成长曲线，性别:', babyGender, '生日:', babyBirthday)
    
    // 确保性别参数正确标准化
    const normalizedGender = this.normalizeGender(babyGender)
    console.log('📊 标准化后的性别:', normalizedGender)
    
    // 确定时间范围
    let startAgeMonths = 0
    let endAgeMonths = 12 // 默认显示0-12个月
    
    // 如果有生日信息，计算当前月龄
    if (babyBirthday) {
      const currentAgeMonths = this.calculateAgeInMonths(babyBirthday)
      if (currentAgeMonths > 0) {
        endAgeMonths = Math.max(12, currentAgeMonths + 2) // 至少显示到12个月，或当前月龄+2个月
      }
    }
    
    console.log('📊 WHO曲线时间范围:', startAgeMonths, '-', endAgeMonths, '个月')
    
    const chartData = {
      weight: { 
        labels: [], 
        values: [], 
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      },
      height: { 
        labels: [], 
        values: [], 
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      },
      head: { 
        labels: [], 
        values: [], 
        percentiles: {
          P3: [], P15: [], P50: [], P85: [], P97: []
        }
      }
    }
    
    // 生成时间轴和WHO百分位数据
    for (let ageInMonths = startAgeMonths; ageInMonths <= endAgeMonths; ageInMonths++) {
      // 生成时间标签
      let dateLabel
      if (babyBirthday) {
        const birthDate = new Date(babyBirthday)
        const targetDate = new Date(birthDate)
        targetDate.setMonth(birthDate.getMonth() + ageInMonths)
        dateLabel = this.formatDateForChart(targetDate.toISOString().split('T')[0])
      } else {
        dateLabel = `${ageInMonths}月`
      }
      
      // 为每个指标生成数据
      ['weight', 'height', 'head'].forEach(type => {
        // 确保chartData[type]存在
        if (!chartData[type]) {
          console.log(`📊 ⚠️ generateDefaultWHOChart: chartData[${type}]不存在，跳过`)
          return
        }
        
        chartData[type].labels.push(dateLabel)
        chartData[type].values.push(null) // 没有实际测量值
        
        // 确保percentiles对象存在
        if (!chartData[type].percentiles) {
          console.log(`📊 ⚠️ generateDefaultWHOChart: chartData[${type}].percentiles不存在，跳过`)
          return
        }
        
        // 生成WHO百分位数据
        Object.keys(chartData[type].percentiles).forEach(percentile => {
          const value = this.getWHOPercentileValue(type, ageInMonths, percentile, normalizedGender)
          chartData[type].percentiles[percentile].push(value)
        })
      })
    }
    
    console.log('📊 生成的默认WHO图表数据:', chartData)
    
    this.setData({ chartData }, () => {
      console.log('📊 默认WHO图表数据已设置到页面状态')
      setTimeout(() => {
        this.drawChart()
      }, 100)
    })
  },



  // 时间范围选择
  selectTimeRange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    
    // 重新加载图表数据
    this.getMeasureRecords().then(records => {
      this.updateChartData(records)
    })
  },

  // 图表类型切换
  switchChartType(e) {
    const type = e.currentTarget.dataset.type
    
    // 如果点击的是当前已选中的类型，不做任何操作
    if (type === this.data.activeChartType) {
      return
    }
    
    console.log('📊 切换图表类型:', type)
    
    // 轻微震动反馈
    wx.vibrateShort({
      type: 'light'
    })
    
    this.setData({ activeChartType: type }, () => {
      // 更新当前指标显示
      this.updateCurrentMetricDisplay()
      
      // 延迟绘制图表，让动画更流畅
      setTimeout(() => {
        this.drawChart()
      }, 150)
      
      // 简化的反馈提示
      const currentValue = this.data.currentMetricValue
      if (currentValue && currentValue !== '--') {
        wx.showToast({
          title: `${this.getTypeName(type)}: ${currentValue}${this.data.currentMetricUnit}`,
          icon: 'none',
          duration: 1200
        })
      }
    })
  },

  // 查看全部记录
  viewAllRecords() {
    wx.navigateTo({
      url: '/pages/records/records'
    })
  },

  // 编辑记录
  editRecord(e) {
    const record = e.currentTarget.dataset.record
    this.setData({
      showEditModal: true,
      containerClass: 'modal-active',
      editingRecord: {
        date: record.date,
        displayDate: record.displayDate,
        weight: record.weight || '',
        height: record.height || '',
        headCircumference: record.headCircumference || ''
      }
    })
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({ 
      showEditModal: false,
      containerClass: ''
    })
  },

  // 输入处理
  onWeightInput(e) {
    this.setData({
      'editingRecord.weight': e.detail.value
    })
  },

  onHeightInput(e) {
    this.setData({
      'editingRecord.height': e.detail.value
    })
  },

  onHeadInput(e) {
    this.setData({
      'editingRecord.headCircumference': e.detail.value
    })
  },

  onDateChange(e) {
    const selectedDate = e.detail.value
    const today = new Date().toISOString().split('T')[0]
    
    // 检查是否选择了未来日期
    if (selectedDate > today) {
      wx.showToast({
        title: '不能选择未来日期',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    this.setData({
      'editingRecord.date': selectedDate,
      'editingRecord.displayDate': this.formatDateShort(selectedDate)
    })
  },

  // 保存记录
  async saveRecord() {
    const record = this.data.editingRecord
    
    if (!record.weight && !record.height && !record.headCircumference) {
      wx.showToast({
        title: '请至少输入一项数据',
        icon: 'none'
      })
      return
    }

    // 验证日期不能为未来日期
    if (record.date) {
      const selectedDate = record.date
      const today = new Date().toISOString().split('T')[0]
      
      if (selectedDate > today) {
        wx.showToast({
          title: '记录日期不能是未来日期',
          icon: 'none',
          duration: 2000
        })
        return
      }
    }
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      // 构造记录对象
      const measureRecord = {
        date: record.date || new Date().toISOString().split('T')[0],
        weight: record.weight,
        height: record.height,
        headCircumference: record.headCircumference,
        timestamp: Date.now()
      }
      
      // 保存到云端
      if (app.globalData.openid) {
        const db = wx.cloud.database()
        await db.collection('b-measure').add({
          data: {
            ...measureRecord,
            openid: app.globalData.openid
          }
        })
      }
      
      // 保存到本地
      let localRecords = wx.getStorageSync('measureRecords') || []
      localRecords.push(measureRecord)
      wx.setStorageSync('measureRecords', localRecords)
      
      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      
      this.hideEditModal()
      this.loadData() // 重新加载数据
      
    } catch (error) {
      wx.hideLoading()
      console.error('保存失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 已移除showMetricDetail方法，现在通过顶部标签切换

  // 初始化图表
  initChart() {
    console.log('📊 开始初始化图表')
    wx.createSelectorQuery()
      .select('#growthChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        console.log('📊 Canvas查询结果:', res)
        if (res[0]) {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          const dpr = wx.getWindowInfo().pixelRatio
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)
          
          this.canvas = canvas
          this.ctx = ctx
          this.canvasWidth = res[0].width
          this.canvasHeight = res[0].height
          
          console.log('📊 图表初始化完成:', {
            width: this.canvasWidth,
            height: this.canvasHeight,
            dpr: dpr
          })
          
          // 初始化完成后立即绘制一次
          this.drawChart()
        } else {
          console.log('📊 ❌ Canvas元素未找到')
        }
      })
  },

  // 绘制图表
  drawChart() {
    console.log('📊 开始绘制图表')
    console.log('📊 Canvas上下文:', !!this.ctx)
    console.log('📊 Canvas尺寸:', this.canvasWidth, 'x', this.canvasHeight)
    
    if (!this.ctx) {
      console.log('📊 ❌ Canvas上下文不存在，尝试重新初始化')
      this.initChart()
      return
    }
    
    const ctx = this.ctx
    const width = this.canvasWidth
    const height = this.canvasHeight
    const padding = 40
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    // 获取当前图表数据
    console.log('📊 当前图表类型:', this.data.activeChartType)
    console.log('📊 完整图表数据:', this.data.chartData)
    
    const currentData = this.data.chartData[this.data.activeChartType]
    console.log('📊 当前图表数据:', currentData)
    
    if (!currentData) {
      console.log('📊 ❌ 图表数据对象不存在')
      // 绘制空状态
      ctx.fillStyle = '#999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无数据', width / 2, height / 2)
      ctx.fillText('点击右上角"测试"按钮添加数据', width / 2, height / 2 + 20)
      return
    }
    
    const values = currentData.values || []
    const percentiles = currentData.percentiles || {}
    const labels = currentData.labels || []
    
    console.log('📊 绘制数据:', {
      values: values,
      percentiles: percentiles,
      labels: labels,
      dataCount: values.length
    })
    
    // 检查是否有WHO百分位数据
    const hasPercentileData = Object.keys(percentiles).length > 0 && 
                              Object.values(percentiles).some(data => data && data.length > 0)
    
    if (values.length === 0 && !hasPercentileData) {
      console.log('📊 ❌ 没有任何数据（用户数据和WHO数据都没有）')
      ctx.fillStyle = '#999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无数据', width / 2, height / 2)
      ctx.fillText('点击右上角"测试"按钮添加数据', width / 2, height / 2 + 20)
      return
    }
    
    // 计算所有数据的最小值和最大值
    const allValues = []
    
    // 添加实际测量值（过滤null值）
    const validValues = values.filter(v => v !== null && v !== undefined)
    if (validValues.length > 0) {
      allValues.push(...validValues)
    }
    
    // 添加WHO百分位数据
    Object.values(percentiles).forEach(percentileData => {
      if (percentileData && percentileData.length > 0) {
        const validPercentileValues = percentileData.filter(v => v !== null && v !== undefined && !isNaN(v))
        allValues.push(...validPercentileValues)
      }
    })
    
    if (allValues.length === 0) {
      console.log('📊 ❌ 没有有效数值')
      ctx.fillStyle = '#999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无数据', width / 2, height / 2)
      ctx.fillText('点击右上角"测试"按钮添加数据', width / 2, height / 2 + 20)
      return
    }
    
    const minValue = Math.min(...allValues) * 0.9
    const maxValue = Math.max(...allValues) * 1.1
    
    console.log('📊 数值范围:', minValue, '-', maxValue)
    
    // 绘制网格
    this.drawGrid(ctx, width, height, padding, minValue, maxValue)
    
    // 绘制坐标轴
    this.drawAxes(ctx, width, height, padding, minValue, maxValue, labels)
    
    // 绘制百分位线
    this.drawPercentileLines(ctx, percentiles, width, height, padding, minValue, maxValue)
    
    // 绘制实际数据线（如果有有效数据）
    const hasValidData = values.some(v => v !== null && v !== undefined)
    console.log('📊 检查实际数据:', { values, hasValidData, valuesLength: values.length })
    if (hasValidData) {
      console.log('📊 开始绘制实际数据线，数据:', values)
      this.drawLine(ctx, values, '#667eea', width, height, padding, minValue, maxValue, false)
      console.log('📊 ✅ 实际数据线绘制完成')
    } else {
      console.log('📊 ❌ 没有有效的实际数据，跳过绘制')
    }
    
    // 绘制图例
    this.drawPercentileLegend(ctx, width, height, hasValidData)
    
    console.log('📊 ✅ 图表绘制完成')
  },

  // 绘制网格
  drawGrid(ctx, width, height, padding, minValue, maxValue) {
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * i / 5
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }
    
    // 垂直网格线
    const data = this.data.chartData[this.data.activeChartType]
    if (data && data.values) {
      const stepX = (width - 2 * padding) / Math.max(1, data.values.length - 1)
      for (let i = 0; i < data.values.length; i++) {
        const x = padding + stepX * i
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, height - padding)
        ctx.stroke()
      }
    }
  },

  // 绘制坐标轴
  drawAxes(ctx, width, height, padding, minValue, maxValue, labels) {
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    
    // Y轴
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()
    
    // X轴
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Y轴标签
    ctx.fillStyle = '#666'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (maxValue - minValue) * (5 - i) / 5
      const y = padding + (height - 2 * padding) * i / 5
      ctx.fillText(value.toFixed(1), padding - 5, y + 3)
    }
    
    // X轴标签
    ctx.textAlign = 'center'
    const stepX = (width - 2 * padding) / Math.max(1, labels.length - 1)
    labels.forEach((label, i) => {
      const x = padding + stepX * i
      ctx.fillText(label, x, height - padding + 15)
    })
  },

  // 绘制数据线
  drawLine(ctx, data, color, width, height, padding, minValue, maxValue, isDashed) {
    if (data.length === 0) return
    
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    
    if (isDashed) {
      ctx.setLineDash([5, 5])
    } else {
      ctx.setLineDash([])
    }
    
    // 如果只有一个数据点，只绘制点，不绘制线
    if (data.length === 1) {
      const x = padding + (width - 2 * padding) / 2 // 居中显示
      const y = height - padding - ((data[0] - minValue) / (maxValue - minValue)) * (height - 2 * padding)
      
      // 绘制数据点
      if (!isDashed) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI) // 单个点稍大一些
        ctx.fill()
        
        // 添加一个外圈强调
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, 2 * Math.PI)
        ctx.stroke()
      }
      return
    }
    
    const stepX = (width - 2 * padding) / (data.length - 1)
    
    ctx.beginPath()
    data.forEach((value, i) => {
      const x = padding + stepX * i
      const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()
    
    // 绘制数据点
    if (!isDashed) {
      ctx.fillStyle = color
      data.forEach((value, i) => {
        const x = padding + stepX * i
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding)
        
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
  },

  // 绘制百分位线
  drawPercentileLines(ctx, percentiles, width, height, padding, minValue, maxValue) {
    console.log('📊 开始绘制百分位线:', percentiles)
    
    const percentileColors = {
      P3: '#ff6b6b',   // 红色 - 第3百分位
      P15: '#ffa726',  // 橙色 - 第15百分位
      P50: '#66bb6a',  // 绿色 - 第50百分位（中位数）
      P85: '#42a5f5',  // 蓝色 - 第85百分位
      P97: '#ab47bc'   // 紫色 - 第97百分位
    }
    
    const percentileStyles = {
      P3: [2, 8],      // 短虚线
      P15: [5, 5],     // 中虚线
      P50: [],         // 实线
      P85: [5, 5],     // 中虚线
      P97: [2, 8]      // 短虚线
    }
    
    Object.keys(percentiles).forEach(percentile => {
      const data = percentiles[percentile]
      console.log(`📊 绘制${percentile}百分位线:`, data)
      
      if (data && data.length > 0) {
        const color = percentileColors[percentile] || '#ddd'
        const dashStyle = percentileStyles[percentile] || [5, 5]
        
        console.log(`📊 ${percentile}线条样式:`, { color, dashStyle, lineWidth: percentile === 'P50' ? 2 : 1.5 })
        
        // 直接在这里绘制百分位线，不调用drawLine方法
        ctx.strokeStyle = color
        ctx.lineWidth = percentile === 'P50' ? 2 : 1.5
        ctx.setLineDash(dashStyle)
        
        if (data.length === 1) {
          // 如果只有一个数据点，绘制一个水平的短线段
          const x = padding + (width - 2 * padding) / 2 // 居中显示
          const y = height - padding - ((data[0] - minValue) / (maxValue - minValue)) * (height - 2 * padding)
          const lineLength = 20 // 短线段长度
          
          ctx.beginPath()
          ctx.moveTo(x - lineLength / 2, y)
          ctx.lineTo(x + lineLength / 2, y)
          ctx.stroke()
        } else {
          // 多个数据点，绘制连续的线
          const stepX = (width - 2 * padding) / Math.max(1, data.length - 1)
          
          ctx.beginPath()
          data.forEach((value, i) => {
            const x = padding + stepX * i
            const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding)
            
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          })
          ctx.stroke()
        }
        
        console.log(`📊 ✅ ${percentile}百分位线绘制完成`)
      } else {
        console.log(`📊 ❌ ${percentile}百分位数据为空或无效`)
      }
    })
    
    // 重置线条样式
    ctx.setLineDash([])
  },



  // 绘制百分位图例
  drawPercentileLegend(ctx, width, height, hasValidData = true) {
    // 确保绘制区域在Canvas范围内
    if (!ctx || width <= 0 || height <= 0) {
      console.warn('Canvas参数无效，跳过图例绘制')
      return
    }
    
    // 保存当前绘制状态
    ctx.save()
    
    try {
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      
      // 正确获取性别文本，使用getGenderText方法确保一致性
      const genderText = this.getGenderText(this.data.babyInfo && this.data.babyInfo.gender)
      const legendItems = []
      
      // 只有当有实际数据时才显示"实际测量值"
      if (hasValidData) {
        legendItems.push({ label: '实际测量值', color: '#667eea', dash: [], lineWidth: 2 })
      }
      
      // 始终显示WHO百分位线
      legendItems.push(
        { label: `P50(${genderText})`, color: '#66bb6a', dash: [], lineWidth: 2 },
        { label: 'P85/P15', color: '#42a5f5', dash: [5, 5], lineWidth: 1.5 },
        { label: 'P97/P3', color: '#ab47bc', dash: [2, 8], lineWidth: 1.5 }
      )
      
      const startY = 25
      const lineHeight = 16
      const legendWidth = 120
      const legendX = Math.max(width - legendWidth - 10, 10) // 确保不超出Canvas边界
      
      legendItems.forEach((item, index) => {
        const y = startY + index * lineHeight
        
        // 确保绘制位置在Canvas范围内
        if (y < 0 || y > height || legendX < 0 || legendX > width) {
          return
        }
        
        // 绘制线条
        ctx.strokeStyle = item.color
        ctx.lineWidth = item.lineWidth
        ctx.setLineDash(item.dash)
        ctx.beginPath()
        ctx.moveTo(legendX, y)
        ctx.lineTo(legendX + 20, y)
        ctx.stroke()
        
        // 绘制文字
        ctx.fillStyle = '#666'
        ctx.fillText(item.label, legendX + 25, y + 3)
      })
    } catch (error) {
      console.error('绘制图例时出错:', error)
    } finally {
      // 恢复绘制状态
      ctx.restore()
    }
  },

  // 获取标准值（模拟数据）
  // WHO成长曲线百分位数据（按月龄0-60个月）
  getWHOPercentiles() {
    return {
      // 男宝宝百分位数据
      male: {
        // 体重百分位数据（kg）- P3, P15, P50, P85, P97
        weight: {
          P3: [2.5, 3.4, 4.4, 5.1, 5.6, 6.0, 6.4, 6.7, 7.0, 7.2, 7.5, 7.7, 7.9, 8.1, 8.3, 8.5, 8.7, 8.9, 9.1, 9.2, 9.4, 9.6, 9.8, 10.0, 10.2, 10.4, 10.5, 10.7, 10.9, 11.1, 11.3, 11.5, 11.7, 11.9, 12.1, 12.3, 12.5, 12.7, 12.9, 13.1, 13.3, 13.5, 13.7, 13.9, 14.1, 14.3, 14.5, 14.7, 14.9, 15.1, 15.3, 15.5, 15.7, 15.9, 16.1, 16.3, 16.5, 16.7, 16.9, 17.1, 17.3],
          P15: [2.9, 3.9, 4.9, 5.7, 6.2, 6.7, 7.1, 7.4, 7.7, 8.0, 8.3, 8.5, 8.8, 9.0, 9.2, 9.4, 9.6, 9.8, 10.0, 10.2, 10.4, 10.6, 10.8, 11.0, 11.2, 11.4, 11.6, 11.8, 12.0, 12.2, 12.4, 12.6, 12.8, 13.0, 13.2, 13.4, 13.6, 13.8, 14.0, 14.2, 14.4, 14.6, 14.8, 15.0, 15.2, 15.4, 15.6, 15.8, 16.0, 16.2, 16.4, 16.6, 16.8, 17.0, 17.2, 17.4, 17.6, 17.8, 18.0, 18.2, 18.4],
          P50: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 9.9, 10.1, 10.3, 10.5, 10.7, 10.9, 11.1, 11.3, 11.5, 11.8, 12.0, 12.2, 12.4, 12.7, 12.9, 13.1, 13.4, 13.6, 13.8, 14.1, 14.3, 14.6, 14.8, 15.0, 15.3, 15.5, 15.8, 16.0, 16.3, 16.5, 16.8, 17.0, 17.3, 17.5, 17.8, 18.1, 18.3, 18.6, 18.9, 19.1, 19.4, 19.7, 19.9, 20.2, 20.5, 20.7, 21.0, 21.3],
          P85: [3.8, 5.1, 6.4, 7.3, 8.0, 8.6, 9.0, 9.4, 9.8, 10.2, 10.5, 10.8, 11.1, 11.4, 11.7, 12.0, 12.2, 12.5, 12.8, 13.0, 13.3, 13.6, 13.9, 14.1, 14.4, 14.7, 15.0, 15.3, 15.6, 15.9, 16.2, 16.5, 16.8, 17.1, 17.4, 17.7, 18.0, 18.3, 18.6, 18.9, 19.2, 19.5, 19.8, 20.1, 20.4, 20.7, 21.0, 21.3, 21.6, 21.9, 22.2, 22.5, 22.8, 23.1, 23.4, 23.7, 24.0, 24.3, 24.6, 24.9, 25.2],
          P97: [4.4, 5.8, 7.1, 8.0, 8.8, 9.4, 9.9, 10.4, 10.9, 11.3, 11.7, 12.0, 12.4, 12.8, 13.1, 13.5, 13.8, 14.2, 14.5, 14.9, 15.2, 15.6, 16.0, 16.3, 16.7, 17.1, 17.5, 17.8, 18.2, 18.6, 19.0, 19.4, 19.8, 20.2, 20.6, 21.0, 21.4, 21.8, 22.2, 22.6, 23.0, 23.4, 23.8, 24.2, 24.6, 25.0, 25.4, 25.8, 26.2, 26.6, 27.0, 27.4, 27.8, 28.2, 28.6, 29.0, 29.4, 29.8, 30.2, 30.6, 31.0]
        },
        // 身高百分位数据（cm）
        height: {
          P3: [46.1, 50.8, 54.4, 57.3, 59.7, 61.7, 63.3, 64.8, 66.2, 67.5, 68.7, 69.9, 71.0, 72.1, 73.1, 74.1, 75.0, 75.9, 76.8, 77.7, 78.6, 79.4, 80.2, 81.0, 81.7, 82.5, 83.2, 83.9, 84.6, 85.3, 85.9, 86.6, 87.2, 87.8, 88.4, 89.0, 89.6, 90.2, 90.7, 91.2, 91.8, 92.3, 92.8, 93.2, 93.7, 94.2, 94.6, 95.0, 95.4, 95.8, 96.2, 96.6, 97.0, 97.4, 97.7, 98.1, 98.4, 98.7, 99.0, 99.4, 99.7],
          P15: [47.8, 52.8, 56.2, 59.0, 61.2, 63.2, 64.8, 66.2, 67.6, 68.9, 70.1, 71.3, 72.4, 73.5, 74.5, 75.5, 76.4, 77.4, 78.3, 79.1, 80.0, 80.8, 81.6, 82.4, 83.1, 83.9, 84.6, 85.3, 86.0, 86.7, 87.4, 88.0, 88.6, 89.3, 89.9, 90.5, 91.1, 91.6, 92.2, 92.7, 93.3, 93.8, 94.3, 94.8, 95.3, 95.7, 96.2, 96.6, 97.1, 97.5, 97.9, 98.3, 98.7, 99.1, 99.5, 99.8, 100.2, 100.5, 100.9, 101.2, 101.5],
          P50: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7, 76.9, 78.0, 79.1, 80.2, 81.2, 82.3, 83.2, 84.2, 85.1, 86.0, 86.9, 87.8, 88.7, 89.6, 90.4, 91.2, 92.1, 92.9, 93.7, 94.4, 95.2, 95.9, 96.7, 97.4, 98.1, 98.8, 99.5, 100.2, 100.9, 101.6, 102.3, 102.9, 103.6, 104.2, 104.9, 105.6, 106.2, 106.9, 107.5, 108.1, 108.8, 109.4, 110.0, 110.7, 111.3, 111.9, 112.5, 113.1],
          P85: [52.0, 56.7, 60.4, 63.5, 66.0, 68.0, 69.8, 71.3, 72.8, 74.2, 75.6, 76.9, 78.1, 79.3, 80.5, 81.7, 82.8, 83.9, 85.0, 86.0, 87.0, 88.0, 89.0, 89.9, 90.8, 91.7, 92.6, 93.5, 94.4, 95.2, 96.1, 96.9, 97.7, 98.5, 99.3, 100.1, 100.8, 101.6, 102.3, 103.1, 103.8, 104.5, 105.2, 105.9, 106.6, 107.3, 107.9, 108.6, 109.2, 109.9, 110.5, 111.2, 111.8, 112.4, 113.0, 113.6, 114.2, 114.8, 115.4, 116.0, 116.6],
          P97: [54.1, 58.6, 62.4, 65.5, 68.0, 70.1, 71.9, 73.5, 75.0, 76.5, 77.9, 79.2, 80.5, 81.8, 83.0, 84.2, 85.4, 86.5, 87.7, 88.7, 89.8, 90.9, 91.9, 92.9, 93.9, 94.9, 95.9, 96.8, 97.8, 98.7, 99.6, 100.5, 101.4, 102.3, 103.1, 104.0, 104.8, 105.6, 106.4, 107.2, 108.0, 108.8, 109.5, 110.3, 111.0, 111.7, 112.5, 113.2, 113.9, 114.6, 115.2, 115.9, 116.6, 117.2, 117.9, 118.5, 119.2, 119.8, 120.4, 121.1, 121.7]
        },
        // 头围百分位数据（cm）
        head: {
          P3: [32.1, 35.1, 36.8, 38.1, 39.2, 40.1, 40.8, 41.5, 42.0, 42.6, 43.0, 43.5, 43.9, 44.2, 44.6, 44.9, 45.2, 45.5, 45.8, 46.0, 46.3, 46.5, 46.7, 46.9, 47.1, 47.3, 47.5, 47.7, 47.9, 48.0, 48.2, 48.4, 48.5, 48.7, 48.8, 49.0, 49.1, 49.3, 49.4, 49.5, 49.7, 49.8, 49.9, 50.0, 50.2, 50.3, 50.4, 50.5, 50.6, 50.7, 50.8, 50.9, 51.0, 51.1, 51.2, 51.3, 51.4, 51.5, 51.6, 51.7, 51.8],
          P15: [33.2, 36.0, 37.7, 39.0, 40.1, 41.0, 41.7, 42.4, 42.9, 43.5, 44.0, 44.4, 44.8, 45.2, 45.5, 45.8, 46.1, 46.4, 46.7, 47.0, 47.2, 47.4, 47.7, 47.9, 48.1, 48.3, 48.5, 48.7, 48.9, 49.0, 49.2, 49.4, 49.5, 49.7, 49.8, 50.0, 50.1, 50.3, 50.4, 50.5, 50.7, 50.8, 50.9, 51.0, 51.2, 51.3, 51.4, 51.5, 51.6, 51.7, 51.8, 51.9, 52.0, 52.1, 52.2, 52.3, 52.4, 52.5, 52.6, 52.7, 52.8],
          P50: [34.5, 37.3, 39.1, 40.5, 41.6, 42.6, 43.3, 44.0, 44.6, 45.2, 45.7, 46.1, 46.6, 47.0, 47.4, 47.7, 48.0, 48.4, 48.7, 49.0, 49.2, 49.5, 49.8, 50.0, 50.2, 50.4, 50.7, 50.9, 51.1, 51.3, 51.5, 51.7, 51.9, 52.0, 52.2, 52.4, 52.5, 52.7, 52.8, 53.0, 53.1, 53.3, 53.4, 53.5, 53.7, 53.8, 53.9, 54.0, 54.2, 54.3, 54.4, 54.5, 54.6, 54.7, 54.8, 54.9, 55.0, 55.1, 55.2, 55.3, 55.4],
          P85: [35.8, 38.6, 40.4, 41.9, 43.0, 44.0, 44.8, 45.5, 46.1, 46.7, 47.3, 47.8, 48.2, 48.7, 49.1, 49.4, 49.8, 50.1, 50.4, 50.7, 51.0, 51.3, 51.5, 51.8, 52.0, 52.3, 52.5, 52.7, 52.9, 53.1, 53.3, 53.5, 53.7, 53.9, 54.0, 54.2, 54.4, 54.5, 54.7, 54.8, 55.0, 55.1, 55.3, 55.4, 55.5, 55.7, 55.8, 55.9, 56.1, 56.2, 56.3, 56.4, 56.5, 56.6, 56.7, 56.8, 56.9, 57.0, 57.1, 57.2, 57.3],
          P97: [37.2, 40.0, 41.9, 43.4, 44.6, 45.5, 46.4, 47.1, 47.8, 48.4, 49.0, 49.5, 50.0, 50.4, 50.8, 51.2, 51.6, 51.9, 52.3, 52.6, 52.9, 53.2, 53.5, 53.7, 54.0, 54.2, 54.5, 54.7, 54.9, 55.2, 55.4, 55.6, 55.8, 56.0, 56.2, 56.4, 56.6, 56.7, 56.9, 57.1, 57.2, 57.4, 57.5, 57.7, 57.8, 58.0, 58.1, 58.2, 58.4, 58.5, 58.6, 58.7, 58.8, 58.9, 59.0, 59.1, 59.2, 59.3, 59.4, 59.5, 59.6]
        }
      },
      // 女宝宝百分位数据
      female: {
        // 体重百分位数据（kg）
        weight: {
          P3: [2.4, 3.2, 4.2, 4.8, 5.3, 5.7, 6.0, 6.3, 6.6, 6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2, 8.4, 8.5, 8.7, 8.9, 9.0, 9.2, 9.4, 9.5, 9.7, 9.9, 10.1, 10.2, 10.4, 10.6, 10.8, 10.9, 11.1, 11.3, 11.5, 11.6, 11.8, 12.0, 12.2, 12.4, 12.5, 12.7, 12.9, 13.1, 13.3, 13.5, 13.7, 13.9, 14.0, 14.2, 14.4, 14.6, 14.8, 15.0, 15.2, 15.4, 15.6, 15.8, 16.0, 16.2],
          P15: [2.8, 3.6, 4.7, 5.4, 5.9, 6.4, 6.7, 7.0, 7.3, 7.6, 7.8, 8.1, 8.3, 8.5, 8.7, 8.9, 9.1, 9.3, 9.5, 9.7, 9.9, 10.1, 10.3, 10.5, 10.7, 10.9, 11.1, 11.3, 11.5, 11.7, 11.9, 12.1, 12.3, 12.5, 12.7, 12.9, 13.1, 13.3, 13.5, 13.7, 13.9, 14.1, 14.3, 14.5, 14.7, 14.9, 15.1, 15.3, 15.5, 15.7, 15.9, 16.1, 16.3, 16.5, 16.7, 16.9, 17.1, 17.3, 17.5, 17.7, 17.9],
          P50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9, 9.2, 9.4, 9.6, 9.8, 10.0, 10.2, 10.4, 10.6, 10.9, 11.1, 11.3, 11.5, 11.7, 12.0, 12.2, 12.4, 12.7, 12.9, 13.1, 13.4, 13.6, 13.9, 14.1, 14.3, 14.6, 14.8, 15.1, 15.3, 15.6, 15.8, 16.1, 16.4, 16.6, 16.9, 17.2, 17.4, 17.7, 18.0, 18.3, 18.5, 18.8, 19.1, 19.4, 19.7, 19.9, 20.2, 20.5, 20.8],
          P85: [3.7, 4.8, 5.8, 6.6, 7.3, 7.8, 8.3, 8.7, 9.0, 9.4, 9.7, 10.0, 10.3, 10.6, 10.9, 11.1, 11.4, 11.7, 11.9, 12.2, 12.5, 12.8, 13.0, 13.3, 13.6, 13.9, 14.2, 14.5, 14.8, 15.1, 15.4, 15.7, 16.0, 16.3, 16.6, 16.9, 17.2, 17.5, 17.8, 18.1, 18.4, 18.7, 19.0, 19.3, 19.6, 19.9, 20.2, 20.5, 20.8, 21.1, 21.4, 21.7, 22.0, 22.3, 22.6, 22.9, 23.2, 23.5, 23.8, 24.1, 24.4],
          P97: [4.2, 5.5, 6.6, 7.5, 8.2, 8.8, 9.3, 9.8, 10.2, 10.6, 11.0, 11.3, 11.7, 12.0, 12.4, 12.7, 13.0, 13.4, 13.7, 14.0, 14.4, 14.7, 15.0, 15.4, 15.7, 16.1, 16.4, 16.8, 17.1, 17.5, 17.9, 18.2, 18.6, 19.0, 19.4, 19.7, 20.1, 20.5, 20.9, 21.3, 21.7, 22.1, 22.5, 22.9, 23.3, 23.7, 24.1, 24.5, 24.9, 25.3, 25.7, 26.1, 26.5, 26.9, 27.3, 27.7, 28.1, 28.5, 28.9, 29.3, 29.7]
        },
        // 身高百分位数据（cm）
        height: {
          P3: [45.4, 50.0, 53.5, 56.2, 58.4, 60.3, 61.8, 63.2, 64.5, 65.7, 66.8, 67.9, 68.9, 69.8, 70.8, 71.6, 72.5, 73.4, 74.2, 75.0, 75.8, 76.6, 77.3, 78.0, 78.7, 79.4, 80.1, 80.7, 81.4, 82.0, 82.6, 83.2, 83.8, 84.4, 84.9, 85.5, 86.0, 86.6, 87.1, 87.6, 88.1, 88.6, 89.1, 89.5, 90.0, 90.4, 90.8, 91.2, 91.6, 92.0, 92.4, 92.8, 93.1, 93.5, 93.8, 94.2, 94.5, 94.8, 95.1, 95.4, 95.7],
          P15: [47.1, 51.7, 55.0, 57.6, 59.8, 61.7, 63.2, 64.6, 65.9, 67.1, 68.3, 69.4, 70.4, 71.4, 72.4, 73.3, 74.2, 75.1, 75.9, 76.8, 77.6, 78.4, 79.1, 79.9, 80.6, 81.3, 82.0, 82.7, 83.3, 84.0, 84.6, 85.2, 85.8, 86.4, 87.0, 87.6, 88.1, 88.7, 89.2, 89.7, 90.3, 90.8, 91.3, 91.7, 92.2, 92.7, 93.1, 93.6, 94.0, 94.4, 94.8, 95.2, 95.6, 96.0, 96.4, 96.7, 97.1, 97.4, 97.8, 98.1, 98.4],
          P50: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.5, 72.8, 74.0, 75.2, 76.4, 77.5, 78.6, 79.7, 80.7, 81.7, 82.7, 83.7, 84.6, 85.5, 86.4, 87.3, 88.1, 89.0, 89.8, 90.7, 91.5, 92.2, 93.0, 93.8, 94.5, 95.3, 96.0, 96.7, 97.4, 98.1, 98.8, 99.4, 100.1, 100.7, 101.4, 102.0, 102.7, 103.3, 103.9, 104.5, 105.1, 105.7, 106.3, 106.9, 107.4, 108.0, 108.6, 109.1, 109.7, 110.2, 110.8],
          P85: [51.1, 55.6, 59.1, 61.9, 64.3, 66.3, 68.0, 69.6, 71.1, 72.6, 74.0, 75.3, 76.6, 77.9, 79.1, 80.2, 81.4, 82.5, 83.6, 84.6, 85.7, 86.7, 87.7, 88.6, 89.6, 90.5, 91.4, 92.3, 93.2, 94.0, 94.9, 95.7, 96.5, 97.3, 98.1, 98.9, 99.6, 100.4, 101.1, 101.8, 102.5, 103.2, 103.9, 104.5, 105.2, 105.8, 106.5, 107.1, 107.7, 108.3, 108.9, 109.5, 110.1, 110.6, 111.2, 111.8, 112.3, 112.9, 113.4, 113.9, 114.4],
          P97: [53.1, 57.6, 61.1, 64.0, 66.4, 68.5, 70.3, 71.9, 73.5, 75.0, 76.4, 77.8, 79.2, 80.5, 81.7, 83.0, 84.2, 85.4, 86.5, 87.6, 88.7, 89.8, 90.8, 91.9, 92.9, 93.9, 94.9, 95.9, 96.8, 97.7, 98.6, 99.5, 100.4, 101.3, 102.1, 103.0, 103.8, 104.6, 105.4, 106.2, 106.9, 107.7, 108.4, 109.1, 109.8, 110.5, 111.2, 111.9, 112.5, 113.2, 113.8, 114.4, 115.1, 115.7, 116.3, 116.9, 117.5, 118.0, 118.6, 119.2, 119.7]
        },
        // 头围百分位数据（cm）
        head: {
          P3: [31.5, 34.2, 35.8, 37.0, 38.0, 38.8, 39.5, 40.1, 40.6, 41.1, 41.5, 41.9, 42.2, 42.6, 42.9, 43.2, 43.4, 43.7, 43.9, 44.2, 44.4, 44.6, 44.8, 45.0, 45.2, 45.4, 45.6, 45.7, 45.9, 46.1, 46.2, 46.4, 46.5, 46.7, 46.8, 47.0, 47.1, 47.2, 47.4, 47.5, 47.6, 47.7, 47.9, 48.0, 48.1, 48.2, 48.3, 48.4, 48.5, 48.6, 48.7, 48.8, 48.9, 49.0, 49.1, 49.2, 49.3, 49.4, 49.5, 49.6, 49.7],
          P15: [32.7, 35.3, 36.9, 38.1, 39.1, 39.9, 40.6, 41.2, 41.7, 42.2, 42.6, 43.0, 43.4, 43.7, 44.0, 44.3, 44.6, 44.8, 45.1, 45.3, 45.5, 45.8, 46.0, 46.2, 46.4, 46.6, 46.7, 46.9, 47.1, 47.2, 47.4, 47.5, 47.7, 47.8, 48.0, 48.1, 48.2, 48.4, 48.5, 48.6, 48.7, 48.9, 49.0, 49.1, 49.2, 49.3, 49.4, 49.5, 49.6, 49.7, 49.8, 49.9, 50.0, 50.1, 50.2, 50.3, 50.4, 50.5, 50.6, 50.7, 50.8],
          P50: [33.9, 36.5, 38.3, 39.5, 40.7, 41.5, 42.2, 42.8, 43.4, 43.9, 44.4, 44.8, 45.2, 45.6, 45.9, 46.2, 46.5, 46.8, 47.1, 47.4, 47.6, 47.8, 48.1, 48.3, 48.5, 48.7, 48.9, 49.1, 49.3, 49.5, 49.7, 49.8, 50.0, 50.2, 50.3, 50.5, 50.6, 50.8, 50.9, 51.0, 51.2, 51.3, 51.4, 51.6, 51.7, 51.8, 51.9, 52.0, 52.1, 52.2, 52.3, 52.4, 52.5, 52.6, 52.7, 52.8, 52.9, 53.0, 53.0, 53.1, 53.2],
          P85: [35.1, 37.7, 39.6, 40.9, 42.1, 43.0, 43.7, 44.4, 45.0, 45.5, 46.0, 46.5, 46.9, 47.3, 47.6, 48.0, 48.3, 48.6, 48.9, 49.2, 49.4, 49.7, 49.9, 50.2, 50.4, 50.6, 50.8, 51.0, 51.2, 51.4, 51.6, 51.8, 51.9, 52.1, 52.3, 52.4, 52.6, 52.7, 52.9, 53.0, 53.2, 53.3, 53.4, 53.6, 53.7, 53.8, 53.9, 54.1, 54.2, 54.3, 54.4, 54.5, 54.6, 54.7, 54.8, 54.9, 55.0, 55.1, 55.2, 55.3, 55.4],
          P97: [36.3, 39.0, 40.9, 42.3, 43.5, 44.5, 45.3, 46.0, 46.6, 47.2, 47.7, 48.2, 48.7, 49.1, 49.5, 49.8, 50.2, 50.5, 50.8, 51.1, 51.4, 51.7, 51.9, 52.2, 52.4, 52.7, 52.9, 53.1, 53.3, 53.5, 53.7, 53.9, 54.1, 54.3, 54.4, 54.6, 54.8, 54.9, 55.1, 55.2, 55.4, 55.5, 55.7, 55.8, 55.9, 56.1, 56.2, 56.3, 56.5, 56.6, 56.7, 56.8, 56.9, 57.0, 57.1, 57.2, 57.3, 57.4, 57.5, 57.6, 57.7]
        }
      }
    }
  },

  // 根据宝宝年龄和性别获取WHO百分位值
  getWHOPercentileValue(type, ageInMonths, percentile = 'P50', gender = null) {
    // 如果没有传入性别，使用当前宝宝的性别
    if (!gender) {
      gender = this.normalizeGender((this.data.babyInfo && this.data.babyInfo.gender) || 'default')
    }
    
    // 如果性别不是male或female，使用默认值
    if (gender !== 'boy' && gender !== 'girl') {
      gender = 'boy' // 默认使用男宝标准
    }
    
    // 转换性别格式
    const whoGender = gender === 'boy' ? 'male' : 'female'
    
    const percentiles = this.getWHOPercentiles()
    const genderPercentiles = percentiles[whoGender]
    
    if (!genderPercentiles || !genderPercentiles[type] || !genderPercentiles[type][percentile]) {
      console.warn(`未找到${whoGender}的${type} ${percentile}百分位数据`)
      return 0
    }
    
    // 限制月龄范围在0-60个月之间
    const monthIndex = Math.max(0, Math.min(60, Math.floor(ageInMonths)))
    
    return genderPercentiles[type][percentile][monthIndex] || genderPercentiles[type][percentile][0]
  },

  // 兼容旧方法，返回P50百分位值（中位数）
  getStandardValue(type, ageInMonths, gender = null) {
    return this.getWHOPercentileValue(type, ageInMonths, 'P50', gender)
  },

  // 计算宝宝在同龄群体中的百分位位置
  calculatePercentilePosition(actualValue, type, ageInMonths, gender = null) {
    if (!actualValue || actualValue <= 0) {
      return null
    }

    // 获取各个百分位的值
    const percentiles = ['P3', 'P15', 'P50', 'P85', 'P97']
    const values = percentiles.map(p => this.getWHOPercentileValue(type, ageInMonths, p, gender))
    
    // 判断实际值在哪个区间
    if (actualValue <= values[0]) {
      return { percentile: '<P3', description: '低于第3百分位', level: 'low' }
    } else if (actualValue <= values[1]) {
      return { percentile: 'P3-P15', description: '第3-15百分位', level: 'below-average' }
    } else if (actualValue <= values[2]) {
      return { percentile: 'P15-P50', description: '第15-50百分位', level: 'average' }
    } else if (actualValue <= values[3]) {
      return { percentile: 'P50-P85', description: '第50-85百分位', level: 'average' }
    } else if (actualValue <= values[4]) {
      return { percentile: 'P85-P97', description: '第85-97百分位', level: 'above-average' }
    } else {
      return { percentile: '>P97', description: '高于第97百分位', level: 'high' }
    }
  },

  // 计算宝宝当前月龄
  calculateAgeInMonths(birthday) {
    if (!birthday) {
      return 0
    }
    
    try {
      const birthDate = new Date(birthday)
      const now = new Date()
      
      let months = (now.getFullYear() - birthDate.getFullYear()) * 12
      months += now.getMonth() - birthDate.getMonth()
      
      // 如果当前日期小于出生日期，减去一个月
      if (now.getDate() < birthDate.getDate()) {
        months--
      }
      
      return Math.max(0, months)
    } catch (error) {
      console.error('计算月龄失败:', error)
      return 0
    }
  },

  // 日期格式化
  formatDate(dateStr) {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  formatDateShort(dateStr) {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  formatDateForChart(dateStr) {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  // 刷新数据
  async refreshData() {
    console.log('🔄 monitor页面开始刷新数据')
    try {
      await this.loadData()
      console.log('🔄 数据加载完成，准备重绘图表')
      // 确保数据更新到页面状态后再重绘图表
      this.drawChart()
    } catch (error) {
      console.error('🔄 数据刷新失败:', error)
    }
  },

  // 更新图表
  updateChart() {
    console.log('📊 触发图表更新')
    // 延迟一下确保数据已经设置到页面状态
    setTimeout(() => {
      this.drawChart()
    }, 50)
  },

  // 时间范围切换
  async onTimeChange(e) {
    const period = e.currentTarget.dataset.period
    
    const timeOptions = this.data.timeOptions.map(item => ({
      ...item,
      active: item.key === period
    }))
    
    this.setData({ timeOptions })
    
    // 重新加载和过滤数据
    await this.loadData()
    this.updateChart()
  },

  // 图表类型切换
  onChartTypeChange(e) {
    const type = e.currentTarget.dataset.type
    
    const chartTypes = this.data.chartTypes.map(item => ({
      ...item,
      active: item.key === type
    }))
    
    this.setData({ 
      chartTypes,
      currentChart: this.getTypeName(type)
    })
    this.updateChart()
  },

  // 获取类型中文名
  getTypeName(type) {
    const typeMap = {
      weight: '体重',
      height: '身高', 
      head: '头围'
    }
    return typeMap[type] || type
  },

  // 获取当前指标的标签
  getCurrentMetricLabel(type) {
    return this.getTypeName(type)
  },

  // 获取当前指标的值
  getCurrentMetricValue(type) {
    console.log('📊 getCurrentMetricValue 被调用，type:', type)
    console.log('📊 当前 metrics 数据:', this.data.metrics)
    
    if (!this.data.metrics || this.data.metrics.length === 0) {
      console.log('📊 指标数据为空')
      return '--'
    }
    
    const metric = this.data.metrics.find(m => {
      if (type === 'weight') return m.label === '体重'
      if (type === 'height') return m.label === '身高'
      if (type === 'head') return m.label === '头围'
      return false
    })
    
    console.log('📊 找到的指标:', metric)
    const value = metric ? metric.value : '--'
    console.log(`📊 获取${type}指标值:`, value)
    return value
  },

  // 获取当前指标的单位
  getCurrentMetricUnit(type) {
    const metric = this.data.metrics.find(m => {
      if (type === 'weight') return m.label === '体重'
      if (type === 'height') return m.label === '身高'
      if (type === 'head') return m.label === '头围'
      return false
    })
    return metric ? metric.unit : ''
  },



  // 获取指定指标的值（用于小卡片显示）
  getMetricValue(type) {
    const metrics = this.data.metrics || []
    let metric = null
    
    // 根据类型查找对应的指标
    if (type === 'weight') {
      metric = metrics.find(m => m.label === '体重')
    } else if (type === 'height') {
      metric = metrics.find(m => m.label === '身高')
    } else if (type === 'head') {
      metric = metrics.find(m => m.label === '头围')
    }
    
    if (metric && metric.value !== '--') {
      const unit = this.getCurrentMetricUnit(type)
      return `${metric.value}${unit}`
    }
    return '--'
  },

  // 更新当前指标显示数据
  updateCurrentMetricDisplay() {
    const type = this.data.activeChartType
    console.log('📊 更新当前指标显示，类型:', type)
    
    this.setData({
      currentMetricLabel: this.getCurrentMetricLabel(type),
      currentMetricValue: this.getCurrentMetricValue(type),
      currentMetricUnit: this.getCurrentMetricUnit(type)
    })
    
    console.log('📊 当前指标显示数据已更新:', {
      label: this.data.currentMetricLabel,
      value: this.data.currentMetricValue,
      unit: this.data.currentMetricUnit
    })
  },

  // 强制从云端刷新数据
  async forceRefreshFromCloud(showToast = true) {
    try {
      if (showToast) {
        wx.showLoading({
          title: '刷新中...',
          mask: true
        })
      }
      
      // 清除本地缓存
      wx.removeStorageSync('measureRecords')
      
      // 重新从云端加载
      await this.loadData()
      
      if (showToast) {
        wx.hideLoading()
        wx.showToast({
          title: '刷新成功',
          icon: 'success'
        })
      }
    } catch (error) {
      if (showToast) {
        wx.hideLoading()
        wx.showToast({
          title: '刷新失败',
          icon: 'none'
        })
      }
      console.error('强制刷新失败:', error)
      throw error
    }
  },

  // 下拉刷新处理
  async onPullDownRefresh() {
    console.log('📊 下拉刷新')
    try {
      await this.loadData()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('下拉刷新失败:', error)
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 检查openid状态
  checkOpenIdStatus() {
    const app = getApp()
    console.log('🔍 检查openid状态:', {
      openid: app.globalData.openid,
      hasOpenid: !!app.globalData.openid
    })
    
    if (!app.globalData.openid) {
      console.log('⚠️ openid未获取，尝试重新获取')
      // 如果没有openid，尝试重新获取
      app.getOpenId().then(() => {
        console.log('✅ openid重新获取成功，刷新数据')
        this.refreshData()
      }).catch(error => {
        console.error('❌ openid获取失败:', error)
      })
    }
  },

  // 调试：显示当前数据状态
  debugCurrentState() {
    const state = {
      metrics: this.data.metrics,
      activeChartType: this.data.activeChartType,
      currentMetricLabel: this.data.currentMetricLabel,
      currentMetricValue: this.data.currentMetricValue,
      currentMetricUnit: this.data.currentMetricUnit,
      lastUpdateText: this.data.lastUpdateText,
      recentRecords: this.data.recentRecords
    }
    
    console.log('🐛 当前页面完整状态:', state)
    
    wx.showModal({
      title: '调试信息',
      content: `指标值: ${this.data.currentMetricValue}\n标签: ${this.data.currentMetricLabel}\n单位: ${this.data.currentMetricUnit}`,
      showCancel: false
    })
  },

  // 测试：验证指标数据显示
  testMetricDisplay() {
    console.log('🧪 测试指标数据显示')
    console.log('🧪 当前metrics数据:', this.data.metrics)
    
    const weightValue = this.getMetricValue('weight')
    const heightValue = this.getMetricValue('height')
    const headValue = this.getMetricValue('head')
    
    console.log('🧪 获取到的指标值:', {
      weight: weightValue,
      height: heightValue,
      head: headValue
    })
    
    wx.showModal({
      title: '指标数据测试',
      content: `体重: ${weightValue}\n身高: ${heightValue}\n头围: ${headValue}`,
      showCancel: false
    })
  },

  // 测试：设置性别并验证主题切换
  testGenderTheme() {
    const testGenders = ['male', 'female', 'default']
    let currentIndex = 0
    
    const switchGender = () => {
      const gender = testGenders[currentIndex]
      
      // 模拟保存到本地存储
      const babyInfo = wx.getStorageSync('babyInfo') || {}
      babyInfo.gender = gender
      wx.setStorageSync('babyInfo', babyInfo)
      
      console.log('🧪 测试设置性别:', gender)
      
      // 触发主题更新
      this.updateGenderTheme()
      
      currentIndex = (currentIndex + 1) % testGenders.length
      
      if (currentIndex > 0) {
        setTimeout(switchGender, 3000) // 3秒后切换下一个
      }
    }
    
    switchGender()
  },

  // 自动更新性别主题
  updateGenderTheme() {
    try {
      // 从本地存储获取宝宝信息
      const babyInfo = wx.getStorageSync('babyInfo') || {}
      const rawGender = babyInfo.gender || 'default'
      const normalizedGender = this.normalizeGender(rawGender)
      
      console.log('🎨 检查性别主题:', {
        当前主题: this.data.currentGender,
        原始性别: rawGender,
        标准化性别: normalizedGender,
        宝宝信息: babyInfo
      })
      
      // 如果性别发生变化，更新主题
      if (this.data.currentGender !== normalizedGender) {
        console.log('🎨 性别主题发生变化，更新主题:', normalizedGender)
        
        this.setData({
          currentGender: normalizedGender
        })
        
        // 显示主题切换提示
        const themeNames = {
          'girl': '女宝宝',
          'boy': '男宝宝', 
          'default': '默认'
        }
        
        if (normalizedGender !== 'default') {
          wx.showToast({
            title: `已应用${themeNames[normalizedGender]}主题`,
            icon: 'none',
            duration: 2000
          })
        }
      }
    } catch (error) {
      console.error('🎨 更新性别主题失败:', error)
    }
  },

  // 测试百分位数系统
  // 调试图表数据状态
  debugChartData() {
    console.log('🔍 === 图表数据调试信息 ===')
    console.log('🔍 当前图表类型:', this.data.activeChartType)
    console.log('🔍 完整图表数据:', this.data.chartData)
    
    const currentData = this.data.chartData[this.data.activeChartType]
    if (currentData) {
      console.log('🔍 当前图表数据详情:', {
        labels: currentData.labels,
        values: currentData.values,
        percentiles: currentData.percentiles,
              valuesCount: (currentData.values && currentData.values.length) || 0,
      labelsCount: (currentData.labels && currentData.labels.length) || 0
      })
      
      // 检查百分位数据
      Object.keys(currentData.percentiles || {}).forEach(percentile => {
        const data = currentData.percentiles[percentile]
        console.log(`🔍 ${percentile}百分位数据:`, {
                  length: (data && data.length) || 0,
        values: (data && data.slice(0, 3)) || [], // 只显示前3个值
          hasData: data && data.length > 0
        })
      })
    } else {
      console.log('🔍 ❌ 当前图表数据为空')
    }
    
    console.log('🔍 宝宝信息:', this.data.babyInfo)
    console.log('🔍 === 调试信息结束 ===')
    
    // 显示调试信息
    wx.showModal({
      title: '图表调试信息',
      content: `图表类型: ${this.data.activeChartType}\n数据点数: ${(currentData && currentData.values && currentData.values.length) || 0}\n百分位线数: ${Object.keys((currentData && currentData.percentiles) || {}).length}`,
      showCancel: false
    })
  },

  testPercentileSystem() {
    console.log('🧪 开始测试百分位数系统')
    
    // 测试数据：6个月男宝，体重8kg
    const testAge = 6 // 6个月
    const testWeight = 8.0 // 8kg
    const testGender = 'boy'
    
    // 获取各个百分位值
    const percentiles = ['P3', 'P15', 'P50', 'P85', 'P97']
    const values = percentiles.map(p => {
      const value = this.getWHOPercentileValue('weight', testAge, p, testGender)
      console.log(`🧪 ${testAge}个月男宝体重${p}: ${value}kg`)
      return value
    })
    
    // 计算百分位位置
    const position = this.calculatePercentilePosition(testWeight, 'weight', testAge, testGender)
    console.log(`🧪 ${testWeight}kg在${testAge}个月男宝中的位置:`, position)
    
    // 测试女宝数据
    const femaleP50 = this.getWHOPercentileValue('weight', testAge, 'P50', 'girl')
    console.log(`🧪 ${testAge}个月女宝体重P50: ${femaleP50}kg`)
    
    console.log('🧪 百分位数系统测试完成')
    
    wx.showToast({
      title: '百分位测试完成，请查看控制台',
      icon: 'success'
    })
  },

  // 图表触摸事件处理
  onChartTouchStart(e) {
    console.log('📊 图表触摸开始')
    this.handleChartTouch(e)
  },

  onChartTouchMove(e) {
    console.log('📊 图表触摸移动')
    this.handleChartTouch(e)
  },

  onChartTouchEnd(e) {
    console.log('📊 图表触摸结束')
    // 延迟隐藏提示框，给用户一点时间查看
    setTimeout(() => {
      this.setData({
        showTooltip: false
      })
    }, 1000)
  },

  // 处理图表触摸事件
  handleChartTouch(e) {
    if (!this.ctx || !this.canvasWidth || !this.canvasHeight) {
      console.log('📊 Canvas未初始化，跳过触摸处理')
      return
    }

    const touch = e.touches[0]
    if (!touch) return

    // 获取Canvas元素的位置信息
    wx.createSelectorQuery()
      .select('#growthChart')
      .boundingClientRect((rect) => {
        if (!rect) return

        // 计算相对于Canvas的坐标
        const canvasX = touch.clientX - rect.left
        const canvasY = touch.clientY - rect.top

        console.log('📊 触摸坐标:', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          rectLeft: rect.left,
          rectTop: rect.top,
          canvasX: canvasX,
          canvasY: canvasY
        })

        // 计算图表坐标
        this.calculateChartCoordinates(canvasX, canvasY, touch.clientX, touch.clientY)
      })
      .exec()
  },

  // 计算图表坐标并显示提示框
  calculateChartCoordinates(canvasX, canvasY, screenX, screenY) {
    const padding = 40
    const chartWidth = this.canvasWidth - 2 * padding
    const chartHeight = this.canvasHeight - 2 * padding

    // 检查是否在图表区域内
    if (canvasX < padding || canvasX > this.canvasWidth - padding ||
        canvasY < padding || canvasY > this.canvasHeight - padding) {
      this.setData({ showTooltip: false })
      return
    }

    // 获取当前图表数据
    const currentData = this.data.chartData[this.data.activeChartType]
    if (!currentData || !currentData.values || currentData.values.length === 0) {
      return
    }

    // 计算X轴位置对应的数据点索引
    const relativeX = canvasX - padding
    const dataIndex = Math.round((relativeX / chartWidth) * (currentData.values.length - 1))
    const clampedIndex = Math.max(0, Math.min(dataIndex, currentData.values.length - 1))

    console.log('📊 计算数据索引:', {
      relativeX: relativeX,
      chartWidth: chartWidth,
      dataIndex: dataIndex,
      clampedIndex: clampedIndex,
      totalPoints: currentData.values.length
    })

    // 获取对应的时间和数值
    const timeLabel = currentData.labels[clampedIndex] || ''
    const actualValue = currentData.values[clampedIndex]

    // 计算Y轴对应的数值
    const allValues = []
    const validValues = currentData.values.filter(v => v !== null && v !== undefined)
    allValues.push(...validValues)
    Object.values(currentData.percentiles).forEach(percentileData => {
      allValues.push(...percentileData)
    })

    if (allValues.length === 0) return

    const minValue = Math.min(...allValues) * 0.9
    const maxValue = Math.max(...allValues) * 1.1
    const relativeY = canvasY - padding
    const yValue = maxValue - (relativeY / chartHeight) * (maxValue - minValue)

    // 获取单位
    const unit = this.getCurrentMetricUnit(this.data.activeChartType)

    // 构建提示内容数组
    const tooltipValues = []

    // 添加实际测量值
    if (actualValue !== null && actualValue !== undefined) {
      tooltipValues.push(`实际值: ${actualValue}${unit}`)
    }

    // 添加WHO百分位信息
    const percentileKeys = ['P3', 'P15', 'P50', 'P85', 'P97']
    const percentileLabels = {
      'P3': 'P3 (3%)',
      'P15': 'P15 (15%)',
      'P50': 'P50 (50%)',
      'P85': 'P85 (85%)',
      'P97': 'P97 (97%)'
    }

    percentileKeys.forEach(key => {
              const value = currentData.percentiles[key] && currentData.percentiles[key][clampedIndex]
      if (value !== undefined) {
        tooltipValues.push(`WHO ${percentileLabels[key]}: ${value.toFixed(1)}${unit}`)
      }
    })

    // 如果没有实际值，显示光标位置对应的坐标值
    if (actualValue === null || actualValue === undefined) {
      tooltipValues.unshift(`坐标值: ${yValue.toFixed(1)}${unit}`)
    }

    // 添加年龄信息
    if (this.data.babyInfo && this.data.babyInfo.birthday && timeLabel) {
      const ageInfo = this.calculateAgeFromTimeLabel(timeLabel)
      if (ageInfo) {
        tooltipValues.unshift(`年龄: ${ageInfo}`)
      }
    }

    console.log('📊 提示框信息:', {
      timeLabel: timeLabel,
      actualValue: actualValue,
      yValue: yValue,
      tooltipValues: tooltipValues
    })

    // 更新提示框位置和内容
    this.setData({
      showTooltip: true,
      tooltipX: screenX,
      tooltipY: screenY,
      tooltipTime: timeLabel,
      tooltipValues: tooltipValues
    })
  },

  // 获取当前指标的单位
  getCurrentMetricUnit(type) {
    const unitMap = {
      weight: 'kg',
      height: 'cm',
      head: 'cm'
    }
    return unitMap[type] || ''
  },

  // 从时间标签计算年龄信息
  calculateAgeFromTimeLabel(timeLabel) {
    if (!this.data.babyInfo || !this.data.babyInfo.birthday) return null

    try {
      // 解析时间标签，可能是 "2024-01" 或 "1月" 格式
      let targetDate = null
      
      if (timeLabel.includes('-')) {
        // "2024-01" 格式
        targetDate = new Date(timeLabel + '-01')
      } else if (timeLabel.includes('月')) {
        // "1月" 格式，需要结合生日年份
        const monthMatch = timeLabel.match(/(\d+)月/)
        if (monthMatch) {
          const month = parseInt(monthMatch[1])
          const birthYear = new Date(this.data.babyInfo.birthday).getFullYear()
          targetDate = new Date(birthYear, month - 1, 1)
        }
      }

      if (!targetDate) return null

      const birthDate = new Date(this.data.babyInfo.birthday)
      const ageInMonths = this.calculateAgeInMonths(this.data.babyInfo.birthday, targetDate)
      
      if (ageInMonths < 12) {
        return `${ageInMonths}个月`
      } else {
        const years = Math.floor(ageInMonths / 12)
        const months = ageInMonths % 12
        if (months === 0) {
          return `${years}岁`
        } else {
          return `${years}岁${months}个月`
        }
      }
    } catch (error) {
      console.log('📊 年龄计算错误:', error)
      return null
    }
  },

  // 计算两个日期之间的月份差
  calculateAgeInMonths(birthDate, targetDate = new Date()) {
    const birth = new Date(birthDate)
    const target = new Date(targetDate)
    
    let months = (target.getFullYear() - birth.getFullYear()) * 12
    months += target.getMonth() - birth.getMonth()
    
    // 如果目标日期的日数小于生日的日数，减去一个月
    if (target.getDate() < birth.getDate()) {
      months--
    }
    
    return Math.max(0, months)
  },

  // 测试：WHO性别自动切换
  testWHOGenderSwitch() {
    console.log('🧪 测试WHO成长曲线性别自动切换')
    
    // 模拟不同性别的宝宝信息
    const testGenders = [
      { gender: 'male', expected: '男宝' },
      { gender: 'female', expected: '女宝' },
      { gender: 'boy', expected: '男宝' },
      { gender: 'girl', expected: '女宝' },
      { gender: null, expected: '未设置' },
      { gender: 'unknown', expected: '未设置' }
    ]
    
    const originalBabyInfo = this.data.babyInfo
    
    testGenders.forEach(test => {
      // 临时设置宝宝性别
      this.setData({
        babyInfo: { ...originalBabyInfo, gender: test.gender }
      })
      
      // 测试性别文本获取
      const genderText = this.getGenderText(test.gender)
      const normalizedGender = this.normalizeGender(test.gender)
      
      console.log(`🧪 性别: ${test.gender} -> 显示: ${genderText} (期望: ${test.expected}) -> 标准化: ${normalizedGender}`)
      
      // 测试WHO数据获取
      const weightP50 = this.getWHOPercentileValue('weight', 6, 'P50', normalizedGender)
      console.log(`  6个月体重P50: ${weightP50}kg`)
      
      // 验证结果
      if (genderText === test.expected) {
        console.log('  ✅ 性别文本正确')
      } else {
        console.log('  ❌ 性别文本错误')
      }
    })
    
    // 恢复原始宝宝信息
    this.setData({
      babyInfo: originalBabyInfo
    })
    
    // 重新绘制图表以验证图例显示
    this.drawChart()
    
    wx.showModal({
      title: 'WHO性别切换测试',
      content: '测试完成，请查看控制台输出和图表图例',
      showCancel: false
    })
  },

  // 测试：图表坐标提示功能
  testChartTooltip() {
    console.log('📍 开始测试图表坐标提示功能')
    
    // 模拟触摸事件
    const mockTouch = {
      clientX: 200,
      clientY: 300
    }
    
    // 显示测试提示框
    this.setData({
      showTooltip: true,
      tooltipX: mockTouch.clientX,
      tooltipY: mockTouch.clientY,
      tooltipTime: '6个月',
      tooltipValues: [
        '年龄: 6个月',
        '实际值: 8.0kg',
        'WHO P3 (3%): 6.2kg',
        'WHO P15 (15%): 7.0kg',
        'WHO P50 (50%): 7.9kg',
        'WHO P85 (85%): 8.9kg',
        'WHO P97 (97%): 10.0kg'
      ]
    })
    
    console.log('📍 测试提示框已显示，位置:', mockTouch)
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.setData({
        showTooltip: false
      })
      console.log('📍 测试提示框已隐藏')
    }, 3000)
    
    wx.showToast({
      title: '坐标提示测试中，请查看图表',
      icon: 'success',
      duration: 2000
    })
  },

  // 调试数据和图表状态
  async debugDataAndChart() {
    console.log('🔍 开始调试数据和图表状态')
    
    try {
      // 1. 检查云端数据
      if (app.globalData.openid) {
        const db = wx.cloud.database()
        const cloudResult = await db.collection('b-measure')
          .where({})
          .get()
        
        console.log('🔍 云端所有数据:', cloudResult.data)
        console.log('🔍 云端数据数量:', cloudResult.data.length)
        
        // 检查当前用户的数据 - 尝试不同的openid字段
        let userResult = await db.collection('b-measure')
          .where({
            _openid: app.globalData.openid
          })
          .get()
        
        console.log('🔍 使用_openid查询用户数据结果:', userResult.data.length)
        
        // 如果_openid查询无结果，尝试openid
        if (userResult.data.length === 0) {
          userResult = await db.collection('b-measure')
            .where({
              openid: app.globalData.openid
            })
            .get()
          console.log('🔍 使用openid查询用户数据结果:', userResult.data.length)
        }
        
        console.log('🔍 当前用户云端数据:', userResult.data)
        console.log('🔍 当前用户数据数量:', userResult.data.length)
        
        if (userResult.data.length > 0) {
          console.log('🔍 第一条用户数据详情:', JSON.stringify(userResult.data[0], null, 2))
        }
      }
      
      // 2. 检查本地数据
      const localData = wx.getStorageSync('measureRecords') || []
      console.log('🔍 本地数据:', localData)
      console.log('🔍 本地数据数量:', localData.length)
      
      // 3. 检查当前页面状态
      console.log('🔍 当前页面数据状态:')
      console.log('  - babyInfo:', this.data.babyInfo)
      console.log('  - chartData:', this.data.chartData)
      console.log('  - activeChartType:', this.data.activeChartType)
      console.log('  - recentRecords:', this.data.recentRecords)
      console.log('  - metrics:', this.data.metrics)
      
      // 4. 检查图表Canvas状态
      console.log('🔍 图表Canvas状态:')
      console.log('  - canvas:', !!this.canvas)
      console.log('  - ctx:', !!this.ctx)
      console.log('  - canvasWidth:', this.canvasWidth)
      console.log('  - canvasHeight:', this.canvasHeight)
      
      // 5. 重新加载数据并绘制图表
      console.log('🔍 重新加载数据...')
      await this.loadData()
      
      // 6. 强制重新初始化图表
      console.log('🔍 重新初始化图表...')
      setTimeout(() => {
        this.initChart()
      }, 500)
      
      wx.showModal({
        title: '调试信息',
        content: `云端数据: ${app.globalData.openid ? '已连接' : '未连接'}\n本地数据: ${localData.length}条\n图表状态: ${this.ctx ? '正常' : '异常'}`,
        showCancel: false
      })
      
    } catch (error) {
      console.error('🔍 调试过程出错:', error)
      wx.showToast({
        title: '调试失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 测试数据库查询
  async testDatabaseQuery() {
    console.log('🔍 开始测试数据库查询')
    
    try {
      if (!app.globalData.openid) {
        wx.showToast({
          title: '未获取到openid',
          icon: 'none'
        })
        return
      }
      
      const db = wx.cloud.database()
      console.log('🔍 当前openid:', app.globalData.openid)
      
      // 1. 查询所有数据
      const allResult = await db.collection('b-measure').get()
      console.log('🔍 数据库中所有数据:', allResult.data)
      console.log('🔍 总数据量:', allResult.data.length)
      
      // 2. 使用_openid查询
      const openidResult = await db.collection('b-measure')
        .where({ _openid: app.globalData.openid })
        .get()
      console.log('🔍 使用_openid查询结果:', openidResult.data)
      
      // 3. 使用openid查询
      const openidResult2 = await db.collection('b-measure')
        .where({ openid: app.globalData.openid })
        .get()
      console.log('🔍 使用openid查询结果:', openidResult2.data)
      
      // 4. 显示结果
      let message = `总数据: ${allResult.data.length}条\n`
      message += `_openid查询: ${openidResult.data.length}条\n`
      message += `openid查询: ${openidResult2.data.length}条\n`
      
      if (allResult.data.length > 0) {
        const sample = allResult.data[0]
        message += `\n样本字段: ${Object.keys(sample).join(', ')}`
      }
      
      wx.showModal({
        title: '数据库查询测试',
        content: message,
        showCancel: false
      })
      
    } catch (error) {
      console.error('🔍 测试数据库查询失败:', error)
      wx.showToast({
        title: '查询失败: ' + error.message,
        icon: 'none'
      })
    }
  },

  // 显示添加记录弹窗（供底部导航栏调用）
  showAddRecordModal() {
    console.log('📝 显示添加记录弹窗')
    
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    
    this.setData({
      showModal: true,
      containerClass: 'modal-active',
      modalData: {
        date: date,
        height: '',
        weight: '',
        head: ''
      },
      submitting: false
    })
  },

  // 隐藏添加记录弹窗
  hideModal() {
    this.setData({ 
      showModal: false,
      containerClass: '',
      submitting: false
    })
  },

  // 弹窗输入处理
  onModalInput(e) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value
    
    // 验证数字输入格式，允许小数点
    if (value && !/^\d*\.?\d*$/.test(value)) {
      value = value.replace(/[^\d.]/g, '')
      const parts = value.split('.')
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
      }
    }
    
    this.setData({
      [`modalData.${field}`]: value
    })
  },

  // 日期选择处理
  onModalDateChange(e) {
    const selectedDate = e.detail.value
    const today = new Date().toISOString().split('T')[0]
    
    // 检查是否选择了未来日期
    if (selectedDate > today) {
      wx.showToast({
        title: '不能选择未来日期',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    this.setData({
      'modalData.date': selectedDate
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

    // 验证日期不能为未来日期
    if (modalData.date) {
      const selectedDate = modalData.date
      const today = new Date().toISOString().split('T')[0]
      
      if (selectedDate > today) {
        wx.showToast({
          title: '记录日期不能是未来日期',
          icon: 'none',
          duration: 2000
        })
        return
      }
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
      
      // 构建测量记录
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

      // 保存到本地存储
      this.saveToLocal(measureRecord)

      // 同步到云端
      await this.syncToCloud(measureRecord)

      // 关闭弹窗
      this.hideModal()

      // 重新加载数据
      await this.loadData()

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
        date: measureRecord.date
      }).get()

      const data = {
        ...measureRecord,
        updateTime: new Date()
      }

      if (queryResult.data.length > 0) {
        // 更新现有记录
        await collection.doc(queryResult.data[0]._id).update({
          data: data
        })
        console.log('📝 云端记录更新成功')
      } else {
        // 创建新记录
        await collection.add({
          data: data
        })
        console.log('📝 云端记录创建成功')
      }
    } catch (error) {
      console.error('云端同步失败:', error)
      throw error
    }
  }
}) 