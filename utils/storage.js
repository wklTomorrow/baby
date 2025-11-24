// 存储工具类
const db = wx.cloud.database();

// 获取所有记录
export async function getRecords() {
  const app = getApp();

  // 只从云数据库获取，不使用缓存
  if (app.globalData.openid) {
    try {
      // 构建查询条件
      const queryCondition = {
        _openid: app.globalData.openid
      };
      
      // 如果有宝宝信息，添加babyId条件
      if (app.globalData.babyInfo && app.globalData.babyInfo.babyId) {
        queryCondition.babyId = app.globalData.babyInfo.babyId;
      }
      
      const res = await db
        .collection("records")
        .where(queryCondition)
        .orderBy("date", "desc")
        .orderBy("time", "desc")
        .get();

      return res.data || [];
    } catch (e) {
      console.error("从云数据库获取记录失败", e);
      // 失败时返回空数组，不使用缓存
      return [];
    }
  } else {
    // 未登录时，返回空数组
    return [];
  }
}

// 保存记录
export async function saveRecord(record) {
  const app = getApp();

  // 生成唯一记录ID
  let recordWithId = { ...record };
  if (!recordWithId._id) {
    try {
      const result = await wx.cloud.callFunction({
        name: "generateRecordId",
      });
      if (result.result && result.result.success) {
        recordWithId._id = result.result.recordId;
      } else {
        // 如果云函数调用成功但返回格式异常，使用本地生成的ID
        recordWithId._id = generateId();
      }
    } catch (e) {
      console.error("生成记录ID失败", e);
      // 失败时使用本地生成的ID
      recordWithId._id = generateId();
    }
    // 新增记录时设置创建时间
    recordWithId.createTime = Date.now();
  }
  // 无论新增还是更新，都更新修改时间
  recordWithId.updateTime = Date.now();

  console.log("保存记录:", recordWithId);

  // 只保存到云数据库，不使用本地缓存
  if (app.globalData.openid) {
    try {
      // 如果有宝宝信息，添加babyId（_openid由云开发自动填充，无需手动设置）
      if (app.globalData.babyInfo && app.globalData.babyInfo.babyId) {
        recordWithId.babyId = app.globalData.babyInfo.babyId;
      }

      // 检查是否为更新操作（已存在_id）
      const existingRecords = await db
        .collection("records")
        .where({
          _id: recordWithId._id,
          _openid: app.globalData.openid,
        })
        .count();

      console.log("检查更新记录存在:", existingRecords);

      if (existingRecords.total > 0) {
        // 更新现有记录
        await db
          .collection("records")
          .doc(recordWithId._id)
          .update({
            data: {
              date: recordWithId.date,
              time: recordWithId.time,
              photos: recordWithId.photos,
              video: recordWithId.video,
              text: recordWithId.text,
              tags: recordWithId.tags,
              updateTime: recordWithId.updateTime,
              // 如果有babyId，也更新它
              ...(recordWithId.babyId && { babyId: recordWithId.babyId })
            },
          });
      } else {
        // 新增记录
        await db.collection("records").add({
          data: recordWithId,
        });
      }

      return true;
    } catch (e) {
      console.error("保存到云数据库失败", e);
      // 失败时返回false，不保存到本地
      return false;
    }
  } else {
    // 未登录时，无法保存
    console.error("未登录，无法保存记录");
    return false;
  }
}

// 删除记录
export async function deleteRecord(id) {
  const app = getApp();

  // 只从云数据库删除，不使用本地缓存
  if (app.globalData.openid) {
    try {
      await db.collection("records").doc(id).remove();
      return true;
    } catch (e) {
      console.error("从云数据库删除记录失败", e);
      // 失败时返回false，不更新本地缓存
      return false;
    }
  } else {
    // 未登录时，无法删除
    console.error("未登录，无法删除记录");
    return false;
  }
}

// 根据日期获取记录
export async function getRecordsByDate(date) {
  try {
    const records = await getRecords();
    return records.filter((r) => r.date === date);
  } catch (e) {
    console.error("根据日期获取记录失败", e);
    return [];
  }
}

// 获取有记录的日期列表
export async function getRecordDates() {
  try {
    const records = await getRecords();
    const dates = new Set();
    records.forEach((r) => dates.add(r.date));
    return Array.from(dates).sort((a, b) => {
      return new Date(b) - new Date(a);
    });
  } catch (e) {
    console.error("获取记录日期失败", e);
    return [];
  }
}

// 保存宝宝信息 - 现在直接更新全局变量，不使用缓存
export function saveBabyInfo(babyInfo) {
  try {
    // 更新全局变量
    const app = getApp();
    app.globalData.babyInfo = babyInfo;
    return true;
  } catch (e) {
    console.error("保存宝宝信息失败", e);
    return false;
  }
}

// 获取宝宝信息 - 现在直接从全局变量获取，不使用缓存
export function getBabyInfo() {
  try {
    const app = getApp();
    return app.globalData.babyInfo || null;
  } catch (e) {
    console.error("获取宝宝信息失败", e);
    return null;
  }
}

// 生成唯一ID
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 关注宝宝
export async function followBaby(babyId, babyName) {
  const app = getApp();
  
  if (!app.globalData.openid) {
    console.error('未登录，无法关注宝宝');
    return false;
  }
  
  try {
    // 检查是否已经关注
    const db = wx.cloud.database();
    const followResult = await db.collection('follows').where({
      _openid: app.globalData.openid,
      babyId: babyId
    }).get();
    
    if (followResult.data.length > 0) {
      console.log('已经关注过该宝宝');
      return true; // 已关注视为成功
    }
    
    // 添加关注记录
    await db.collection('follows').add({
      data: {
        babyId: babyId,
        babyName: babyName,
        createdAt: db.serverDate()
      }
    });
    
    return true;
  } catch (error) {
    console.error('关注宝宝失败', error);
    return false;
  }
}

// 取消关注宝宝
export async function unfollowBaby(babyId) {
  const app = getApp();
  
  if (!app.globalData.openid) {
    console.error('未登录，无法取消关注');
    return false;
  }
  
  try {
    const db = wx.cloud.database();
    const result = await db.collection('follows').where({
      _openid: app.globalData.openid,
      babyId: babyId
    }).remove();
    
    return result.stats.removed > 0;
  } catch (error) {
    console.error('取消关注宝宝失败', error);
    return false;
  }
}

// 获取关注的宝宝列表
export async function getFollowedBabies() {
  const app = getApp();
  
  if (!app.globalData.openid) {
    console.error('未登录，无法获取关注列表');
    return [];
  }
  
  try {
    const db = wx.cloud.database();
    const followsResult = await db.collection('follows')
      .where({
        _openid: app.globalData.openid
      })
      .orderBy('createdAt', 'desc')
      .get();
    
    // 获取每个宝宝的详细信息
    const followedBabies = [];
    for (const follow of followsResult.data) {
      const babyResult = await db.collection('babies').where({
        babyId: follow.babyId
      }).get();
      
      if (babyResult.data.length > 0) {
        followedBabies.push({
          ...babyResult.data[0],
          followId: follow._id,
          followTime: follow.createdAt
        });
      }
    }
    
    return followedBabies;
  } catch (error) {
    console.error('获取关注列表失败', error);
    return [];
  }
}

// 检查是否已关注指定宝宝
export async function isFollowing(babyId) {
  const app = getApp();
  
  if (!app.globalData.openid) {
    return false;
  }
  
  try {
    const db = wx.cloud.database();
    const result = await db.collection('follows').where({
      _openid: app.globalData.openid,
      babyId: babyId
    }).count();
    
    return result.total > 0;
  } catch (error) {
    console.error('检查关注状态失败', error);
    return false;
  }
}

// 根据宝宝ID获取记录
export async function getRecordsByBabyId(babyId) {
  const app = getApp();
  
  if (!app.globalData.openid) {
    console.error('未登录，无法获取记录');
    return [];
  }
  
  try {
    const db = wx.cloud.database();
    const res = await db.collection('records')
      .where({
        babyId: babyId
      })
      .orderBy('date', 'desc')
      .orderBy('time', 'desc')
      .get();
    
    return res.data || [];
  } catch (error) {
    console.error('获取宝宝记录失败', error);
    return [];
  }
}
