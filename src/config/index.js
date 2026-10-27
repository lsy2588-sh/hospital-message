require('dotenv').config();

const DEFAULT_DEV_SECRET = 'dev_secret_please_change';
const jwtSecret = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

// 生产环境强制使用强密钥，避免弱默认值被用于签发/校验 JWT（安全加固 S1）
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET || jwtSecret.length < 32) {
    throw new Error('生产环境必须设置强 JWT_SECRET（长度 >= 32 位随机字符串），请检查 .env 配置');
  }
} else if (process.env.JWT_SECRET === undefined) {
  console.warn('[WARN] 未配置 JWT_SECRET，正在使用开发默认密钥，仅限本地开发使用。');
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
