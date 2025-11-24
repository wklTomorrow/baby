// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 创建users集合
    await createCollection('users')
    // 创建babies集合
    await createCollection('babies')
    // 创建records集合
    await createCollection('records')
    // 创建follows集合
    await createCollection('follows')
    
    // 创建索引
    await createIndexes()
    
    return {
      success: true,
      message: '数据库集合初始化成功'
    }
  } catch (error) {
    console.error('数据库集合初始化失败', error)
    return {
      success: false,
      message: '数据库集合初始化失败',
      error: error.message
    }
  }
}

// 创建集合的辅助函数
async function createCollection(collectionName) {
  try {
    // 尝试获取集合信息，如果不存在则会抛出错误
    await db.collection(collectionName).get()
    console.log(`集合 ${collectionName} 已存在`)
  } catch (error) {
    // 集合不存在，尝试创建
    try {
      await db.createCollection(collectionName)
      console.log(`集合 ${collectionName} 创建成功`)
    } catch (createError) {
      // 可能是权限问题或其他原因，输出提示信息
      console.log(`集合 ${collectionName} 创建失败或无权限创建，请在云开发控制台手动创建`)
    }
  }
}

// 创建索引的辅助函数
async function createIndexes() {
  try {
    // 为records集合创建索引，方便按时间和宝宝ID查询
    await db.collection('records').createIndex({
      babyId: 1,
      date: -1
    })
    
    // 为follows集合创建索引，方便查询用户的关注列表和粉丝列表
    await db.collection('follows').createIndex({
      followerId: 1,
      followedId: 1
    })
    
    // 为follows集合创建复合唯一索引，确保一个用户不能重复关注同一个宝宝
    try {
      await db.collection('follows').createIndex({
        followerId: 1,
        followedId: 1
      }, {
        unique: true
      })
    } catch (uniqueIndexError) {
      console.log('唯一索引创建失败，可能已存在', uniqueIndexError)
    }
    
    console.log('索引创建成功')
  } catch (error) {
    console.log('索引创建失败或无权限创建，请在云开发控制台手动创建')
  }
}