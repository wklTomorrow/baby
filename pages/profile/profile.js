// pages/profile/profile.js
import { calculateStatistics } from '../../utils/statistics';
import { getFollowedBabies } from '../../utils/storage';

const app = getApp();

Page({
  data: {
    babyInfo: {
      nickname: '宝宝',
      birthday: '',
      avatar: '',
    },
    statistics: {
      totalDays: 0,
      totalPhotos: 0,
      totalVideos: 0,
      totalRecords: 0,
      consecutiveDays: 0,
    },
    followedBabies: [],
  },

  onLoad() {
    this.loadBabyInfo();
    this.loadStatistics(); // 异步方法，不需要await
    this.loadFollowedBabies();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadBabyInfo();
    this.loadStatistics(); // 异步方法，不需要await
    this.loadFollowedBabies();
  },

  // 加载宝宝信息
  loadBabyInfo() {
    // 直接从app.globalData获取宝宝信息，不再使用本地缓存
    const babyInfo = app.globalData.babyInfo;
    if (babyInfo) {
      this.setData({ babyInfo });
    }
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const statistics = await calculateStatistics();
      this.setData({ statistics });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      // 使用默认值
      this.setData({
        statistics: {
          totalDays: 0,
          totalPhotos: 0,
          totalVideos: 0,
          totalRecords: 0,
          consecutiveDays: 0,
        }
      });
    }
  },

  // 编辑宝宝信息
  editBabyInfo() {
    wx.navigateTo({
      url: '/pages/baby-info/baby-info',
    });
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于成长时光盒',
      content: '一款温馨的宝宝成长记录小程序，帮助父母记录和珍藏宝宝生活中的每一个珍贵瞬间。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // 加载关注的宝宝列表
  async loadFollowedBabies() {
    try {
      const babies = await getFollowedBabies();
      // 计算年龄和格式化关注时间
      const formattedBabies = babies.map(baby => {
        // 计算年龄
        let age = 0;
        let month = 0;
        if (baby.birthday) {
          const birthDate = new Date(baby.birthday);
          const now = new Date();
          let months = (now.getFullYear() - birthDate.getFullYear()) * 12;
          months -= birthDate.getMonth();
          months += now.getMonth();
          if (now.getDate() < birthDate.getDate()) {
            months--;
          }
          age = Math.floor(months / 12);
          month = months % 12;
        }
        
        // 格式化关注时间
        let followTimeFormat = '';
        if (baby.followTime) {
          const followDate = new Date(baby.followTime);
          followTimeFormat = `${followDate.getFullYear()}-${String(followDate.getMonth() + 1).padStart(2, '0')}-${String(followDate.getDate()).padStart(2, '0')}`;
        }
        
        return {
          ...baby,
          age,
          month,
          followTimeFormat
        };
      });
      
      this.setData({ followedBabies: formattedBabies });
    } catch (error) {
      console.error('加载关注列表失败:', error);
      this.setData({ followedBabies: [] });
    }
  },

  // 查看宝宝记录
  viewBabyRecords(e) {
    const { babyId, babyName } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/record-list/record-list?babyId=${babyId}&babyName=${encodeURIComponent(babyName)}`,
    });
  },
});

