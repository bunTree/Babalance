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
    containerStyle: '--status-bar-height: 88rpx;', // 状态栏高度样式

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
    submitting: false,
    
    // 日期限制
    maxDate: new Date().toISOString().split('T')[0]  // 今天的日期
  },

  async onLoad() {
    // 获取设备信息，设置状态栏高度
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

    await this.loadBabyInfo()
    // 确保页面加载时背景色正确显示
    this.refreshDisplayTexts()

    // 注册数据更新监听
    const app = getApp()
    this.dataUpdateCallback = async () => {
      console.log('👶 Profile页面收到数据更新通知')
      try {
        await this.loadBabyInfo()
        this.refreshDisplayTexts()
        console.log('👶 Profile页面数据刷新完成')
      } catch (error) {
        console.error('👶 Profile页面数据刷新失败:', error)
      }
    }
    app.onDataUpdate(this.dataUpdateCallback)
  },

  onShow() {
    console.log('Profile页面显示')
    this.refreshDisplayTexts()
    
    // 刷新TabBar状态和性别色彩
    setTimeout(() => {
      this.refreshTabBar()
    }, 100)
  },

  // Tab切换时的自动刷新
  onTabSwitch() {
    console.log('🔄 Profile页面Tab切换刷新')
    this.loadBabyInfo()
  },

  onUnload() {
    // 页面卸载时移除监听器
    const app = getApp()
    if (this.dataUpdateCallback) {
      app.offDataUpdate(this.dataUpdateCallback)
    }
  },

  // 刷新TabBar状态
  refreshTabBar() {
    try {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setSelected()
        this.getTabBar().refreshGender()
        console.log('🔄 TabBar状态已刷新')
      }
    } catch (error) {
      console.error('刷新TabBar状态失败:', error)
    }
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

  // 更换头像 - 完整的上传流程
  async changeAvatar() {
    try {
      // 1. 选择图片
      const tempFilePath = await this.selectImage()
      if (!tempFilePath) return
      
      // 2. 验证图片
      await this.validateImage(tempFilePath)
      
      // 3. 压缩图片（暂时跳过压缩，直接使用原图）
      const compressedPath = tempFilePath // await this.compressImage(tempFilePath)
      
      // 4. 清理旧头像释放空间
      await this.cleanupOldAvatar()
      
      // 5. 上传头像（云存储优先，本地存储降级）
      const savedPath = await this.uploadAvatarWithFallback(compressedPath)
      
      // 6. 更新宝宝信息
      await this.updateBabyInfo('avatar', savedPath)
      
      console.log('✅ 头像上传完成:', savedPath)
      
    } catch (error) {
      console.error('❌ 更换头像失败:', error)
      wx.hideLoading()
      
      // 根据错误类型显示不同提示
      if (error.message.includes('用户取消')) {
        return // 用户取消，不显示错误
      } else if (error.message.includes('文件类型')) {
        wx.showToast({
          title: '请选择图片文件',
          icon: 'none'
        })
      } else if (error.message.includes('文件大小')) {
        wx.showToast({
          title: '图片文件过大',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '头像设置失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  // 选择图片
  async selectImage() {
    wx.showLoading({
      title: '选择头像中...',
      mask: true
    })
    
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          sizeType: ['original', 'compressed'],
          sourceType: ['camera', 'album'],
          success: resolve,
          fail: reject
        })
      })
      
      const tempFilePath = res.tempFilePaths[0]
      console.log('📷 选择的图片路径:', tempFilePath)
      return tempFilePath
      
    } catch (error) {
      if (error.errMsg && error.errMsg.includes('cancel')) {
        throw new Error('用户取消选择')
      }
      throw new Error('选择图片失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 验证图片
  async validateImage(tempFilePath) {
    // 验证文件类型
    try {
      await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: tempFilePath,
          success: (res) => {
            const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp']
            const fileType = res.type.toLowerCase()
            
            if (allowedTypes.includes(fileType)) {
              resolve(res)
            } else {
              reject(new Error('不支持的文件类型'))
            }
          },
          fail: () => reject(new Error('文件验证失败'))
        })
      })
    } catch (error) {
      throw new Error('文件类型不支持')
    }
    
    // 验证文件大小
    try {
      await new Promise((resolve, reject) => {
        wx.getFileInfo({
          filePath: tempFilePath,
          success: (res) => {
            const maxSize = 10 * 1024 * 1024 // 10MB
            if (res.size <= maxSize) {
              resolve(res)
            } else {
              reject(new Error('文件大小超出限制'))
            }
          },
          fail: () => reject(new Error('获取文件信息失败'))
        })
      })
    } catch (error) {
      throw new Error('文件大小超出限制')
    }
  },

  // 压缩图片
  async compressImage(src, quality = 0.8) {
    try {
      wx.showLoading({
        title: '处理图片中...',
        mask: true
      })
      
      const imageInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: src,
          success: resolve,
          fail: reject
        })
      })
      
      const { width, height } = imageInfo
      const maxSize = 800 // 最大尺寸
      
      // 如果图片尺寸较小，直接返回原图
      if (width <= maxSize && height <= maxSize) {
        console.log('📷 图片尺寸合适，无需压缩')
        return src
      }
      
      // 计算压缩后的尺寸
      let newWidth = width
      let newHeight = height
      
      if (width > height) {
        newWidth = maxSize
        newHeight = (height * maxSize) / width
      } else {
        newHeight = maxSize
        newWidth = (width * maxSize) / height
      }
      
      console.log(`📷 压缩图片: ${width}x${height} -> ${Math.round(newWidth)}x${Math.round(newHeight)}`)
      
      // 尝试使用新的 Canvas 2D API
      try {
        return await this.compressImageWithCanvas2D(src, newWidth, newHeight, quality)
      } catch (canvas2dError) {
        console.warn('📷 Canvas 2D API 失败，尝试旧版API:', canvas2dError)
        // 降级到旧版 Canvas API
        return await this.compressImageWithLegacyCanvas(src, newWidth, newHeight, quality)
      }
      
    } catch (error) {
      console.warn('📷 图片压缩失败，使用原图:', error)
      return src
    } finally {
      wx.hideLoading()
    }
  },

  // 使用 Canvas 2D API 压缩图片
  async compressImageWithCanvas2D(src, width, height, quality) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery()
      query.select('#avatarCompressCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            reject(new Error('Canvas 节点获取失败'))
            return
          }
          
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          // 设置画布尺寸
          canvas.width = width
          canvas.height = height
          
          // 创建图片对象
          const img = canvas.createImage()
          img.onload = () => {
            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height)
            
            // 导出图片
            wx.canvasToTempFilePath({
              canvas: canvas,
              quality: quality,
              fileType: 'jpg',
              success: (res) => {
                console.log('📷 Canvas 2D 压缩完成:', res.tempFilePath)
                resolve(res.tempFilePath)
              },
              fail: (error) => {
                console.error('📷 Canvas 2D 导出失败:', error)
                reject(error)
              }
            })
          }
          img.onerror = (error) => {
            console.error('📷 图片加载失败:', error)
            reject(error)
          }
          img.src = src
        })
    })
  },

  // 使用旧版 Canvas API 压缩图片（降级方案）
  async compressImageWithLegacyCanvas(src, width, height, quality) {
    const canvasId = 'avatarCompressCanvas'
    const ctx = wx.createCanvasContext(canvasId)
    
    return new Promise((resolve) => {
      ctx.drawImage(src, 0, 0, width, height)
      ctx.draw(false, () => {
        // 等待绘制完成后再导出
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: canvasId,
            width: width,
            height: height,
            destWidth: width,
            destHeight: height,
            quality: quality,
            fileType: 'jpg',
            success: (res) => {
              console.log('📷 旧版Canvas压缩完成:', res.tempFilePath)
              resolve(res.tempFilePath)
            },
            fail: (error) => {
              console.warn('📷 旧版Canvas压缩失败，使用原图:', error)
              resolve(src)
            }
          })
        }, 300)
      })
    })
  },

  // 上传头像（多重降级策略）
  async uploadAvatarWithFallback(tempFilePath) {
    const strategies = [
      {
        name: '云存储',
        handler: () => this.saveAvatarToCloud(tempFilePath),
        fallback: true
      },
      {
        name: '本地存储',
        handler: () => this.saveAvatarToLocal(tempFilePath),
        fallback: true
      },
      {
        name: '文字头像',
        handler: () => Promise.resolve(''),
        fallback: false
      }
    ]
    
    for (const strategy of strategies) {
      try {
        console.log(`🔄 尝试${strategy.name}...`)
        const result = await strategy.handler()
        
        wx.showToast({
          title: `头像设置成功(${strategy.name})`,
          icon: 'success'
        })
        
        console.log(`✅ ${strategy.name}成功:`, result)
        return result
        
      } catch (error) {
        console.error(`❌ ${strategy.name}失败:`, error)
        
        if (!strategy.fallback) {
          throw error
        }
        
        // 继续尝试下一个策略
        continue
      }
    }
    
    throw new Error('所有上传策略都失败了')
  },

  // 保存头像到云存储
  async saveAvatarToCloud(tempFilePath) {
    try {
      wx.showLoading({
        title: '上传到云端...',
        mask: true
      })
      
      // 获取app实例和openid
      const app = getApp()
      const openid = app.globalData.openid
      
      if (!openid) {
        throw new Error('未获取到用户标识')
      }
      
      // 生成云端文件路径
      const timestamp = Date.now()
      const cloudPath = `avatars/${openid}_${timestamp}.jpg`
      
      console.log('☁️ 开始上传到云存储:', cloudPath)
      
      // 上传到云存储
      const result = await new Promise((resolve, reject) => {
        const uploadTask = wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: resolve,
          fail: reject
        })
        
        // 监听上传进度
        uploadTask.onProgressUpdate((res) => {
          const progress = Math.round(res.progress)
          console.log(`☁️ 上传进度: ${progress}%`)
          
          wx.showLoading({
            title: `上传中 ${progress}%`,
            mask: true
          })
        })
      })
      
      console.log('☁️ 云存储上传成功:', result.fileID)
      return result.fileID
      
    } catch (error) {
      console.error('☁️ 云存储上传失败:', error)
      throw error
    } finally {
      wx.hideLoading()
    }
  },

  // 保存头像到本地存储
  async saveAvatarToLocal(tempFilePath) {
    try {
      // 生成简单的文件名（避免过长）
      const timestamp = Date.now()
      const fileName = `avatar_${timestamp}.jpg`
      
      // 使用文件系统API保存到用户目录
      const fs = wx.getFileSystemManager()
      const userDir = `${wx.env.USER_DATA_PATH}/avatars`
      const savedPath = `${userDir}/${fileName}`
      
      // 确保目录存在
      try {
        fs.mkdirSync(userDir, true)
        console.log('📁 头像目录创建成功')
      } catch (e) {
        // 目录可能已存在，检查是否真的存在
        if (!e.errMsg || !e.errMsg.includes('file already exists')) {
          console.error('📁 目录创建失败:', e)
          throw new Error('无法创建头像目录')
        }
        console.log('📁 头像目录已存在')
      }

      // 保存文件
      await new Promise((resolve, reject) => {
        fs.copyFile({
          srcPath: tempFilePath,
          destPath: savedPath,
          success: () => {
            console.log('💾 文件保存成功:', savedPath)
            resolve()
          },
          fail: (error) => {
            console.error('💾 文件保存失败:', error)
            reject(error)
          }
        })
      })

      return savedPath
    } catch (error) {
      console.error('❌ 保存头像到本地失败:', error)
      throw error
    }
  },

  // 清理旧的头像文件
  async cleanupOldAvatar() {
    try {
      const oldAvatar = this.data.babyInfo.avatar
      if (!oldAvatar || oldAvatar.startsWith('/images/') || oldAvatar.startsWith('data:')) {
        console.log('🗑️ 无需清理的头像路径:', oldAvatar)
        return
      }

      const fs = wx.getFileSystemManager()
      
      // 处理云存储文件
      if (oldAvatar.startsWith('cloud://')) {
        try {
          await this.deleteCloudFile(oldAvatar)
        } catch (e) {
          console.log('🗑️ 清理云存储头像文件异常:', e)
        }
      }
      
      // 处理旧的 wxfile:// 格式文件
      else if (oldAvatar.startsWith('wxfile://')) {
        try {
          await new Promise((resolve) => {
            wx.removeSavedFile({
              filePath: oldAvatar,
              success: () => {
                console.log('🗑️ 旧头像文件已清理(wxfile):', oldAvatar)
                resolve()
              },
              fail: (error) => {
                console.log('🗑️ 清理旧头像文件失败(wxfile):', error)
                resolve() // 不阻塞流程
              }
            })
          })
        } catch (e) {
          console.log('🗑️ 清理旧头像文件异常(wxfile):', e)
        }
      }
      
      // 处理用户目录文件
      else if (oldAvatar.includes(wx.env.USER_DATA_PATH)) {
        try {
          await new Promise((resolve) => {
            fs.unlink({
              filePath: oldAvatar,
              success: () => {
                console.log('🗑️ 旧头像文件已清理(userdata):', oldAvatar)
                resolve()
              },
              fail: (error) => {
                console.log('🗑️ 清理旧头像文件失败(userdata):', error)
                resolve() // 不阻塞流程
              }
            })
          })
        } catch (e) {
          console.log('🗑️ 清理旧头像文件异常(userdata):', e)
        }
      }

      // 清理整个头像目录中的旧文件（只保留最新的1个）
      await this.cleanupAvatarDirectory()
      
    } catch (error) {
      console.log('🗑️ 清理旧头像文件总体异常:', error)
    }
  },

  // 删除云存储文件
  async deleteCloudFile(fileID) {
    try {
      const result = await wx.cloud.deleteFile({
        fileList: [fileID]
      })
      
      if (result.fileList && result.fileList[0] && result.fileList[0].status === 0) {
        console.log('🗑️ 云存储文件删除成功:', fileID)
      } else {
        console.log('🗑️ 云存储文件删除失败:', result)
      }
    } catch (error) {
      console.error('🗑️ 删除云存储文件异常:', error)
    }
  },

  // 清理头像目录，只保留最新的1个文件
  async cleanupAvatarDirectory() {
    try {
      const fs = wx.getFileSystemManager()
      const userDir = `${wx.env.USER_DATA_PATH}/avatars`
      
      const files = await new Promise((resolve) => {
        fs.readdir({
          dirPath: userDir,
          success: (res) => resolve(res.files || []),
          fail: (error) => {
            console.log('📁 读取头像目录失败:', error)
            resolve([])
          }
        })
      })

      console.log(`📁 头像目录文件数量: ${files.length}`)

      // 如果文件数量超过1个，删除除最新文件外的所有文件
      if (files.length > 1) {
        // 按文件名排序（文件名包含时间戳，可以简单排序）
        files.sort()
        
        // 保留最后一个（最新的），删除其他的
        const filesToDelete = files.slice(0, -1)
        console.log(`🗑️ 准备删除 ${filesToDelete.length} 个旧头像文件`)

        for (const fileName of filesToDelete) {
          try {
            const filePath = `${userDir}/${fileName}`
            await new Promise((resolve) => {
              fs.unlink({
                filePath: filePath,
                success: () => {
                  console.log('🗑️ 清理旧头像文件:', fileName)
                  resolve()
                },
                fail: (error) => {
                  console.log('🗑️ 删除文件失败:', fileName, error)
                  resolve()
                }
              })
            })
          } catch (e) {
            console.log('🗑️ 删除文件异常:', fileName, e)
          }
        }
      }
    } catch (error) {
      console.log('🗑️ 清理头像目录异常:', error)
    }
  },

  // 头像加载错误处理
  onAvatarError(e) {
    console.error('❌ 头像加载失败:', e.detail)
    console.log('🔄 使用默认头像')
    
    const brokenPath = this.data.babyInfo.avatar
    
    // 如果是云存储文件，尝试获取临时链接
    if (brokenPath && brokenPath.startsWith('cloud://')) {
      this.tryGetCloudFileUrl(brokenPath)
      return
    }
    
    // 如果当前头像不是默认状态，则重置为默认状态（无头像，显示文字）
    if (brokenPath) {
      // 清理损坏的头像文件
      this.cleanupBrokenAvatar(brokenPath)
      
      this.setData({
        'babyInfo.avatar': ''  // 设置为空，使用文字头像
      })
      
      // 同步更新到存储
      this.updateBabyInfo('avatar', '')
    }
  },

  // 尝试获取云文件的临时访问链接
  async tryGetCloudFileUrl(fileID) {
    try {
      console.log('🔄 尝试获取云文件临时链接:', fileID)
      
      const result = await wx.cloud.getTempFileURL({
        fileList: [fileID]
      })
      
      if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
        const tempUrl = result.fileList[0].tempFileURL
        console.log('✅ 获取云文件临时链接成功:', tempUrl)
        
        // 更新头像为临时链接
        this.setData({
          'babyInfo.avatar': tempUrl
        })
        
        return
      }
    } catch (error) {
      console.error('❌ 获取云文件临时链接失败:', error)
    }
    
    // 如果获取临时链接失败，使用文字头像
    this.setData({
      'babyInfo.avatar': ''
    })
    
    // 清理无效的云文件引用
    this.cleanupBrokenAvatar(fileID)
  },

  // 清理损坏的头像文件
  async cleanupBrokenAvatar(brokenPath) {
    try {
      if (!brokenPath || brokenPath.startsWith('/images/') || brokenPath.startsWith('data:')) {
        return  // 跳过默认路径和base64数据
      }

      const fs = wx.getFileSystemManager()
      
      // 处理云存储文件
      if (brokenPath.startsWith('cloud://')) {
        await this.deleteCloudFile(brokenPath)
      }
      // 处理本地文件
      else if (brokenPath.startsWith('wxfile://')) {
        wx.removeSavedFile({
          filePath: brokenPath,
          success: () => console.log('🗑️ 清理损坏头像文件(wxfile):', brokenPath),
          fail: (error) => console.log('🗑️ 清理损坏头像文件失败(wxfile):', error)
        })
      } else if (brokenPath.includes(wx.env.USER_DATA_PATH)) {
        fs.unlink({
          filePath: brokenPath,
          success: () => console.log('🗑️ 清理损坏头像文件(userdata):', brokenPath),
          fail: (error) => console.log('🗑️ 清理损坏头像文件失败(userdata):', error)
        })
      }
    } catch (error) {
      console.log('🗑️ 清理损坏头像文件异常:', error)
    }
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

        // 触发全局数据更新通知，刷新其他页面
        app.notifyDataUpdate()
        
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

      // 通知其他页面数据更新
      const app = getApp()
      app.notifyDataUpdate()

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
        date: measureRecord.date
      }).get()

      const data = {
        ...measureRecord,
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