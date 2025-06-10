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
      { key: 'height', icon: '📏', label: '身高', unit: 'cm', value: '--' },
      { key: 'weight', icon: '⚖️', label: '体重', unit: 'kg', value: '--' },
      { key: 'head', icon: '🧠', label: '头围', unit: 'cm', value: '--' }
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
      { key: 'weight', label: '体重', active: true },
      { key: 'height', label: '身高', active: false },
      { key: 'head', label: '头围', active: false }
    ],
    
    // 当前图表
    currentChart: '体重',
    
    // 分析文案
    analysisText: '暂无足够数据进行分析，请记录更多测量数据后查看智能分析结果。',
    
    // 最近记录（使用新的数据结构）
    recentRecords: [],
    
    // 图表数据
    chartData: {
      weight: {
        labels: [],
        baby: [],
        standard: []
      },
      height: {
        labels: [],
        baby: [],
        standard: []
      },
      head: {
        labels: [],
        baby: [],
        standard: []
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
    submitting: false
  },

  onLoad() {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    })
    
    this.loadBabyData()
    this.initChart()
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData()
    // 刷新TabBar性别色彩
    setTimeout(() => {
      this.refreshTabBarGender()
    }, 100)
  },

  // 加载宝宝数据
  loadBabyData() {
    try {
      const babyInfo = wx.getStorageSync('babyInfo') || {}
      const measureRecords = wx.getStorageSync('measureRecords') || []
      
      // 根据宝宝性别设置背景
      this.updateBackgroundByGender(babyInfo.gender)
      
      if (measureRecords.length > 0) {
        this.updateMetricsFromRecords(measureRecords)
        this.updateRecentRecords(measureRecords)
        this.updateChartData(measureRecords)
        this.generateAnalysis(measureRecords)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  },

  // 根据性别更新背景
  updateBackgroundByGender(gender) {
    let backgroundClass = 'container-default'
    
    switch(gender) {
      case 'male':
        backgroundClass = 'container-boy'
        break
      case 'female':
        backgroundClass = 'container-girl'
        break
      default:
        backgroundClass = 'container-default'
    }
    
    this.setData({ backgroundClass })
  },

  // 从测量记录更新指标
  updateMetricsFromRecords(measureRecords) {
    // 按日期排序，获取最新的记录
    const sortedRecords = measureRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    const latestRecord = sortedRecords[0]
    
    if (latestRecord && latestRecord.measurements) {
      // 更新指标数据
      const metrics = this.data.metrics.map(metric => {
        const measurement = latestRecord.measurements[metric.key]
        if (measurement) {
          return { 
            ...metric, 
            value: measurement.value 
          }
        }
        return metric
      })

      this.setData({ 
        metrics,
        lastUpdateDate: this.formatDate(latestRecord.date)
      })
    }
  },

  // 更新最近记录 - 新的数据结构
  updateRecentRecords(measureRecords) {
    // 按日期排序，取最近5条记录
    const sortedRecords = measureRecords
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
    
    const recentRecords = sortedRecords.map(record => {
      const measurements = []
      
      if (record.measurements) {
        Object.keys(record.measurements).forEach(key => {
          const measurement = record.measurements[key]
          measurements.push({
            type: key,
            label: this.getTypeName(key),
            value: measurement.value,
            unit: measurement.unit
          })
        })
      }
      
      return {
        id: record.date,
        date: this.formatDateShort(record.date),
        measurements: measurements
      }
    })

    this.setData({ recentRecords })
  },

  // 更新图表数据
  updateChartData(measureRecords) {
    // 按日期排序
    const sortedRecords = measureRecords.sort((a, b) => new Date(a.date) - new Date(b.date))
    
    const chartData = {
      weight: { labels: [], baby: [], standard: [] },
      height: { labels: [], baby: [], standard: [] },
      head: { labels: [], baby: [], standard: [] }
    }
    
    sortedRecords.forEach((record, index) => {
      const label = this.formatDateForChart(record.date)
      
      ['weight', 'height', 'head'].forEach(type => {
        if (record.measurements && record.measurements[type]) {
          chartData[type].labels.push(label)
          chartData[type].baby.push(record.measurements[type].value)
          // 模拟标准值（实际应用中应该根据年龄和性别查询标准表）
          chartData[type].standard.push(this.getStandardValue(type, index))
        }
      })
    })
    
    this.setData({ chartData })
  },

  // 生成智能分析
  generateAnalysis(measureRecords) {
    if (measureRecords.length < 2) {
      this.setData({
        analysisText: '暂无足够数据进行分析，请记录更多测量数据后查看智能分析结果。'
      })
      return
    }
    
    // 简单的分析逻辑
    const latest = measureRecords[measureRecords.length - 1]
    const previous = measureRecords[measureRecords.length - 2]
    
    let analysisText = '根据最近的测量数据分析：'
    
    if (latest.measurements && previous.measurements) {
      if (latest.measurements.weight && previous.measurements.weight) {
        const weightDiff = latest.measurements.weight.value - previous.measurements.weight.value
        if (weightDiff > 0) {
          analysisText += '体重增长良好；'
        } else if (weightDiff < 0) {
          analysisText += '体重有所下降，建议关注营养摄入；'
        }
      }
      
      if (latest.measurements.height && previous.measurements.height) {
        const heightDiff = latest.measurements.height.value - previous.measurements.height.value
        if (heightDiff > 0) {
          analysisText += '身高增长正常；'
        }
      }
    }
    
    analysisText += '建议继续保持规律的测量记录，以便更好地追踪宝宝的成长轨迹。'
    
    this.setData({ analysisText })
  },

  // 格式化日期（简短版本）
  formatDateShort(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today - recordDate
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}天前`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  },

  // 格式化图表日期
  formatDateForChart(dateStr) {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  // 获取标准值（模拟数据）
  getStandardValue(type, index) {
    const standards = {
      weight: [3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.0, 9.5],
      height: [50, 55, 60, 65, 68, 70, 72, 74],
      head: [35, 37, 39, 41, 42, 43, 44, 45]
    }
    
    return standards[type] ? (standards[type][index] || standards[type][standards[type].length - 1]) : 0
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today - recordDate
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    
    const timeStr = date.toTimeString().slice(0, 5)
    
    if (diffDays === 0) {
      return `今天 ${timeStr}`
    } else if (diffDays === 1) {
      return `昨天 ${timeStr}`
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}天前 ${timeStr}`
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`
    }
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

  // 刷新数据
  refreshData() {
    this.loadBabyData()
    this.updateChart()
  },

  // 时间范围切换
  onTimeChange(e) {
    const period = e.currentTarget.dataset.period
    
    const timeOptions = this.data.timeOptions.map(item => ({
      ...item,
      active: item.key === period
    }))
    
    this.setData({ timeOptions })
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

  // 查看全部记录
  viewAllRecords() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 初始化图表
  initChart() {
    const query = wx.createSelectorQuery()
    query.select('.chart-canvas').boundingClientRect()
    query.exec((res) => {
      if (res[0]) {
        this.canvasWidth = res[0].width
        this.canvasHeight = res[0].height
        this.drawChart()
      }
    })
  },

  // 绘制图表
  drawChart() {
    const ctx = wx.createCanvasContext('growthChart')
    const { canvasWidth: width = 300, canvasHeight: height = 200 } = this
    const padding = 40
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    // 获取当前选中的图表类型
    const activeChart = this.data.chartTypes.find(item => item.active)
    const chartType = activeChart ? activeChart.key : 'weight'
    const data = this.data.chartData[chartType]
    
    if (!data || !data.baby || data.baby.length === 0) {
      // 绘制空状态
      ctx.setFillStyle('#94a3b8')
      ctx.setFontSize(14)
      ctx.fillText('暂无数据', width/2 - 28, height/2)
      ctx.draw()
      return
    }
    
    // 绘制网格和坐标轴
    ctx.setStrokeStyle('#e2e8f0')
    ctx.setLineWidth(1)
    
    // 绘制数据线
    if (data.baby.length > 0) {
      const minValue = Math.min(...data.baby, ...data.standard) * 0.9
      const maxValue = Math.max(...data.baby, ...data.standard) * 1.1
      
      // 绘制宝宝数据线
      this.drawDataLine(ctx, data.baby, '#667eea', width, height, padding, minValue, maxValue, true)
      
      // 绘制标准线
      this.drawDataLine(ctx, data.standard, '#94a3b8', width, height, padding, minValue, maxValue, false)
    }
    
    // 绘制图例
    this.drawLegend(ctx, width, height)
    
    ctx.draw()
  },

  // 绘制数据线
  drawDataLine(ctx, data, color, width, height, padding, minValue, maxValue, solid) {
    if (data.length === 0) return
    
    ctx.setStrokeStyle(color)
    ctx.setLineWidth(solid ? 3 : 2)
    
    if (!solid) {
      ctx.setLineDash([5, 5])
    }
    
    ctx.beginPath()
    
    data.forEach((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
      const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
    
    if (!solid) {
      ctx.setLineDash([])
    }
    
    // 绘制数据点
    if (solid) {
      ctx.setFillStyle(color)
      data.forEach((value, index) => {
        const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
        const y = height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding)
        
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
  },

  // 绘制图例
  drawLegend(ctx, width, height) {
    const legendY = height - 20
    
    // 宝宝数据图例
    ctx.setFillStyle('#667eea')
    ctx.fillRect(20, legendY, 10, 2)
    ctx.setFillStyle('#1a202c')
    ctx.setFontSize(12)
    ctx.fillText('宝宝数据', 35, legendY + 6)
    
    // 标准数据图例
    ctx.setStrokeStyle('#94a3b8')
    ctx.setLineWidth(2)
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(120, legendY + 1)
    ctx.lineTo(130, legendY + 1)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillText('标准参考', 135, legendY + 6)
  },

  // 更新图表
  updateChart() {
    this.drawChart()
  },

  // 图表触摸事件
  touchChart(e) {
    // 可以在这里添加图表交互逻辑
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

      // 刷新数据
      this.refreshData()

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
      
      // 查询是否已有当天的记录
      const queryResult = await collection
        .where({
          openid: app.globalData.openid,
          date: measureRecord.date
        })
        .get()

      const cloudRecord = {
        ...measureRecord,
        openid: app.globalData.openid,
        updatedAt: new Date()
      }

      if (queryResult.data.length > 0) {
        // 更新现有记录
        const recordId = queryResult.data[0]._id
        await collection.doc(recordId).update({
          data: cloudRecord
        })
        console.log(`☁️ 更新云端记录: ${measureRecord.date}`)
      } else {
        // 创建新记录
        cloudRecord.createdAt = new Date()
        await collection.add({
          data: cloudRecord
        })
        console.log(`☁️ 新增云端记录: ${measureRecord.date}`)
      }
    } catch (error) {
      console.error('云端同步失败:', error)
      // 云端同步失败不影响本地保存
    }
  }
}) 