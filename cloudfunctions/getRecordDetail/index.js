// 云函数入口文件
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { recordId } = event;

    // 验证必需参数
    if (!recordId) {
      return {
        code: 400,
        message: "缺少必要参数 recordId",
        data: null,
      };
    }

    console.log("查询记录详情参数:", { recordId });

    // 查询记录详情
    const record = await db
      .collection("records")
      .where({
        id: recordId,
      })
      .get();

    console.log("查询到的记录详情:", record.data);

    return {
      code: 200,
      message: "查询成功",
      data: record.data,
    };
  } catch (error) {
    console.error("查询记录详情失败:", error);
    return {
      code: 500,
      message: "查询失败",
      data: null,
      error: error.message,
    };
  }
};
