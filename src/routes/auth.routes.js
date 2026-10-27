const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login } = require('../controllers/auth.controller');
const { requiredFields, passwordMin } = require('../middlewares/validate');

// 登录/注册接口限流，防止暴力破解弱口令（安全加固 S2）
// skipSuccessfulRequests：仅统计失败请求（密码错误等），登录成功不计入，不影响正常使用
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  limit: Number(process.env.RATE_LIMIT_MAX) || 20, // 每 IP 每分钟最多失败 20 次
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
});

router.post('/register', authLimiter, requiredFields('username', 'password', 'name'), passwordMin(6), register);
router.post('/login', authLimiter, requiredFields('username', 'password'), login);

module.exports = router;
