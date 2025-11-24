// pages/baby-info/baby-info.js
import { formatDate } from '../../utils/date';

const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    babyInfo: {
      nickname: '宝宝',
      birthday: '',
      avatar: '',
    },
    maxDate: formatDate(new Date()),
    saving: false,
  },

  onLoad() {
    // 优先从云数据库获取宝宝信息
    if (app.globalData.openid) {
      wx.showLoading({ title: '加载中...' });
      db.collection('babies').where({
        _openid: app.globalData.openid
      }).get().then(res => {
        if (res.data.length > 0) {
          // 创建新对象并移除_openid字段
          const babyInfo = { ...res.data[0] };
          delete babyInfo._openid;
          
          this.setData({ babyInfo });
          // 更新全局数据
          app.globalData.babyInfo = babyInfo;
        } else if (app.globalData.babyInfo) {
          // 如果数据库中没有但全局数据中有，则使用全局数据
          this.setData({ babyInfo: app.globalData.babyInfo });
        }
      }).catch(err => {
        console.error('获取宝宝信息失败', err);
        // 出错时，只使用全局数据
        if (app.globalData.babyInfo) {
          this.setData({ babyInfo: app.globalData.babyInfo });
        }
      }).finally(() => {
        wx.hideLoading();
      });
    } else if (app.globalData.babyInfo) {
      // 没有登录但全局数据中有宝宝信息，则使用全局数据
      this.setData({ babyInfo: app.globalData.babyInfo });
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const avatar = res.tempFiles[0].tempFilePath;
        this.setData({
          'babyInfo.avatar': avatar,
        });
      },
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      'babyInfo.nickname': e.detail.value,
    });
  },

  // 出生日期选择
  onBirthdayChange(e) {
    this.setData({
      'babyInfo.birthday': e.detail.value,
    });
  },

  // 保存宝宝信息
  saveBabyInfo() {
    const { babyInfo } = this.data;
    
    if (!babyInfo.nickname.trim()) {
      wx.showToast({
        title: '请输入宝宝昵称',
        icon: 'none',
      });
      return;
    }

    this.setData({ saving: true });

    // 检查是否已有宝宝ID，如果没有则生成新的
    if (!babyInfo.babyId) {
      // 调用云函数生成唯一宝宝ID
      wx.cloud.callFunction({
        name: 'generateBabyId',
        success: res => {
          const babyId = res.result.babyId;
          babyInfo.babyId = babyId;
          this.saveToDatabase(babyInfo);
        },
        fail: err => {
          console.error('生成宝宝ID失败', err);
          wx.showToast({
            title: '生成宝宝ID失败',
            icon: 'none',
          });
          this.setData({ saving: false });
        }
      });
    } else {
      // 已有宝宝ID，直接保存
      this.saveToDatabase(babyInfo);
    }
  },
  
  // 保存到数据库
  saveToDatabase(babyInfo) {
    const _this = this;
    
    // 创建一个新对象，确保移除可能存在的_openid字段（这是云开发保留字段）
    const babyInfoToSave = { ...babyInfo };
    delete babyInfoToSave._openid;
    delete babyInfoToSave._id; // 也移除_id字段，避免更新时的冲突
    
    // 先查找是否已有宝宝信息
    db.collection('babies').where({
      _openid: app.globalData.openid
    }).get().then(res => {
      if (res.data.length > 0) {
        // 更新已有宝宝信息
        const babyId = res.data[0]._id;
        return db.collection('babies').doc(babyId).update({
          data: {
            ...babyInfoToSave,
            updatedAt: db.serverDate()
          }
        });
      } else {
        // 添加新宝宝信息
        return db.collection('babies').add({
          data: {
            ...babyInfoToSave,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      }
    }).then(() => {
      // 更新全局数据
      app.globalData.babyInfo = babyInfo;
      
      wx.showToast({
        title: '保存成功',
        icon: 'success',
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }).catch(err => {
      console.error('保存宝宝信息失败', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    }).finally(() => {
      _this.setData({ saving: false });
    });
  },
});

