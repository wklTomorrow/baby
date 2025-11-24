// pages/add-record/add-record.js
import { saveRecord, generateId, getRecords } from "../../utils/storage";
import { formatTime, getToday } from "../../utils/date";

Page({
  data: {
    recordId: "", // 编辑时的记录ID
    date: "",
    photos: [],
    video: "",
    text: "",
    availableTags: [
      { name: "日常", selected: false },
      { name: "第一次", selected: false },
      { name: "里程碑", selected: false },
      { name: "成长", selected: false },
      { name: "趣事", selected: false },
      { name: "节日", selected: false },
    ],
    saving: false,
    _id: "",
  },

  onLoad(options) {
    console.log("添加记录页加载，参数：", options);
    const date = options.date || getToday();
    const recordId = options.id;

    console.log("日期：", date, "记录ID：", recordId);

    this.setData({ date });

    // 如果是编辑模式，加载记录数据
    if (recordId) {
      this.loadRecord(recordId);
    }
  },

  // 加载记录数据（编辑模式）
  async loadRecord(id) {
    try {
      const records = await getRecords();
      const record = records.find((r) => r._id === id || r.id === id);

      if (record) {
        const selectedTags = this.data.availableTags.map((tag) => ({
          ...tag,
          selected: record.tags && record.tags.includes(tag.name),
        }));

        this.setData({
        _id: record._id,
        recordId: id,
        date: record.date,
        photos: record.photos || [],
        video: record.video || "",
        text: record.text || "",
          availableTags: selectedTags,
        });
      }
    } catch (error) {
      console.error('加载记录失败:', error);
      wx.showToast({
        title: '加载记录失败',
        icon: 'none'
      });
    }
  },

  // 选择照片
  choosePhoto() {
    const remaining = 9 - this.data.photos.length;
    if (remaining <= 0) {
      wx.showToast({
        title: "最多只能添加9张照片",
        icon: "none",
      });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempFiles = res.tempFiles.map((file) => file.tempFilePath);
        this.setData({
          photos: [...this.data.photos, ...tempFiles],
        });
      },
      fail: (err) => {
        console.error("选择照片失败", err);
      },
    });
  },

  // 预览照片
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos,
    });
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.photos];
    photos.splice(index, 1);
    this.setData({ photos });
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 选择视频
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["video"],
      sourceType: ["album", "camera"],
      maxDuration: 60,
      success: (res) => {
        this.setData({
          video: res.tempFiles[0].tempFilePath,
        });
      },
      fail: (err) => {
        console.error("选择视频失败", err);
      },
    });
  },

  // 删除视频
  deleteVideo() {
    this.setData({ video: "" });
  },

  // 文字输入
  onTextInput(e) {
    this.setData({
      text: e.detail.value,
    });
  },

  // 切换标签
  toggleTag(e) {
    const name = e.currentTarget.dataset.name;
    const availableTags = this.data.availableTags.map((tag) => {
      if (tag.name === name) {
        return { ...tag, selected: !tag.selected };
      }
      return tag;
    });
    this.setData({ availableTags });
  },

  // 上传文件到云存储
  async uploadFile(tempFilePath, fileType = 'image') {
    const app = getApp();
    if (!app.globalData.openid) {
      console.error('未登录，无法上传文件');
      return tempFilePath; // 未登录时返回临时路径
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const ext = tempFilePath.match(/\.\w+$/)?.[0] || '.jpg';
    const cloudPath = `${fileType}s/${app.globalData.openid}/${timestamp}_${randomStr}${ext}`;

    try {
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      });
      console.log('文件上传成功:', uploadResult);
      return uploadResult.fileID; // 返回云存储文件ID
    } catch (error) {
      console.error('文件上传失败:', error);
      wx.showToast({
        title: '文件上传失败',
        icon: 'none',
      });
      return tempFilePath; // 上传失败时返回临时路径
    }
  },

  // 批量上传图片
  async uploadPhotos(tempPhotos) {
    const uploadedPhotos = [];
    
    // 显示上传进度
    wx.showLoading({
      title: '上传图片中...',
    });

    try {
      for (let i = 0; i < tempPhotos.length; i++) {
        const fileID = await this.uploadFile(tempPhotos[i], 'image');
        uploadedPhotos.push(fileID);
        
        // 更新上传进度
        const progress = Math.floor((i + 1) / tempPhotos.length * 100);
        wx.showLoading({
          title: `上传图片中...${progress}%`,
        });
      }
      
      return uploadedPhotos;
    } finally {
      wx.hideLoading();
    }
  },



  // 保存记录
  async saveRecord() {
    const { photos, video, text, date, recordId, availableTags, _id } = this.data;

    // 验证至少有一种内容
    if (photos.length === 0 && !video && !text.trim()) {
      wx.showToast({
        title: "请至少添加照片、视频或文字",
        icon: "none",
      });
      return;
    }

    this.setData({ saving: true });

    const selectedTags = availableTags
      .filter((tag) => tag.selected)
      .map((tag) => tag.name);

    const now = new Date();

    // 初始化createTime为当前时间
    let createTime = Date.now();

    // 如果是编辑模式，获取原记录的创建时间
    if (recordId) {
      try {
        const records = await getRecords();
        const existingRecord = records.find(
          (r) => r._id === recordId || r.id === recordId
        );
        if (existingRecord && existingRecord.createTime) {
          createTime = existingRecord.createTime;
        }
      } catch (error) {
        console.error("获取记录创建时间失败:", error);
        // 出错时仍使用当前时间，不影响保存
      }
    }

    // 上传图片和视频到云存储
    let uploadedPhotos = [];
    let uploadedVideo = '';
    
    try {
      // 上传图片
      if (photos.length > 0) {
        uploadedPhotos = await this.uploadPhotos(photos);
      }
      
      // 上传视频
      if (video) {
        uploadedVideo = await this.uploadFile(video, 'video');
      }
    } catch (error) {
      console.error('文件上传过程中出错:', error);
      this.setData({ saving: false });
      wx.showToast({
        title: '文件上传失败，请重试',
        icon: 'none',
      });
      return;
    }

    const record = {
      id: recordId || generateId(),
      date: date,
      time: formatTime(now),
      photos: uploadedPhotos,
      video: uploadedVideo || undefined,
      text: text.trim(),
      tags: selectedTags,
      createTime: createTime,
      updateTime: Date.now(),
      _id: _id,
    };

    try {
      await saveRecord(record);
      
      this.setData({ saving: false });

      wx.showToast({
        title: "保存成功",
        icon: "success",
      });

      setTimeout(() => {
        // 使用事件通知上一页需要刷新数据
        const pages = getCurrentPages();
        if (pages.length > 1) {
          const prevPage = pages[pages.length - 2];
          // 触发上一页的刷新方法（如果存在）
          if (prevPage && typeof prevPage.loadRecords === "function") {
            prevPage.loadRecords();
          }
        }
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error("保存记录失败:", error);
      this.setData({ saving: false });
      wx.showToast({
        title: "保存失败，请重试",
        icon: "none",
      });
    }
  },
});
