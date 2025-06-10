// 数据库问题快速修复脚本
// 在微信开发者工具控制台运行

console.log('🔧 开始数据库问题修复检查...')

const app = getApp()

// 修复步骤1：重新初始化云开发
async function reinitCloud() {
  console.log('\n1. 🔄 重新初始化云开发...')
  try {
    wx.cloud.init({
      env: 'cloud1-3gkpl0rm53f6eed4',
      traceUser: true,
    })
    console.log('✅ 云开发重新初始化成功')
    return true
  } catch (error) {
    console.log('❌ 云开发初始化失败:', error.errMsg)
    return false
  }
}

// 修复步骤2：重新获取openid
async function refreshOpenId() {
  console.log('\n2. 🔑 重新获取openid...')
  try {
    const res = await wx.cloud.callFunction({
      name: 'login'
    })
    
    if (res.result && res.result.openid) {
      app.globalData.openid = res.result.openid
      console.log('✅ openid重新获取成功:', res.result.openid.substr(0, 8) + '...')
      return true
    } else {
      console.log('❌ 云函数返回结果异常:', res)
      return false
    }
  } catch (error) {
    console.log('❌ 获取openid失败:', error.errMsg)
    console.log('💡 请检查：')
    console.log('   - 云函数login是否已部署')
    console.log('   - 网络连接是否正常')
    return false
  }
}

// 修复步骤3：测试数据库基本操作
async function testDatabaseOperations() {
  console.log('\n3. 🧪 测试数据库基本操作...')
  
  if (!app.globalData.openid) {
    console.log('❌ 跳过数据库测试 - 无openid')
    return false
  }
  
  const db = wx.cloud.database()
      const collection = db.collection('b-user')
  
  try {
    // 测试读取权限
    console.log('   📖 测试读取权限...')
    const readRes = await collection.where({
      _openid: app.globalData.openid
    }).get()
    console.log('   ✅ 读取权限正常，当前记录数:', readRes.data.length)
    
    // 测试写入权限
    console.log('   ✏️ 测试写入权限...')
    const testData = {
      name: '测试数据',
      test: true,
      timestamp: db.serverDate()
    }
    
    if (readRes.data.length > 0) {
      // 测试更新
      const updateRes = await collection.doc(readRes.data[0]._id).update({
        data: { testUpdate: new Date().toISOString() }
      })
      console.log('   ✅ 更新权限正常')
      
      // 恢复原数据
      await collection.doc(readRes.data[0]._id).update({
        data: { testUpdate: db.remove() }
      })
    } else {
      // 测试新增
      const addRes = await collection.add({
        data: testData
      })
      console.log('   ✅ 创建权限正常，测试记录ID:', addRes._id)
      
      // 删除测试记录
      await collection.doc(addRes._id).remove()
      console.log('   🗑️ 测试记录已清理')
    }
    
    return true
  } catch (error) {
    console.log('   ❌ 数据库操作失败:', error.errMsg)
    console.log('   💡 可能的解决方案:')
    
    if (error.errCode === -502005) {
      console.log('      → 数据库权限设置问题，请设为"仅创建者可读写"')
    } else if (error.errCode === -502003) {
      console.log('      → 集合不存在，请在云开发控制台创建"b-user"集合')
    } else if (error.errCode === -501000) {
      console.log('      → 网络或服务问题，请检查网络连接')
    }
    
    return false
  }
}

// 修复步骤4：尝试修复保存功能
async function fixSaveFunction() {
  console.log('\n4. 🔧 尝试修复保存功能...')
  
  const testBabyInfo = {
    name: '修复测试',
    gender: 'male',
    birthday: '2024-01-01',
    avatar: ''
  }
  
  try {
    const success = await app.saveBabyInfo(testBabyInfo)
    if (success) {
      console.log('✅ 保存功能修复成功！')
      
      // 恢复之前的数据
      const originalData = wx.getStorageSync('babyInfo_backup') || {}
      if (originalData.name || originalData.gender || originalData.birthday) {
        await app.saveBabyInfo(originalData)
        console.log('✅ 原始数据已恢复')
      }
      
      return true
    } else {
      console.log('❌ 保存功能仍有问题')
      return false
    }
  } catch (error) {
    console.log('❌ 保存功能修复失败:', error.message)
    return false
  }
}

// 修复步骤5：提供最终建议
function provideFinalAdvice(results) {
  console.log('\n5. 📋 修复结果总结:')
  console.log('   云开发初始化:', results.cloudInit ? '✅' : '❌')
  console.log('   openid获取:', results.openidRefresh ? '✅' : '❌')
  console.log('   数据库操作:', results.databaseTest ? '✅' : '❌')
  console.log('   保存功能:', results.saveFunction ? '✅' : '❌')
  
  if (results.saveFunction) {
    console.log('\n🎉 恭喜！数据库写入问题已修复！')
    console.log('现在您可以正常保存宝宝信息了。')
  } else {
    console.log('\n⚠️ 仍存在问题，请按以下步骤手动检查：')
    
    if (!results.cloudInit) {
      console.log('1. 检查app.js中的环境ID是否正确')
    }
    
    if (!results.openidRefresh) {
      console.log('2. 在微信开发者工具中右键cloudfunctions/login，选择"上传并部署：云端安装依赖"')
    }
    
    if (!results.databaseTest) {
      console.log('3. 在云开发控制台中：')
             console.log('   - 确保"b-user"集合已创建')
      console.log('   - 将集合权限设为"仅创建者可读写"')
    }
    
    console.log('4. 如果问题仍然存在，请检查：')
    console.log('   - 小程序是否已认证（个人开发者可能有限制）')
    console.log('   - 网络连接是否稳定')
    console.log('   - 云开发环境是否正常')
  }
}

// 执行所有修复步骤
async function runAllFixes() {
  // 备份当前数据
  const currentData = wx.getStorageSync('babyInfo') || {}
  if (currentData.name || currentData.gender || currentData.birthday) {
    wx.setStorageSync('babyInfo_backup', currentData)
    console.log('📦 当前数据已备份')
  }
  
  const results = {}
  
  results.cloudInit = await reinitCloud()
  results.openidRefresh = await refreshOpenId()
  results.databaseTest = await testDatabaseOperations()
  results.saveFunction = await fixSaveFunction()
  
  provideFinalAdvice(results)
  
  console.log('\n🔧 修复脚本执行完成！')
}

// 开始执行修复
runAllFixes().catch(error => {
  console.error('修复过程出错:', error)
  console.log('请手动按照setup-cloud.md文档进行配置')
}) 