// pages/record-detail/record-detail.js
import { deleteRecord } from '../../utils/storage';
import { formatDateTime } from '../../utils/date';

Page({
  data: {
    recordId: '',
    record: {},
    dateTimeText: '',
    source: '', // 来源页面标识
    isFromFollowedList: false, // 是否来自关注列表（用于控制按钮显示）
  },

  async onLoad(options) {
    try {
      console.log('记录详情页参数:', options);
      const recordId = options.id;
      const source = options.source || '';
      
      if (recordId) {
        this.setData({ 
          recordId,
          source,
          isFromFollowedList: source === 'followed-record-list'
        });
        
        console.log('页面设置:', { 
          recordId,
          source,
          isFromFollowedList: this.data.isFromFollowedList 
        });
        
        await this.loadRecord(recordId);
      } else {
        console.error('缺少记录ID参数');
        wx.showToast({
          title: '缺少记录ID',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('页面加载异常:', error);
      wx.showToast({
        title: '页面加载失败',
        icon: 'none'
      });
    }
  },

  // 加载记录 - 使用云函数获取记录详情，支持非当前用户的记录
  async loadRecord(id) {
    try {
      console.log('开始调用云函数获取记录详情，记录ID:', id);
      
      // 调用云函数查询记录详情
      const result = await wx.cloud.callFunction({
        name: 'getRecordDetail',
        data: {
          babyId: id
        }
      });
      
      console.log('云函数调用结果:', result);
      
      // 处理云函数返回的结果
      if (result.result && result.result.code === 200 && result.result.data) {
        const record = result.result.data[0];
        console.log('获取到的记录详情:', record);
        
        const dateTimeText = formatDateTime(record.date, record.time);
        this.setData({
          record,
          dateTimeText,
        });
      } else {
        console.error('获取记录详情失败:', result.result?.message || '未知错误');
        wx.showToast({
          title: result.result?.message || '记录不存在',
          icon: 'none',
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('加载记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  // 预览照片
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.record.photos[index],
      urls: this.data.record.photos,
    });
  },

  // 分享记录 - 只有非关注列表来源的页面才显示
  shareRecord() {
    if (this.data.isFromFollowedList) {
      console.log('来自关注列表，不允许分享');
      return;
    }
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    });
  },

  // 编辑记录 - 只有非关注列表来源的页面才显示
  editRecord() {
    if (this.data.isFromFollowedList) {
      console.log('来自关注列表，不允许编辑');
      wx.showToast({
        title: '只能编辑自己的记录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/add-record/add-record?id=${this.data.recordId}`,
    });
  },

  // 删除记录 - 只有非关注列表来源的页面才显示
  deleteRecord() {
    if (this.data.isFromFollowedList) {
      console.log('来自关注列表，不允许删除');
      wx.showToast({
        title: '只能删除自己的记录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteRecord(this.data.recordId);
            wx.showToast({
              title: '删除成功',
              icon: 'success',
            });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            console.error('删除记录失败:', error);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  // 分享给好友 - 只有非关注列表来源的页面才允许分享
  onShareAppMessage() {
    if (this.data.isFromFollowedList) {
      console.log('来自关注列表，不允许分享');
      // 返回空对象，禁止分享
      return {};
    }
    
    const { record } = this.data;
    return {
      title: `成长时光盒 - ${record.text || '记录美好瞬间'}`,
      path: `/pages/record-detail/record-detail?id=${record.id}`,
      imageUrl: record.photos && record.photos.length > 0 ? record.photos[0] : '',
    };
  },
});

