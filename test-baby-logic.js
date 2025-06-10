// 宝宝信息创建/更新逻辑测试脚本
// 在微信开发者工具控制台运行

console.log('🧪 开始测试宝宝信息创建/更新逻辑...')

const app = getApp()

// 测试场景1：全新创建宝宝
async function testNewBabyCreation() {
  console.log('\n📝 测试场景1: 全新创建宝宝')
  
  // 清空现有数据
  wx.removeStorageSync('babyInfo')
  app.globalData.babyInfo = {}
  
  const newBabyInfo = {
    name: '小宝',
    gender: 'male',
    birthday: '2024-01-01',
    avatar: ''
  }
  
  try {
    const success = await app.saveBabyInfo(newBabyInfo)
    console.log('✅ 新宝宝创建测试:', success ? '成功' : '失败')
    
    // 验证数据是否正确保存
    const savedInfo = app.getBabyInfo()
    console.log('💾 保存的信息:', savedInfo)
    
    return success
  } catch (error) {
    console.error('❌ 新宝宝创建失败:', error)
    return false
  }
}

// 测试场景2：更新单个字段
async function testSingleFieldUpdate() {
  console.log('\n📝 测试场景2: 更新单个字段')
  
  const originalInfo = app.getBabyInfo()
  console.log('📖 原始信息:', originalInfo)
  
  // 只更新名字
  const updatedInfo = { ...originalInfo, name: '更新的宝宝名字' }
  
  try {
    const success = await app.saveBabyInfo(updatedInfo)
    console.log('✅ 单字段更新测试:', success ? '成功' : '失败')
    
    const newInfo = app.getBabyInfo()
    console.log('📝 更新后信息:', newInfo)
    
    // 验证变化检测
    const changes = app.detectBabyInfoChanges(originalInfo, updatedInfo)
    console.log('🔍 检测到的变化:', changes)
    
    return success
  } catch (error) {
    console.error('❌ 单字段更新失败:', error)
    return false
  }
}

// 测试场景3：多字段同时更新
async function testMultipleFieldUpdate() {
  console.log('\n📝 测试场景3: 多字段同时更新')
  
  const originalInfo = app.getBabyInfo()
  
  const updatedInfo = {
    ...originalInfo,
    name: '多字段更新测试',
    gender: 'female',
    birthday: '2024-06-01'
  }
  
  try {
    const success = await app.saveBabyInfo(updatedInfo)
    console.log('✅ 多字段更新测试:', success ? '成功' : '失败')
    
    const changes = app.detectBabyInfoChanges(originalInfo, updatedInfo)
    console.log('🔍 检测到的变化:', changes)
    
    return success
  } catch (error) {
    console.error('❌ 多字段更新失败:', error)
    return false
  }
}

// 测试场景4：无变化保存
async function testNoChangesSave() {
  console.log('\n📝 测试场景4: 无变化保存')
  
  const currentInfo = app.getBabyInfo()
  
  try {
    const success = await app.saveBabyInfo(currentInfo)
    console.log('✅ 无变化保存测试:', success ? '成功(应该跳过)' : '失败')
    
    const changes = app.detectBabyInfoChanges(currentInfo, currentInfo)
    console.log('🔍 变化检测结果:', changes)
    
    return success
  } catch (error) {
    console.error('❌ 无变化保存失败:', error)
    return false
  }
}

// 测试场景5：空值处理
async function testEmptyValueHandling() {
  console.log('\n📝 测试场景5: 空值处理')
  
  const originalInfo = app.getBabyInfo()
  
  // 将某个字段设为空
  const updatedInfo = { ...originalInfo, name: '' }
  
  try {
    const success = await app.saveBabyInfo(updatedInfo)
    console.log('✅ 空值处理测试:', success ? '成功' : '失败')
    
    const changes = app.detectBabyInfoChanges(originalInfo, updatedInfo)
    console.log('🔍 空值变化检测:', changes)
    
    return success
  } catch (error) {
    console.error('❌ 空值处理失败:', error)
    return false
  }
}

// 测试场景6：边界情况 - 只有头像
async function testAvatarOnlyUpdate() {
  console.log('\n📝 测试场景6: 仅头像更新')
  
  const originalInfo = app.getBabyInfo()
  const updatedInfo = { ...originalInfo, avatar: 'new-avatar-path.jpg' }
  
  try {
    const success = await app.saveBabyInfo(updatedInfo)
    console.log('✅ 仅头像更新测试:', success ? '成功' : '失败')
    
    const changes = app.detectBabyInfoChanges(originalInfo, updatedInfo)
    console.log('🔍 头像变化检测:', changes)
    
    return success
  } catch (error) {
    console.error('❌ 仅头像更新失败:', error)
    return false
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行所有测试...')
  
  const results = {}
  
  results.newCreation = await testNewBabyCreation()
  await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
  
  results.singleUpdate = await testSingleFieldUpdate()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  results.multipleUpdate = await testMultipleFieldUpdate()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  results.noChanges = await testNoChangesSave()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  results.emptyValue = await testEmptyValueHandling()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  results.avatarOnly = await testAvatarOnlyUpdate()
  
  // 测试结果总结
  console.log('\n📊 测试结果总结:')
  console.log('全新创建:', results.newCreation ? '✅' : '❌')
  console.log('单字段更新:', results.singleUpdate ? '✅' : '❌')
  console.log('多字段更新:', results.multipleUpdate ? '✅' : '❌')
  console.log('无变化保存:', results.noChanges ? '✅' : '❌')
  console.log('空值处理:', results.emptyValue ? '✅' : '❌')
  console.log('仅头像更新:', results.avatarOnly ? '✅' : '❌')
  
  const passedTests = Object.values(results).filter(Boolean).length
  const totalTests = Object.keys(results).length
  
  console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`)
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！宝宝信息创建/更新逻辑工作正常！')
  } else {
    console.log('⚠️ 部分测试失败，请检查相关逻辑')
  }
}

// 开始测试
runAllTests().catch(error => {
  console.error('测试过程出错:', error)
}) 