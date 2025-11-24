// pages/follow/follow.js
Page({
  data: {
    keyword: '',
    searchResults: [],
    hasSearched: false,
    followedBabies: [],
    loadingFollowed: false
  },

  onLoad() {
    // 检查登录状态
    this.checkLoginStatus();
    // 检查并创建follows表
    this.checkAndCreateFollowsCollection();
  },

  // 检查并创建follows表
  async checkAndCreateFollowsCollection() {
    try {
      const db = wx.cloud.database();
      // 尝试查询follows表
      await db.collection('follows').count();
      console.log('follows表已存在');
    } catch (error) {
      console.log('follows表不存在，尝试创建');
      wx.showLoading({ title: '初始化关注功能...' });
      try {
        // 调用创建follows表的云函数
        const result = await wx.cloud.callFunction({
          name: 'createFollowsCollection'
        });
        if (result.result.success) {
          console.log('follows表创建成功');
        } else {
          console.error('follows表创建失败', result.result.error);
          // 即使创建失败也继续，可能用户需要手动在云开发控制台创建
        }
      } catch (createError) {
        console.error('调用创建follows表云函数失败', createError);
      } finally {
        wx.hideLoading();
      }
    }
  },

  onShow() {
    // 每次显示页面时清空搜索状态
    this.setData({
      keyword: '',
      searchResults: [],
      hasSearched: false
    });
    // 获取已关注的宝宝列表
    this.getFollowedBabies();
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp();
    if (!app.globalData.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
  },

  // 搜索输入变化
  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  // 清除搜索内容
  onClearSearch() {
    this.setData({
      keyword: '',
      searchResults: [],
      hasSearched: false
    });
  },

  // 执行搜索
  async onSearchConfirm() {
    const { keyword } = this.data;
    if (!keyword.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    // 检查登录状态
    const app = getApp();
    if (!app.globalData.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '搜索中...' });
    try {
      // 使用云函数获取所有宝宝数据，云函数拥有更高权限
      const getBabiesResult = await wx.cloud.callFunction({
        name: 'getAllBabies',
        data: {
          keyword: keyword.trim()
        }
      });
      
      console.log('云函数返回结果:', getBabiesResult.result);
      
      // 直接使用云函数返回的搜索结果
      const searchResults = getBabiesResult.result.babies || [];
      console.log('搜索结果:', searchResults);
      console.log('搜索结果数量:', searchResults.length);

      // 已在前面设置searchResults变量

      // 计算宝宝年龄
      const now = new Date();
      const resultsWithAge = searchResults.map(baby => {
        if (baby.birthDate) {
          const birthDate = new Date(baby.birthDate);
          const age = (now - birthDate) / (365 * 24 * 60 * 60 * 1000);
          return {
            ...baby,
            age: age < 1 ? age.toFixed(1) : Math.floor(age)
          };
        }
        return {
          ...baby,
          age: '未知'
        };
      });

      this.setData({
        searchResults: resultsWithAge,
        hasSearched: true
      });
    } catch (error) {
      console.error('搜索宝宝失败', error);
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 获取已关注的宝宝列表
  async getFollowedBabies() {
    const app = getApp();
    if (!app.globalData.openid) {
      return;
    }

    this.setData({ loadingFollowed: true });
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      // 查询当前用户关注的宝宝
      const followsResult = await db.collection('follows').where({
        _openid: app.globalData.openid
      }).get();

      if (followsResult.data.length === 0) {
        this.setData({ 
          followedBabies: [],
          loadingFollowed: false 
        });
        return;
      }

      // 提取所有关注的babyId
      const babyIds = followsResult.data.map(f => f.babyId);
      
      // 存储所有查询到的宝宝信息
      const babies = [];
      
      // 由于云函数已支持按babyId查询，我们逐个查询每个baby的信息
      // 这里可以根据实际情况调整批量查询的策略
      for (const babyId of babyIds) {
        try {
          const babyResult = await wx.cloud.callFunction({
            name: 'getAllBabies',
            data: {
              babyId: babyId
            }
          });
          
          if (babyResult.result.success && babyResult.result.babies && babyResult.result.babies.length > 0) {
            babies.push(babyResult.result.babies[0]);
          }
        } catch (error) {
          console.error(`查询宝宝ID ${babyId} 失败:`, error);
        }
      }
      
      console.log('查询到的已关注宝宝信息:', babies);
      
      // 计算宝宝年龄
      const now = new Date();
      const babiesWithAge = babies.map(baby => {
        if (baby.birthDate) {
          const birthDate = new Date(baby.birthDate);
          const age = (now - birthDate) / (365 * 24 * 60 * 60 * 1000);
          return {
            ...baby,
            age: age < 1 ? age.toFixed(1) : Math.floor(age)
          };
        }
        return {
          ...baby,
          age: '未知'
        };
      });

      this.setData({
        followedBabies: babiesWithAge,
        loadingFollowed: false
      });
    } catch (error) {
      console.error('获取已关注宝宝失败', error);
      this.setData({ loadingFollowed: false });
    }
  },

  // 取消关注
  async onUnfollowTap(e) {
    const { babyId } = e.currentTarget.dataset;
    const app = getApp();

    wx.showLoading({ title: '处理中...' });
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 删除关注记录
      await db.collection('follows').where({
        _openid: app.globalData.openid,
        babyId: babyId
      }).remove();

      // 更新页面数据
      const newFollowedBabies = this.data.followedBabies.filter(baby => 
        baby.babyId !== babyId && baby._id !== babyId
      );
      this.setData({ followedBabies: newFollowedBabies });

      wx.showToast({ title: '已取消关注' });
    } catch (error) {
      console.error('取消关注失败', error);
      wx.showToast({
        title: '取消关注失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 点击关注按钮
  async onFollowTap(e) {
    const { baby } = e.currentTarget.dataset;
    const app = getApp();
    
    // 检查登录状态
    if (!app.globalData.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否是自己的宝宝
    if (baby._openid === app.globalData.openid) {
      wx.showToast({
        title: '不能关注自己的宝宝',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '关注中...' });

    try {
      const db = wx.cloud.database();
      
      // 查询是否已经关注
      const followResult = await db.collection('follows').where({
        _openid: app.globalData.openid,
        babyId: baby.babyId || baby._id
      }).get();

      if (followResult.data.length > 0) {
        wx.showToast({
          title: '已经关注过了',
          icon: 'none'
        });
        return;
      }

      // 添加关注记录
      await db.collection('follows').add({
        data: {
          babyId: baby.babyId || baby._id,
          babyName: baby.babyName || baby.nickname,
          createdAt: db.serverDate()
        }
      });

      wx.showToast({
        title: '关注成功',
        icon: 'success'
      });

      // 延迟一下然后切换到我的页面
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/profile/profile'
        });
      }, 1500);
    } catch (error) {
      console.error('关注失败', error);
      wx.showToast({
        title: '关注失败，请重试',
        icon: 'none'
      });
    } finally {
    wx.hideLoading();
  }
},

  // 点击已关注的宝宝项
  onBabyItemTap(e) {
    const { baby } = e.currentTarget.dataset;
    // 跳转到关注记录列表页面
    wx.navigateTo({
      url: `/pages/followed-record-list/followed-record-list?babyId=${baby.babyId}&babyName=${encodeURIComponent(baby.nickname || '宝宝')}`
    });
  }
});