# 性别主题自动切换功能

## 功能概述
监测页面现在会根据用户设定的宝宝性别自动切换主题色彩，无需手动操作。

## 实现原理

### 1. 性别值标准化
- 兼容多种性别表示方式：`'male'`/`'boy'` 和 `'female'`/`'girl'`
- 统一转换为内部标准格式：`'boy'`、`'girl'`、`'default'`

### 2. 自动检测时机
- **页面加载时** (`onLoad`): 初始化时检查并应用主题
- **页面显示时** (`onShow`): 每次进入页面时检查主题变化
- **数据加载时** (`loadData`): 加载宝宝信息时同步更新主题

### 3. 主题应用机制
- 通过 `currentGender` 数据字段控制容器类名
- WXML: `class="container container-{{currentGender || 'default'}}"`
- CSS: 为每个主题提供对应的样式规则

## 主题色彩方案

### 女宝宝主题 (girl/female)
- 主色调：粉色系 `#ff6b9d` → `#ff8fab`
- 背景：淡粉色渐变 `#ffeef8` → `#ffe0f0`
- 卡片：粉白色渐变 `#fff5f8` → `#ffeef5`

### 男宝宝主题 (boy/male)  
- 主色调：蓝色系 `#4facfe` → `#00b4db`
- 背景：淡蓝色渐变 `#e6f3ff` → `#ccebff`
- 卡片：蓝白色渐变 `#f0f8ff` → `#e6f3ff`

### 默认主题 (default)
- 使用女宝宝主题的色彩方案

## 核心代码

### 性别标准化函数
```javascript
normalizeGender(rawGender) {
  if (rawGender === 'male' || rawGender === 'boy') {
    return 'boy'
  } else if (rawGender === 'female' || rawGender === 'girl') {
    return 'girl'
  } else {
    return 'default'
  }
}
```

### 主题更新函数
```javascript
updateGenderTheme() {
  const babyInfo = wx.getStorageSync('babyInfo') || {}
  const rawGender = babyInfo.gender || 'default'
  const normalizedGender = this.normalizeGender(rawGender)
  
  if (this.data.currentGender !== normalizedGender) {
    this.setData({
      currentGender: normalizedGender
    })
    
    // 显示主题切换提示
    if (normalizedGender !== 'default') {
      wx.showToast({
        title: `已应用${themeNames[normalizedGender]}主题`,
        icon: 'none',
        duration: 2000
      })
    }
  }
}
```

## CSS兼容性
所有性别主题样式都支持两种命名方式：
```css
/* 女宝宝主题 */
.container-girl,
.container-female {
  background: linear-gradient(135deg, #ffeef8 0%, #ffe0f0 100%);
}

/* 男宝宝主题 */
.container-boy,
.container-male {
  background: linear-gradient(135deg, #e6f3ff 0%, #ccebff 100%);
}
```

## 测试功能
开发阶段提供了测试按钮，可以循环切换不同性别主题来验证效果：
- 点击"主题"按钮
- 自动循环：male → female → default
- 每个主题显示3秒

## 用户体验
1. **无感知切换**：用户设定性别后，主题自动应用
2. **即时反馈**：主题切换时显示Toast提示
3. **持久化**：主题设置跟随宝宝信息保存
4. **兼容性**：支持不同的性别值格式

## 注意事项
- 主题切换仅在性别值实际发生变化时触发
- 默认主题使用粉色系（女宝宝主题）
- 所有UI组件都支持主题切换，包括按钮、卡片、图表等 