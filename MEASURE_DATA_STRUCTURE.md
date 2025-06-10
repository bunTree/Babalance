# 测量数据结构说明

## 数据库集合：b-measure

### 数据结构

```javascript
{
  "_id": "自动生成的文档ID",
  "openid": "用户的openid",
  "date": "2024-01-15",           // 记录日期 (YYYY-MM-DD格式)
  "datetime": "2024-01-15 14:30:25", // 记录时间
  "timestamp": 1705123825000,     // 时间戳
  "measurements": {               // 测量数据
    "height": {                   // 身高
      "value": 68.5,
      "unit": "cm"
    },
    "weight": {                   // 体重
      "value": 8.2,
      "unit": "kg"
    },
    "head": {                     // 头围
      "value": 42.5,
      "unit": "cm"
    }
  },
  "createTime": "2024-01-15T06:30:25.123Z", // 创建时间
  "updateTime": "2024-01-15T06:30:25.123Z"  // 更新时间
}
```

### 数据特性

1. **每日唯一性**：每个用户每天只能有一条记录
2. **覆盖机制**：如果用户在同一天多次记录，新数据会覆盖旧数据
3. **部分更新**：用户可以只填写部分测量项（身高、体重、头围）
4. **本地+云端**：数据同时保存在本地存储和云数据库

### 本地存储

- **存储键名**：`measureRecords`
- **数据格式**：与云端格式相同的数组
- **去重机制**：按日期查找并覆盖

### 查询逻辑

```javascript
// 云端查询当天记录
const queryResult = await collection.where({
  openid: app.globalData.openid,
  date: measureRecord.date
}).get()

// 更新或新增
if (queryResult.data && queryResult.data.length > 0) {
  // 更新现有记录
  await collection.doc(docId).update({ data: updateData })
} else {
  // 新增记录
  await collection.add({ data: newData })
}
```

### 数据权限

- 数据库权限设置：**仅创建者可读写**
- 用户只能访问自己的测量记录
- 通过 openid 进行数据隔离 