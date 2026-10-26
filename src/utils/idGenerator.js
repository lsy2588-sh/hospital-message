let counter = 0;

// 生成全局唯一 ID（内存阶段使用，接入真实数据库后由数据库自增/雪花算法替代）
const genId = (prefix = '') => {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
};

// 生成业务单号，如 registration_no / payment_no
const genNo = (prefix = '') => {
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
  counter += 1;
  return `${prefix}${stamp}${String(counter).padStart(4, '0')}`;
};

module.exports = { genId, genNo };
