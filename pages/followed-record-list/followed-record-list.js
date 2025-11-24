// pages/followed-record-list/followed-record-list.js
import { formatDateChinese } from '../../utils/date';

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
    loading: false,
    babyId: '',
    babyName: '',
  },

  onLoad(options) {
    try {
      console.log('followed-record-list页面参数:', options);
      
      const babyId = options.babyId;
      const babyName = options.babyName;
      
      if (babyId) {
        this.setData({ 
          babyId, 
          babyName: babyName ? decodeURIComponent(babyName) : '关注的宝宝'
        });
        console.log('设置的页面数据:', { babyId, babyName: this.data.babyName });
        
        // 设置页面标题
        const title = `${decodeURIComponent(babyName || '关注的宝宝')}的记录`;
        console.log('设置页面标题:', title);
        
        wx.setNavigationBarTitle({ 
          title: title,
          success: function() {
            console.log('页面标题设置成功');
          },
          fail: function(err) {
            console.error('页面标题设置失败:', err);
          }
        });
      } else {
        console.error('没有收到babyId参数');
        wx.showToast({
          title: '缺少必要参数',
          icon: 'none'
        });
      }
      
      // 延迟执行loadRecords，确保页面初始化完成
      setTimeout(() => {
        console.log('开始加载记录');
        this.loadRecords();
      }, 100);
      
    } catch (error) {
      console.error('页面加载异常:', error);
      wx.showToast({
        title: '页面加载失败',
        icon: 'none'
      });
    }
  },

  onShow() {
    // 每次显示时刷新列表
    this.loadRecords();
  },

  // 加载记录
  async loadRecords() {
    try {
      this.setData({ loading: true });
      
      console.log('开始调用云函数查询记录，babyId:', this.data.babyId, 'filter:', this.data.currentFilter);
      
      // 调用云函数查询所有记录，不局限于当前openid
      const result = await wx.cloud.callFunction({
        name: 'getBabyRecords',
        data: {
          babyId: this.data.babyId,
          filter: this.data.currentFilter === 'all' ? '' : this.data.currentFilter
        }
      });
      
      console.log('云函数调用结果:', result);
      
      // 处理云函数返回的结果
      let records = [];
      if (result.result && result.result.code === 200) {
        records = result.result.data || [];
        console.log('云函数返回的记录数量:', records.length);
      } else {
        console.error('云函数调用失败:', result.result?.message || '未知错误');
        wx.showToast({
          title: result.result?.message || '获取记录失败',
          icon: 'none'
        });
      }

      // 根据筛选条件过滤（云函数已做初步筛选，但保留本地过滤逻辑以确保一致性）
      const filteredRecords = this.filterRecords(records, this.data.currentFilter);

      // 按日期分组
      const grouped = this.groupRecordsByDate(filteredRecords);
      
      this.setData({ 
        groupedRecords: grouped,
        loading: false
      });
    } catch (error) {
      console.error('加载记录失败:', error);
      this.setData({ 
        groupedRecords: [],
        loading: false
      });
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
    console.log('跳转到记录详情页，记录ID:', id);
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?id=${id}&source=followed-record-list`,
      success: function(res) {
        console.log('跳转成功:', res);
      },
      fail: function(err) {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },
});