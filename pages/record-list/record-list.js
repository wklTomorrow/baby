// pages/record-list/record-list.js
import { getRecords, getRecordsByDate, getRecordsByBabyId } from '../../utils/storage';
import { formatDateChinese, getToday } from '../../utils/date';

Page({
  data: {
    filters: [
      { type: 'all', label: '全部' },
      { type: 'photo', label: '照片' },
      { type: 'video', label: '视频' },
      { type: 'text', label: '文字' },
    ],
    currentFilter: 'all',
    groupedRecords: [],
    filterDate: '', // 筛选特定日期
    babyId: '', // 指定宝宝ID
    babyName: '', // 指定宝宝名称
  },

  onLoad(options) {
    const date = options.date;
    const babyId = options.babyId;
    const babyName = options.babyName;
    
    if (date) {
      this.setData({ filterDate: date });
    }
    
    if (babyId) {
      this.setData({ 
        babyId, 
        babyName: babyName ? decodeURIComponent(babyName) : '宝宝'
      });
      // 设置页面标题
      wx.setNavigationBarTitle({ 
        title: `${decodeURIComponent(babyName || '宝宝')}的记录` 
      });
    }
    
    this.loadRecords();
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadRecords();
  },

  // 加载记录
  async loadRecords() {
    try {
      let records = [];
      
      if (this.data.babyId) {
        // 如果指定了宝宝ID，加载该宝宝的所有记录
        records = await getRecordsByBabyId(this.data.babyId);
        
        // 如果同时指定了日期，进一步筛选
        if (this.data.filterDate) {
          records = records.filter(record => record.date === this.data.filterDate);
        }
      } else if (this.data.filterDate) {
        // 如果只指定了日期，加载该日期的记录
        records = await getRecordsByDate(this.data.filterDate);
      } else {
        // 否则加载所有记录
        records = await getRecords();
      }

      // 根据筛选条件过滤
      records = this.filterRecords(records, this.data.currentFilter);

      // 按日期分组
      const grouped = this.groupRecordsByDate(records);
      
      this.setData({ groupedRecords: grouped });
    } catch (error) {
      console.error('加载记录失败:', error);
      this.setData({ groupedRecords: [] });
      wx.showToast({
        title: '加载记录失败',
        icon: 'none'
      });
    }
  },

  // 筛选记录
  filterRecords(records, filter) {
    if (filter === 'all') {
      return records;
    }
    
    return records.filter(record => {
      if (filter === 'photo') {
        return record.photos && record.photos.length > 0;
      }
      if (filter === 'video') {
        return !!record.video;
      }
      if (filter === 'text') {
        return !!record.text && record.text.trim().length > 0;
      }
      return true;
    });
  },

  // 按日期分组
  groupRecordsByDate(records) {
    const groups = new Map();
    
    records.forEach(record => {
      if (!groups.has(record.date)) {
        groups.set(record.date, []);
      }
      
      // 添加缩略图
      const recordWithThumbnail = { ...record };
      if (record.photos && record.photos.length > 0) {
        recordWithThumbnail.thumbnail = record.photos[0];
      } else if (record.video) {
        // 视频缩略图需要从视频中提取，这里暂时用占位符
        recordWithThumbnail.thumbnail = record.video;
      }
      
      const list = groups.get(record.date);
      if (list) {
        list.push(recordWithThumbnail);
      }
    });
    
    // 转换为数组并排序
    const result = Array.from(groups.entries())
      .map(([date, records]) => ({
        date,
        dateText: formatDateChinese(date),
        records: records.sort((a, b) => {
          const timeA = new Date(`${a.date} ${a.time}`).getTime();
          const timeB = new Date(`${b.date} ${b.time}`).getTime();
          return timeB - timeA; // 倒序
        }),
      }))
      .sort((a, b) => {
        // 按日期倒序
        return b.date.localeCompare(a.date);
      });
    
    return result;
  },

  // 筛选标签点击
  onFilterTap(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentFilter: type });
    this.loadRecords();
  },

  // 查看记录
  viewRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?id=${id}`,
    });
  },

  // 添加记录
  addRecord() {
    // 只有查看自己宝宝的记录时才显示添加记录按钮
    if (!this.data.babyId) {
      const today = getToday();
      wx.navigateTo({
        url: `/pages/add-record/add-record?date=${today}`,
      });
    }
  },
});

