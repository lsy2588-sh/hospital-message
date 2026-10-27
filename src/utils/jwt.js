const jwt = require('jsonwebtoken');
const config = require('../config');

const ALGORITHM = 'HS256'; // 固定签名/校验算法，防止算法混淆攻击（安全加固 S4）

const sign = (payload) => jwt.sign(payload, config.jwtSecret, { algorithm: ALGORITHM, expiresIn: config.jwtExpiresIn });

const verify = (token) => jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });

module.exports = { sign, verify };
