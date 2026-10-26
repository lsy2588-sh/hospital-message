const { verify } = require('../utils/jwt');
const { fail } = require('../utils/response');

// 鉴权中间件：解析 JWT，注入 req.user（{ userId, username, role }）
const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, '未登录', 401);
  try {
    req.user = verify(token);
    next();
  } catch (err) {
    return fail(res, '登录已失效，请重新登录', 401);
  }
};

module.exports = auth;
