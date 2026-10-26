const { fail } = require('../utils/response');

// 校验请求体中必填字段
const requiredFields = (...fields) => (req, res, next) => {
  for (const f of fields) {
    const v = req.body[f];
    if (v === undefined || v === null || v === '') return fail(res, `字段 ${f} 不能为空`, 400);
  }
  next();
};

// 校验密码长度（若存在 password 字段）
const passwordMin = (n) => (req, res, next) => {
  const p = req.body.password;
  if (p !== undefined && (typeof p !== 'string' || p.length < n)) return fail(res, `密码长度至少 ${n} 位`, 400);
  next();
};

module.exports = { requiredFields, passwordMin };
