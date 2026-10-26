require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_please_change',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
