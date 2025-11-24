// pages/index/index.js
import { getRecordsByDate, getRecordDates } from "../../utils/storage";
import {
  getToday,
  getFirstDayWeekday,
  getDaysInMonth,
  formatDateChinese,
  isToday,
  parseDate,
} from "../../utils/date";

Page({
  data: {
    currentYear: 2024,
    currentMonth: 1,
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    calendarDays: [],
    todayDateText: "",
    todayRecords: [],
  },

  onLoad() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
    });

    // 监听登录状态变化
    const app = getApp();
    this.loginStatusListener = function () {
      console.log("检测到登录状态变化，更新日历");
      this.updateCalendarAsync();
      this.updateTodayInfoAsync();
    }.bind(this);

    // 将监听器设置到全局登录回调
    app.globalData.loginCallback = this.loginStatusListener;

    // 首次加载时检查登录状态
    this.checkAndUpdateData();
  },

  onShow() {
    // 每次显示时检查登录状态并更新数据
    this.checkAndUpdateData();
  },

  // 检查登录状态并更新数据
  checkAndUpdateData() {
    const app = getApp();
    console.log("检查登录状态并更新数据，openid:", app.globalData.openid);
    this.updateCalendarAsync();
    this.updateTodayInfoAsync();
  },

  onUnload() {
    // 清理监听器
    const app = getApp();
    if (this.loginStatusListener && app.globalData) {
      // 移除可能的监听器（根据app.js实际实现调整）
      console.log("清理登录状态监听器");
    }
  },

  // 更新日历（异步版本）
  async updateCalendarAsync() {
    try {
      const { currentYear, currentMonth } = this.data;
      console.log("开始更新日历，检查记录日期...");

      // 检查登录状态
      const app = getApp();
      console.log("登录状态:", {
        openid: app.globalData.openid ? "已登录" : "未登录",
        hasBabyInfo: app.globalData.babyInfo ? "有宝宝信息" : "无宝宝信息",
      });

      // 只有在登录成功后才获取记录日期
      let recordDatesArray = [];
      if (app.globalData.openid) {
        recordDatesArray = await getRecordDates();
        console.log("获取到的记录日期数量:", recordDatesArray.length);
        console.log("记录日期列表:", recordDatesArray);
      } else {
        console.log("用户未登录，不获取记录日期");
      }

      const recordDates = new Set(recordDatesArray);
      const today = getToday();

      // 获取月份第一天是星期几
      const firstDayWeekday = getFirstDayWeekday(currentYear, currentMonth);
      // 获取月份天数
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);

      const calendarDays = [];

      // 添加上个月的日期（填充空白）
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevMonthDays = getDaysInMonth(prevYear, prevMonth);

      const padZero = (num) => {
        return num < 10 ? "0" + num : String(num);
      };

      for (let i = firstDayWeekday - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = `${prevYear}-${padZero(prevMonth)}-${padZero(day)}`;
        calendarDays.push({
          date,
          day,
          isToday: isToday(date),
          isCurrentMonth: false,
          hasRecord: recordDates.has(date),
        });
      }

      // 添加当前月的日期
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${padZero(currentMonth)}-${padZero(day)}`;
        calendarDays.push({
          date,
          day,
          isToday: isToday(date),
          isCurrentMonth: true,
          hasRecord: recordDates.has(date),
        });
      }

      // 添加下个月的日期（填充到42个格子）
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const remainingDays = 42 - calendarDays.length;

      for (let day = 1; day <= remainingDays; day++) {
        const date = `${nextYear}-${padZero(nextMonth)}-${padZero(day)}`;
        calendarDays.push({
          date,
          day,
          isToday: isToday(date),
          isCurrentMonth: false,
          hasRecord: recordDates.has(date),
        });
      }

      this.setData({ calendarDays });
    } catch (error) {
      console.error("更新日历失败", error);
      // 出错时使用空的Set继续执行
      this.setData({ calendarDays: [] });
    }
  },

  // 保留原有的updateCalendar方法作为兼容
  updateCalendar() {
    // 直接调用异步版本
    this.updateCalendarAsync();
  },

  // 更新今日信息（异步版本）
  async updateTodayInfoAsync() {
    try {
      const today = getToday();
      const todayDate = parseDate(today);
      const todayDateText = formatDateChinese(today);

      // 只有在登录成功后才获取今日记录
      let todayRecords = [];
      const app = getApp();
      if (app.globalData.openid) {
        todayRecords = await getRecordsByDate(today);
      } else {
        console.log("用户未登录，不获取今日记录");
      }

      this.setData({
        todayDateText,
        todayRecords,
      });
    } catch (error) {
      console.error("更新今日信息失败", error);
      this.setData({
        todayRecords: [],
      });
    }
  },

  // 保留原有的updateTodayInfo方法作为兼容
  updateTodayInfo() {
    // 直接调用异步版本
    this.updateTodayInfoAsync();
  },

  // 上一月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentMonth = 12;
      currentYear--;
    } else {
      currentMonth--;
    }
    this.setData({ currentYear, currentMonth });
    this.updateCalendarAsync();
  },

  // 下一月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear++;
    } else {
      currentMonth++;
    }
    this.setData({ currentYear, currentMonth });
    this.updateCalendarAsync();
  },

  // 回到今天
  goToToday() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
    });
    this.updateCalendarAsync();
  },

  // 点击日期
  async onDayTap(e) {
    try {
      const app = getApp();
      // 检查登录状态
      if (!app.globalData.openid) {
        console.log("用户未登录，提示登录");
        wx.showToast({
          title: "请先登录",
          icon: "none",
        });
        return;
      }

      const date = e.currentTarget.dataset.date;
      const records = await getRecordsByDate(date);
      console.log("查询到的记录:", records);

      if (records.length === 0) {
        // 如果没有记录，跳转到添加记录页
        wx.navigateTo({
          url: `/pages/add-record/add-record?date=${date}`,
        });
      } else if (records.length) {
        console.log(records);
        // 如果只有一条记录，直接跳转到详情页
        wx.navigateTo({
          url: `/pages/record-detail/record-detail?id=${records[0].id}`,
        });
      } else {
        // 如果有多条记录，跳转到列表页（筛选该日期）
        wx.navigateTo({
          url: `/pages/record-list/record-list?date=${date}`,
        });
      }
    } catch (error) {
      console.error("点击日期操作失败", error);
      wx.showToast({
        title: "操作失败",
        icon: "none",
      });
    }
  },

  // 查看今日记录
  viewTodayRecords() {
    wx.switchTab({
      url: "/pages/record-list/record-list",
    });
  },

  // 添加记录
  addRecord() {
    console.log("点击添加记录按钮");
    const today = getToday();
    console.log("跳转到添加记录页，日期：", today);
    wx.navigateTo({
      url: `/pages/add-record/add-record?date=${today}`,
      success: () => {
        console.log("跳转成功");
      },
      fail: (err) => {
        console.error("跳转失败", err);
        wx.showToast({
          title: "跳转失败，请重试",
          icon: "none",
        });
      },
    });
  },

  // 跳转到个人中心
  goToProfile() {
    wx.switchTab({
      url: "/pages/profile/profile",
    });
  },
});
