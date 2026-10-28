const mockDb = require('../models/mockDb');
const User = require('../models/User');
const auditLog = require('../models/auditLog');
const { genId } = require('../utils/idGenerator');
const { success, fail } = require('../utils/response');
const { deptName, doctorName } = require('../utils/helpers');

const now = () => new Date().toISOString();
const isNonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const enrichDoctor = (d) => {
  const user = User.findById(d.user_id);
  return {
    ...d,
    specialty: d.specialty || '',
    department_name: deptName(d.department_id),
    username: user ? user.username : null,
    status: user ? user.status : null,
  };
};

const enrichSchedule = (s) => ({
  ...s,
  doctor_name: doctorName(s.doctor_id),
  department_name: deptName(s.department_id),
});

const normalizeDepartment = (d) => ({ ...d, location: d.location || '' });

const listDepartments = (req, res) => success(res, mockDb.all('departments').map(normalizeDepartment));

const createDepartment = (req, res) => {
  const { name, location, description } = req.body;
  if (!isNonEmpty(name)) return fail(res, '科室名称不能为空', 400);
  const trimmed = name.trim();
  if (mockDb.findOne('departments', (d) => d.name === trimmed)) {
    return fail(res, '科室名称已存在', 400);
  }
  const dept = mockDb.insert('departments', {
    id: genId('dept_'),
    name: trimmed,
    location: isNonEmpty(location) ? location.trim() : '',
    description: description === undefined ? '' : String(description),
    created_at: now(),
  });
  success(res, dept, '创建成功', 201);
};

const updateDepartment = (req, res) => {
  const dept = mockDb.findById('departments', req.params.id);
  if (!dept) return fail(res, '科室不存在', 404);

  const { name, location, description } = req.body;
  const patch = {};
  if (name !== undefined) {
    if (!isNonEmpty(name)) return fail(res, '科室名称不能为空', 400);
    const trimmed = name.trim();
    const dup = mockDb.findOne('departments', (d) => d.name === trimmed && d.id !== dept.id);
    if (dup) return fail(res, '科室名称已存在', 400);
    patch.name = trimmed;
  }
  if (location !== undefined) patch.location = String(location);
  if (description !== undefined) patch.description = String(description);
  if (Object.keys(patch).length === 0) return fail(res, '没有可更新的字段', 400);

  success(res, mockDb.update('departments', dept.id, patch), '更新成功');
};

const deleteDepartment = (req, res) => {
  const dept = mockDb.findById('departments', req.params.id);
  if (!dept) return fail(res, '科室不存在', 404);
  const usedByDoctor = mockDb.findOne('doctors', (d) => d.department_id === dept.id);
  const usedBySchedule = mockDb.findOne('schedules', (s) => s.department_id === dept.id);
  if (usedByDoctor || usedBySchedule) return fail(res, '该科室下存在医生或排班，无法删除', 400);

  mockDb.remove('departments', dept.id);
  success(res, null, '删除成功');
};

const listDoctors = (req, res) => {
  const { departmentId } = req.query;
  let list = mockDb.all('doctors');
  if (departmentId) list = list.filter((d) => d.department_id === departmentId);
  success(res, list.map(enrichDoctor));
};

const createDoctor = (req, res) => {
  const { username, password, name, title, department_id, specialty, phone } = req.body;
  if (!isNonEmpty(username)) return fail(res, '用户名不能为空', 400);
  if (!isNonEmpty(password) || password.length < 6) return fail(res, '密码长度至少 6 位', 400);
  if (!isNonEmpty(name)) return fail(res, '医生姓名不能为空', 400);

  const dept = mockDb.findById('departments', department_id);
  if (!dept) return fail(res, '科室不存在', 404);
  if (User.findByUsername(username.trim())) return fail(res, '用户名已存在', 400);

  const user = User.create({ username: username.trim(), password, role: 'doctor' });
  const doctor = mockDb.insert('doctors', {
    id: genId('doc_'),
    user_id: user.id,
    name: name.trim(),
    title: isNonEmpty(title) ? title.trim() : '',
    department_id: dept.id,
    specialty: isNonEmpty(specialty) ? specialty.trim() : '',
    phone: isNonEmpty(phone) ? phone.trim() : '',
    created_at: now(),
  });
  success(res, enrichDoctor(doctor), '创建成功', 201);
};

const updateDoctor = (req, res) => {
  const doctor = mockDb.findById('doctors', req.params.id);
  if (!doctor) return fail(res, '医生不存在', 404);

  const { name, title, department_id, specialty, phone, status } = req.body;
  const patch = {};
  if (name !== undefined) {
    if (!isNonEmpty(name)) return fail(res, '医生姓名不能为空', 400);
    patch.name = name.trim();
  }
  if (title !== undefined) patch.title = String(title);
  if (specialty !== undefined) patch.specialty = String(specialty);
  if (phone !== undefined) patch.phone = String(phone);
  if (department_id !== undefined) {
    if (!mockDb.findById('departments', department_id)) return fail(res, '科室不存在', 404);
    patch.department_id = department_id;
  }
  if (status !== undefined && status !== 'ACTIVE' && status !== 'DISABLED') {
    return fail(res, '账号状态只能为 ACTIVE 或 DISABLED', 400);
  }
  if (Object.keys(patch).length === 0 && status === undefined) {
    return fail(res, '没有可更新的字段', 400);
  }

  if (status !== undefined) mockDb.update('users', doctor.user_id, { status });
  const updated = Object.keys(patch).length > 0 ? mockDb.update('doctors', doctor.id, patch) : doctor;
  success(res, enrichDoctor(updated), '更新成功');
};

const deleteDoctor = (req, res) => {
  const doctor = mockDb.findById('doctors', req.params.id);
  if (!doctor) return fail(res, '医生不存在', 404);
  const usedBySchedule = mockDb.findOne('schedules', (s) => s.doctor_id === doctor.id);
  const usedByRegistration = mockDb.findOne('registrations', (r) => r.doctor_id === doctor.id);
  if (usedBySchedule || usedByRegistration) return fail(res, '该医生存在排班或挂号记录，无法删除', 400);

  mockDb.remove('doctors', doctor.id);
  mockDb.remove('users', doctor.user_id);
  success(res, null, '删除成功');
};

const listSchedules = (req, res) => {
  const { doctorId, departmentId, date } = req.query;
  let list = mockDb.all('schedules');
  if (doctorId) list = list.filter((s) => s.doctor_id === doctorId);
  if (departmentId) list = list.filter((s) => s.department_id === departmentId);
  if (date) list = list.filter((s) => s.work_date === date);
  success(res, list.map(enrichSchedule));
};

const findDuplicateSchedule = (doctorId, workDate, timeSlot, excludeId) =>
  mockDb.findOne(
    'schedules',
    (s) => s.doctor_id === doctorId && s.work_date === workDate && s.time_slot === timeSlot && s.id !== excludeId
  );

const createSchedule = (req, res) => {
  const { doctor_id, work_date, time_slot, total_num, status } = req.body;
  const doctor = mockDb.findById('doctors', doctor_id);
  if (!doctor) return fail(res, '医生不存在', 404);
  if (!isDate(work_date)) return fail(res, '排班日期格式应为 YYYY-MM-DD', 400);
  if (time_slot !== 'AM' && time_slot !== 'PM') return fail(res, '班次只能为 AM 或 PM', 400);
  if (!isInt(total_num) || total_num < 0) return fail(res, '总号源必须为非负整数', 400);
  if (status !== undefined && status !== 'AVAILABLE' && status !== 'CLOSED') {
    return fail(res, '排班状态只能为 AVAILABLE 或 CLOSED', 400);
  }
  if (findDuplicateSchedule(doctor.id, work_date, time_slot, null)) {
    return fail(res, '该医生当天该班次已存在排班', 400);
  }

  const schedule = mockDb.insert('schedules', {
    id: genId('sch_'),
    doctor_id: doctor.id,
    department_id: doctor.department_id,
    work_date,
    time_slot,
    total_num,
    remaining_num: total_num,
    status: status || 'AVAILABLE',
    created_at: now(),
  });
  success(res, enrichSchedule(schedule), '创建成功', 201);
};

const updateSchedule = (req, res) => {
  const schedule = mockDb.findById('schedules', req.params.id);
  if (!schedule) return fail(res, '排班不存在', 404);

  const { doctor_id, work_date, time_slot, total_num, remaining_num, status } = req.body;
  const patch = {};

  if (doctor_id !== undefined) {
    const doctor = mockDb.findById('doctors', doctor_id);
    if (!doctor) return fail(res, '医生不存在', 404);
    patch.doctor_id = doctor.id;
    patch.department_id = doctor.department_id;
  }
  if (work_date !== undefined) {
    if (!isDate(work_date)) return fail(res, '排班日期格式应为 YYYY-MM-DD', 400);
    patch.work_date = work_date;
  }
  if (time_slot !== undefined) {
    if (time_slot !== 'AM' && time_slot !== 'PM') return fail(res, '班次只能为 AM 或 PM', 400);
    patch.time_slot = time_slot;
  }
  if (total_num !== undefined) {
    if (!isInt(total_num) || total_num < 0) return fail(res, '总号源必须为非负整数', 400);
    patch.total_num = total_num;
  }
  if (remaining_num !== undefined) {
    if (!isInt(remaining_num) || remaining_num < 0) return fail(res, '剩余号源必须为非负整数', 400);
    patch.remaining_num = remaining_num;
  }
  if (status !== undefined) {
    if (status !== 'AVAILABLE' && status !== 'CLOSED') return fail(res, '排班状态只能为 AVAILABLE 或 CLOSED', 400);
    patch.status = status;
  }
  if (Object.keys(patch).length === 0) return fail(res, '没有可更新的字段', 400);

  const nextDoctor = patch.doctor_id || schedule.doctor_id;
  const nextDate = patch.work_date || schedule.work_date;
  const nextSlot = patch.time_slot || schedule.time_slot;
  const nextTotal = patch.total_num === undefined ? schedule.total_num : patch.total_num;
  let nextRemaining = patch.remaining_num === undefined ? schedule.remaining_num : patch.remaining_num;

  if (patch.total_num !== undefined && patch.remaining_num === undefined) {
    const booked = schedule.total_num - schedule.remaining_num;
    if (patch.total_num < booked) return fail(res, '总号源不能小于已挂号数', 400);
    nextRemaining = patch.total_num - booked;
    patch.remaining_num = nextRemaining;
  }
  if (nextRemaining > nextTotal) return fail(res, '剩余号源不能大于总号源', 400);
  if (findDuplicateSchedule(nextDoctor, nextDate, nextSlot, schedule.id)) {
    return fail(res, '该医生当天该班次已存在排班', 400);
  }

  success(res, enrichSchedule(mockDb.update('schedules', schedule.id, patch)), '更新成功');
};

const deleteSchedule = (req, res) => {
  const schedule = mockDb.findById('schedules', req.params.id);
  if (!schedule) return fail(res, '排班不存在', 404);
  if (mockDb.findOne('registrations', (r) => r.schedule_id === schedule.id)) {
    return fail(res, '该排班下存在挂号记录，无法删除', 400);
  }
  mockDb.remove('schedules', schedule.id);
  success(res, null, '删除成功');
};

const normalizeDrug = (d) => ({ ...d, batch: d.batch || '' });

const listDrugs = (req, res) => success(res, mockDb.all('drugs').map(normalizeDrug));

const createDrug = (req, res) => {
  const { name, spec, unit, price, stock, category, batch } = req.body;
  if (!isNonEmpty(name)) return fail(res, '药品名称不能为空', 400);
  if (!isNumber(price) || price < 0) return fail(res, '药品单价必须为非负数字', 400);
  const drugStock = stock === undefined ? 0 : stock;
  if (!isInt(drugStock) || drugStock < 0) return fail(res, '库存必须为非负整数', 400);

  const drug = mockDb.insert('drugs', {
    id: genId('drug_'),
    name: name.trim(),
    spec: isNonEmpty(spec) ? spec.trim() : '',
    unit: isNonEmpty(unit) ? unit.trim() : '',
    price,
    stock: drugStock,
    category: isNonEmpty(category) ? category.trim() : '',
    batch: isNonEmpty(batch) ? batch.trim() : '',
    created_at: now(),
  });
  success(res, drug, '创建成功', 201);
};

const updateDrug = (req, res) => {
  const drug = mockDb.findById('drugs', req.params.id);
  if (!drug) return fail(res, '药品不存在', 404);

  const { name, spec, unit, price, stock, category, batch } = req.body;
  const patch = {};
  if (name !== undefined) {
    if (!isNonEmpty(name)) return fail(res, '药品名称不能为空', 400);
    patch.name = name.trim();
  }
  if (spec !== undefined) patch.spec = String(spec);
  if (unit !== undefined) patch.unit = String(unit);
  if (price !== undefined) {
    if (!isNumber(price) || price < 0) return fail(res, '药品单价必须为非负数字', 400);
    patch.price = price;
  }
  if (stock !== undefined) {
    if (!isInt(stock) || stock < 0) return fail(res, '库存必须为非负整数', 400);
    patch.stock = stock;
  }
  if (category !== undefined) patch.category = String(category);
  if (batch !== undefined) patch.batch = String(batch);
  if (Object.keys(patch).length === 0) return fail(res, '没有可更新的字段', 400);

  success(res, mockDb.update('drugs', drug.id, patch), '更新成功');
};

const deleteDrug = (req, res) => {
  const drug = mockDb.findById('drugs', req.params.id);
  if (!drug) return fail(res, '药品不存在', 404);
  if (mockDb.findOne('prescription_items', (it) => it.drug_id === drug.id)) {
    return fail(res, '该药品已被处方引用，无法删除', 400);
  }
  mockDb.remove('drugs', drug.id);
  success(res, null, '删除成功');
};

const listUsers = (req, res) => {
  const { role, status } = req.query;
  let list = mockDb.all('users');
  if (role) list = list.filter((u) => u.role === role);
  if (status) list = list.filter((u) => u.status === status);
  success(res, list.map(User.toSafe));
};

// 查询审计日志（可按用户名/角色/方法/状态码筛选，默认最新在前）
const listAuditLogs = (req, res) => {
  const { username, role, method, status_code, limit } = req.query;
  let list = auditLog.list();
  if (username) list = list.filter((l) => l.username === username);
  if (role) list = list.filter((l) => l.role === role);
  if (method) list = list.filter((l) => l.method === method.toUpperCase());
  if (status_code !== undefined) list = list.filter((l) => String(l.status_code) === String(status_code));
  const n = parseInt(limit, 10);
  if (Number.isInteger(n) && n > 0) list = list.slice(0, n);
  success(res, list);
};

module.exports = {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listDoctors, createDoctor, updateDoctor, deleteDoctor,
  listSchedules, createSchedule, updateSchedule, deleteSchedule,
  listDrugs, createDrug, updateDrug, deleteDrug,
  listUsers, listAuditLogs,
};
