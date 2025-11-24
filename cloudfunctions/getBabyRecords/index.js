// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { babyId, filter = '' } = event;
    
    // 验证必需参数
    if (!babyId) {
      return {
        code: 400,
        message: '缺少必要参数 babyId',
        data: null
      };
    }
    
    console.log('查询参数:', { babyId, filter });
    
    // 构建基础查询条件
    let query = db.collection('records').where({
      babyId: babyId
    });
    
    // 执行查询，按日期和时间降序排序
    const { data: records } = await query
      .orderBy('date', 'desc')
      .orderBy('time', 'desc')
      .get();
    
    console.log('查询到的记录数量:', records.length);
    
    // 根据筛选条件过滤记录
    let filteredRecords = records;
    if (filter && filter !== '全部') {
      filteredRecords = records.filter(record => {
        // 根据不同类型的记录进行筛选
        switch (filter) {
          case '喂养':
            return record.type === 'feeding';
          case '睡眠':
            return record.type === 'sleep';
          case '排便':
            return record.type === 'poop';
          case '成长':
            return record.type === 'growth';
          case '其他':
            return record.type === 'other';
          default:
            return true;
        }
      });
    }
    
    console.log('筛选后的记录数量:', filteredRecords.length);
    
    return {
      code: 200,
      message: '查询成功',
      data: filteredRecords
    };
  } catch (error) {
    console.error('查询记录失败:', error);
    return {
      code: 500,
      message: '查询失败',
      data: null,
      error: error.message
    };
  }
};