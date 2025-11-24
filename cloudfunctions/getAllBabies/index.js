// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { keyword, babyId } = event
    console.log('收到的参数:', { keyword, babyId })
    
    // 查询所有宝宝数据，不考虑openid限制
    let query = db.collection('babies')
    
    // 构建查询条件
    if (babyId) {
      // 如果指定了babyId，则优先按babyId查询
      query = query.where({
        babyId: babyId
      })
    } else if (keyword && keyword.trim()) {
      // 否则按关键词搜索nickname
      const regexp = keyword.trim()
      query = query.where({
        nickname: db.RegExp({
          regexp: regexp,
          options: 'i', // 不区分大小写
        })
      })
    }
    
    // 执行查询
    const result = await query.get()
    console.log('查询结果:', result)
    
    return {
      success: true,
      babies: result.data,
      count: result.data.length
    }
  } catch (error) {
    console.error('获取宝宝数据失败:', error)
    return {
      success: false,
      error: error.message,
      babies: []
    }
  }
}