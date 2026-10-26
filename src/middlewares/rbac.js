const { fail } = require('../utils/response');

// 依赖注入式鉴权：传入允许的角色数组，返回中间件
// 用法：router.post('/prescriptions', requireRole('doctor'), ctrl.create);
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return fail(res, '未登录', 401);
  if (!allowedRoles.includes(req.user.role)) return fail(res, '无权限访问', 403);
  next();
};

module.exports = { requireRole };
