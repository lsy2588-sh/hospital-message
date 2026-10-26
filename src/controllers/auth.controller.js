const User = require('../models/User');
const mockDb = require('../models/mockDb');
const { comparePassword } = require('../utils/password');
const { sign } = require('../utils/jwt');
const { genId } = require('../utils/idGenerator');
const { success, fail } = require('../utils/response');

// 患者注册：创建 User(role=patient) + Patient
const register = (req, res) => {
  const { username, password, name, gender, age, phone, id_card } = req.body;

  if (User.findByUsername(username)) return fail(res, '用户名已存在', 400);

  const user = User.create({ username, password, role: 'patient' });

  mockDb.insert('patients', {
    id: genId('pat_'),
    user_id: user.id,
    name,
    gender: gender || 'M',
    age: age || 0,
    phone: phone || '',
    id_card: id_card || '',
    created_at: new Date().toISOString(),
  });

  success(res, User.toSafe(user), '注册成功', 201);
};

// 登录：校验用户名 + bcrypt 密码，返回 JWT
const login = (req, res) => {
  const { username, password } = req.body;
  const user = User.findByUsername(username);

  if (!user || !comparePassword(password, user.password_hash)) {
    return fail(res, '用户名或密码错误', 401);
  }
  if (user.status !== 'ACTIVE') return fail(res, '账号已被禁用', 403);

  const token = sign({ userId: user.id, username: user.username, role: user.role });
  success(res, { token, user: User.toSafe(user) }, '登录成功');
};

module.exports = { register, login };
