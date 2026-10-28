// ============================================================
// 审计中间件：在每次请求响应完成时，自动记录一条审计日志
// 记录内容：调用者（userId/username/role）、方法、路径、状态码、时间
// ============================================================
const auditLog = require('../models/auditLog');

const audit = (req, res, next) => {
  res.on('finish', () => {
    // 只记录 /api 接口，跳过健康检查（避免噪音）
    // 注意：res 完成时 req.path 已被 router 改写（去掉了 /api 前缀），
    // 必须用不会被改写的 req.originalUrl 判断
    const url = req.originalUrl || req.url || '';
    if (!url.startsWith('/api/') || url === '/api/health') return;

    const user = req.user || null;
    let username = user ? user.username : null;
    // 登录接口即使失败也记录「尝试的用户名」，便于审计暴力破解
    if (!username && req.body && typeof req.body.username === 'string') {
      username = req.body.username;
    }

    auditLog.record({
      user_id: user ? user.userId : null,
      username,
      role: user ? user.role : null,
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
    });
  });
  next();
};

module.exports = audit;
