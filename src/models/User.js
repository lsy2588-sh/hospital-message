const mockDb = require('./mockDb');
const { hashPassword } = require('../utils/password');
const { genId } = require('../utils/idGenerator');

// User 模型：封装用户相关数据操作
class User {
  static findById(id) {
    return mockDb.findById('users', id);
  }

  static findByUsername(username) {
    return mockDb.findUserByUsername(username);
  }

  static create({ username, password, role }) {
    const user = {
      id: genId('u_'),
      username,
      password_hash: hashPassword(password),
      role,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    mockDb.insert('users', user);
    return user;
  }

  // 去除敏感字段（密码哈希）后再返回前端
  static toSafe(user) {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  }
}

module.exports = User;
