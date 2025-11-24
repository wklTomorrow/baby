// 统计工具类
import { getRecords, getRecordDates } from './storage';
import { getToday } from './date';

// 计算统计数据
export async function calculateStatistics() {
  try {
    const records = await getRecords();
    const recordDates = await getRecordDates();
    
    let totalPhotos = 0;
    let totalVideos = 0;
    
    records.forEach(record => {
      totalPhotos += record.photos?.length || 0;
      if (record.video) {
        totalVideos += 1;
      }
    });
    
    // 计算连续记录天数
    let consecutiveDays = 0;
    if (recordDates.length > 0) {
      const today = getToday();
      let currentDate = today;
      consecutiveDays = 1;
      
      // 如果今天没有记录，从昨天开始计算
      if (!recordDates.includes(today)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        currentDate = yesterday.toISOString().split('T')[0];
        consecutiveDays = 0;
      }
      
      // 从今天往前计算连续天数
      for (let i = 1; i < 365; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().split('T')[0];
        
        if (recordDates.includes(checkDateStr)) {
          consecutiveDays++;
        } else {
          break;
        }
      }
    }
    
    return {
      totalDays: recordDates.length,
      totalPhotos,
      totalVideos,
      totalRecords: records.length,
      consecutiveDays,
    };
  } catch (error) {
    console.error('计算统计数据失败:', error);
    // 返回默认值
    return {
      totalDays: 0,
      totalPhotos: 0,
      totalVideos: 0,
      totalRecords: 0,
      consecutiveDays: 0,
    };
  }
}

