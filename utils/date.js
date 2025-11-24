// 日期工具类

// 格式化日期为 YYYY-MM-DD
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const monthStr = month.length === 1 ? '0' + month : month;
  const dayStr = day.length === 1 ? '0' + day : day;
  return `${year}-${monthStr}-${dayStr}`;
}

// 格式化时间为 HH:mm
export function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hoursStr = hours < 10 ? '0' + hours : String(hours);
  const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
  return `${hoursStr}:${minutesStr}`;
}

// 获取今天的日期字符串
export function getToday() {
  return formatDate(new Date());
}

// 解析日期字符串为Date对象
export function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

// 获取月份的第一天
export function getFirstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1);
}

// 获取月份的最后一天
export function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0);
}

// 获取月份的天数
export function getDaysInMonth(year, month) {
  return getLastDayOfMonth(year, month).getDate();
}

// 获取月份的第一天是星期几 (0=周日, 1=周一, ...)
export function getFirstDayWeekday(year, month) {
  return getFirstDayOfMonth(year, month).getDay();
}

// 格式化日期显示（中文）
export function formatDateChinese(dateStr) {
  const date = parseDate(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

// 格式化日期时间显示
export function formatDateTime(dateStr, timeStr) {
  return `${formatDateChinese(dateStr)} ${timeStr}`;
}

// 判断两个日期是否是同一天
export function isSameDay(date1, date2) {
  return date1 === date2;
}

// 判断日期是否是今天
export function isToday(dateStr) {
  return dateStr === getToday();
}

// 获取日期差（天数）
export function getDaysDiff(date1, date2) {
  const d1 = parseDate(date1).getTime();
  const d2 = parseDate(date2).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

