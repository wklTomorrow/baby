// app.js
App({
  globalData: {
    babyInfo: null,
    userInfo: null,
    openid: null,
    loginCallback: null // 登录成功回调函数
  },
  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: 'cloud1-5gpkw3np16041d95', // 默认环境ID，用户需要在实际使用时替换为自己的环境ID
      traceUser: true
    });
    
    // 首先初始化数据库集合
    this.initDatabase().then(() => {
      // 获取用户OpenID并进行登录
      this.login();
    }).catch(err => {
      console.error('数据库初始化失败', err);
      // 即使数据库初始化失败，仍尝试登录
      this.login();
    });
  },
  
  // 初始化数据库集合
  async initDatabase() {
    try {
      await wx.cloud.callFunction({
        name: 'initDB'
      });
      console.log('数据库初始化成功');
    } catch (error) {
      console.error('调用initDB云函数失败', error);
      throw error;
    }
  },
  
  // 登录并获取用户信息
  async login() {
    wx.showLoading({ title: '登录中...' });
    
    try {
      // 获取用户OpenID
      const res = await wx.cloud.callFunction({
        name: 'login'
      });
      
      const openid = res.result.openid;
      this.globalData.openid = openid;
      
      // 登录成功，触发回调
      if (this.globalData.loginCallback) {
        console.log('触发登录成功回调');
        this.globalData.loginCallback();
      }
      
      // 检查用户是否已注册
      const db = wx.cloud.database();
      try {
        // 简化查询方式，直接使用_openid字段查询
        const userResult = await db.collection('users').where({
          _openid: openid
        }).get();

        console.log('用户查询结果:', userResult, 'openid:', openid);
        
        if (userResult.data && userResult.data.length === 0) {
          // 用户未注册，创建新用户
          try {
            // 尝试获取用户信息
            try {
              const userRes = await wx.getUserProfile({
                desc: '用于完善会员资料'
              });
              
              await db.collection('users').add({
                data: {
                  userInfo: userRes.userInfo,
                  hasUserInfo: true,
                  createdAt: db.serverDate(),
                  updatedAt: db.serverDate()
                }
              });
              
              this.globalData.userInfo = userRes.userInfo;
              console.log('用户注册成功(含用户信息)');
            } catch (authError) {
              // 用户拒绝授权时，创建一个基本用户记录
              await db.collection('users').add({
                data: {
                  userInfo: null,
                  hasUserInfo: false,
                  createdAt: db.serverDate(),
                  updatedAt: db.serverDate()
                }
              });
              console.log('用户注册成功(基本记录)');
            }
          } catch (error) {
            console.error('创建用户记录失败:', error);
          }
        } else {
          // 用户已注册
          if (userResult.data && userResult.data[0] && userResult.data[0].userInfo) {
            this.globalData.userInfo = userResult.data[0].userInfo;
          } else {
            console.log('用户数据格式异常:', userResult.data);
          }
        }
      } catch (queryError) {
        console.error('查询用户信息失败:', queryError);
        // 查询失败时不阻止后续操作
      }
      
      // 获取宝宝信息
      await this.getBabyInfo();
      
      // 只有在没有宝宝信息时才跳转到宝宝维护页
      const currentPages = getCurrentPages();
      const currentPage = currentPages[currentPages.length - 1];
      if (!this.globalData.babyInfo && (!currentPage || currentPage.route !== 'pages/baby-info/baby-info')) {
        wx.navigateTo({ url: '/pages/baby-info/baby-info' });
      }
    } catch (err) {
      console.error('登录失败', err);
      // 如果云函数调用失败，创建一个login云函数
      wx.showModal({
        title: '提示',
        content: '请先在微信开发者工具中创建login云函数',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  // 从数据库获取宝宝信息
  async getBabyInfo() {
    if (!this.globalData.openid) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      db.collection('babies').where({
        _openid: this.globalData.openid
      }).get().then(res => {
        console.log('宝宝信息查询结果:', res);
        if (res.data && res.data.length > 0) {
          // 创建新对象并移除_openid字段，避免后续操作中误用
          const babyInfo = { ...res.data[0] };
          delete babyInfo._openid;
          delete babyInfo._id; // 也移除_id字段
          
          this.globalData.babyInfo = babyInfo;
        } else {
          // 如果没有宝宝信息，检查当前是否已经在宝宝维护页
          const currentPages = getCurrentPages();
          const currentPage = currentPages[currentPages.length - 1];
          if (!currentPage || currentPage.route !== 'pages/baby-info/baby-info') {
            wx.navigateTo({ url: '/pages/baby-info/baby-info' });
          }
        }
        resolve(res);
      }).catch(err => {
        console.error('获取宝宝信息失败', err);
        resolve(null); // 即使失败也继续执行，不抛出异常
      });
    });
  },
  
  // 初始化宝宝信息（不再使用本地缓存）
  initBabyInfo() {
    // 不再从本地缓存获取宝宝信息，完全依赖数据库
    console.log('宝宝信息初始化完成');
  },
});

