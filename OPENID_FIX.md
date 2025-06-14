# _openid 字段使用错误修复

## 🚨 问题描述

在微信云开发中，`_openid` 是系统保留字段，会自动添加到每条记录中，不能手动设置。之前的代码错误地尝试在数据中手动添加 `_openid` 字段，导致保存失败。

### 错误信息
```
errCode: -501007 invalid parameters | errMsg: Invalid Key Name: _openid
```

## 🔧 修复内容

### 1. pages/monitor/monitor.js
**修复位置**: `syncToCloud` 函数

**修复前**:
```javascript
// 查询当天是否已有记录
const queryResult = await collection.where({
  _openid: app.globalData.openid,
  date: measureRecord.date
}).get()

const data = {
  ...measureRecord,
  _openid: app.globalData.openid,  // ❌ 错误：手动设置_openid
  updateTime: new Date()
}
```

**修复后**:
```javascript
// 查询当天是否已有记录
const queryResult = await collection.where({
  date: measureRecord.date
}).get()

const data = {
  ...measureRecord,
  updateTime: new Date()  // ✅ 正确：不手动设置_openid
}
```

### 2. pages/profile/profile.js
**修复位置**: `syncToCloud` 函数

**修复内容**: 与 monitor.js 相同的修复

### 3. app.js
**修复位置**: 多个函数中的查询条件

**修复前**:
```javascript
const res = await db.collection('b-user').where({
  _openid: this.globalData.openid  // ❌ 错误：查询条件不需要手动指定
}).get()
```

**修复后**:
```javascript
const res = await db.collection('b-user').get()  // ✅ 正确：自动按当前用户过滤
```

## 📚 微信云开发 _openid 使用规则

### ✅ 正确用法

1. **查询时自动过滤**
   ```javascript
   // 云开发会自动按当前用户的_openid过滤数据
   const res = await db.collection('collection-name').get()
   ```

2. **读取现有记录的_openid**
   ```javascript
   const records = await db.collection('collection-name').get()
   records.data.forEach(record => {
     console.log('用户ID:', record._openid)  // ✅ 可以读取
   })
   ```

### ❌ 错误用法

1. **手动设置_openid**
   ```javascript
   await db.collection('collection-name').add({
     data: {
       _openid: 'some-openid',  // ❌ 错误：不能手动设置
       otherField: 'value'
     }
   })
   ```

2. **在查询条件中指定_openid**
   ```javascript
   const res = await db.collection('collection-name').where({
     _openid: 'some-openid'  // ❌ 错误：查询会自动过滤
   }).get()
   ```

## 🔒 数据库权限设置

为了确保数据安全，建议将集合权限设置为：

```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

这样设置后：
- 用户只能读取自己的数据
- 用户只能修改自己的数据
- `_openid` 字段会自动添加和验证

## 🧪 测试验证

修复后，以下操作应该正常工作：

1. **添加新记录**
   ```javascript
   await db.collection('b-measure').add({
     data: {
       date: '2024-01-01',
       measurements: { weight: { value: 8.0, unit: 'kg' } }
       // _openid 会自动添加
     }
   })
   ```

2. **查询记录**
   ```javascript
   const records = await db.collection('b-measure').get()
   // 只会返回当前用户的记录
   ```

3. **更新记录**
   ```javascript
   await db.collection('b-measure').doc(docId).update({
     data: {
       measurements: { weight: { value: 8.5, unit: 'kg' } }
       // 不需要也不能设置_openid
     }
   })
   ```

## 📝 注意事项

1. **自动权限控制**: 云开发会自动根据当前登录用户的 openid 进行权限控制
2. **数据隔离**: 不同用户的数据会自动隔离，无需手动处理
3. **系统字段**: `_openid` 是系统字段，还有 `_id`、`_updateTime` 等也是系统管理的
4. **兼容性**: 这个修复不会影响现有数据，只是修正了数据操作方式

## ✅ 修复验证

修复完成后，保存数据应该能够正常工作，不再出现 `Invalid Key Name: _openid` 错误。 