# 宝宝简介卡片重新设计

## 概述
将原来的指标卡片区域重新设计为宝宝简介卡片，充分利用空间展示宝宝的基本信息和三项关键指标。

## 设计改动

### 1. 整体布局
- **原设计**: 单一指标大卡片 + 其他指标小卡片的垂直布局
- **新设计**: 左右分栏布局，左侧宝宝信息，右侧指标数据

### 2. 左侧宝宝信息区域
- **头像**: 圆形头像，显示宝宝姓名首字母，支持性别主题色彩
- **姓名**: 显示宝宝姓名，默认为"我的宝宝"
- **性别**: 显示"男宝"或"女宝"，带背景标签样式
- **年龄**: 智能计算并显示年龄（如"1岁3个月"、"8个月"）
- **更新时间**: 显示最后更新时间

### 3. 右侧指标数据区域
- **垂直布局**: 三个指标（体重、身高、头围）垂直排列
- **交互式**: 点击切换当前查看的图表类型
- **状态指示**: 当前选中的指标有高亮效果

## 技术实现

### WXML结构
```xml
<view class="baby-profile-card">
  <!-- 左侧基本信息 -->
  <view class="profile-left">
    <view class="baby-avatar">
      <text class="avatar-text">{{babyInfo.name ? babyInfo.name.charAt(0) : '宝'}}</text>
    </view>
    <view class="baby-basic-info">
      <text class="baby-name">{{babyInfo.name || '我的宝宝'}}</text>
      <view class="baby-details">
        <text class="baby-gender">{{genderText}}</text>
        <text class="baby-age">{{ageText}}</text>
      </view>
      <text class="last-update">{{lastUpdateText}}</text>
    </view>
  </view>
  
  <!-- 右侧指标数据 -->
  <view class="profile-right">
    <view class="metrics-grid">
      <view class="metric-item {{activeChartType === 'weight' ? 'active' : ''}}" 
            bindtap="switchChartType" data-type="weight">
        <text class="metric-label">体重</text>
        <text class="metric-value">{{getMetricValue('weight')}}</text>
      </view>
      <!-- 身高和头围类似 -->
    </view>
  </view>
</view>
```

### JavaScript数据处理
```javascript
// 新增数据字段
data: {
  babyInfo: {},
  genderText: '未设置',
  ageText: '未设置'
}

// 性别文本转换
getGenderText(gender) {
  if (gender === 'male' || gender === 'boy') {
    return '男宝'
  } else if (gender === 'female' || gender === 'girl') {
    return '女宝'
  } else {
    return '未设置'
  }
}

// 年龄计算
calculateAge(birthday) {
  // 智能计算年龄，支持月龄和年龄显示
  // 如: "8个月", "1岁3个月", "2岁"
}
```

### CSS样式特点
- **响应式布局**: 左右分栏，自适应宽度
- **性别主题**: 支持男宝/女宝主题色彩
- **交互反馈**: 点击、悬停状态的视觉反馈
- **现代设计**: 渐变背景、圆角、阴影效果

## 性别主题支持

### 女宝主题
- 头像: 粉色渐变 (#ff6b9d → #ff8fab)
- 卡片背景: 浅粉色渐变 (#fff5f8 → #ffeef5)
- 指标项: 粉色系背景和边框

### 男宝主题  
- 头像: 蓝色渐变 (#4facfe → #00b4db)
- 卡片背景: 浅蓝色渐变 (#f0f8ff → #e6f3ff)
- 指标项: 蓝色系背景和边框

### 默认主题
- 头像: 紫色渐变 (#667eea → #764ba2)
- 卡片背景: 中性色渐变 (#ffffff → #f8fafc)

## 用户体验提升

1. **信息密度**: 在相同空间内展示更多有用信息
2. **个性化**: 显示宝宝个人信息，增强情感连接
3. **直观性**: 所有关键指标一目了然
4. **交互性**: 保持原有的指标切换功能
5. **美观性**: 现代化的卡片设计，支持性别主题

## 兼容性
- 完全兼容现有的性别主题系统
- 保持原有的图表切换功能
- 向后兼容，未设置宝宝信息时显示默认值 