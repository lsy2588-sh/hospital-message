const { genNo } = require('../utils/idGenerator');
const { hashPassword } = require('../utils/password');

// ============================================================
// 内存模拟数据库（Mock DB）
// 用数组模拟"表"，用方法模拟 SQL 查询。
// 未来接入 MySQL 时，仅需将本文件的方法实现替换为 SQL 实现，
// 保持方法签名不变，上层代码无需改动。
// ============================================================

const db = {
  users: [],
  patients: [],
  doctors: [],
  departments: [],
  schedules: [],
  registrations: [],
  prescriptions: [],
  prescription_items: [],
  drugs: [],
  payments: [],
  dispense_records: [],
};

const now = () => new Date().toISOString();

// ---------- 通用查询方法 ----------
const all = (table) => db[table];

const findById = (table, id) => db[table].find((r) => r.id === id);

const find = (table, predicate) => db[table].filter(predicate);

const findOne = (table, predicate) => db[table].find(predicate);

const insert = (table, record) => {
  db[table].push(record);
  return record;
};

const update = (table, id, patch) => {
  const record = findById(table, id);
  if (!record) return null;
  Object.assign(record, patch, { updated_at: now() });
  return record;
};

const remove = (table, id) => {
  const idx = db[table].findIndex((r) => r.id === id);
  if (idx >= 0) db[table].splice(idx, 1);
};

// ---------- 常用业务查询 ----------
const findUserByUsername = (username) => findOne('users', (u) => u.username === username);

const findPatientByUserId = (userId) => findOne('patients', (p) => p.user_id === userId);

const findDoctorByUserId = (userId) => findOne('doctors', (d) => d.user_id === userId);

// ---------- 种子数据 ----------
function seed() {
  Object.keys(db).forEach((k) => { db[k] = []; });

  // 科室（12）
  const DEPARTMENTS = [
    { id: 'dept01', name: '内科', description: '诊治内科常见病、多发病及疑难杂症' },
    { id: 'dept02', name: '外科', description: '诊治外科疾病，开展各类手术' },
    { id: 'dept03', name: '儿科', description: '0-14 岁儿童疾病诊治' },
    { id: 'dept04', name: '妇产科', description: '妇科疾病诊治与产科分娩' },
    { id: 'dept05', name: '骨科', description: '骨折、关节及脊柱疾病诊治' },
    { id: 'dept06', name: '眼科', description: '眼部疾病诊治与视力矫正' },
    { id: 'dept07', name: '耳鼻喉科', description: '耳、鼻、咽喉疾病诊治' },
    { id: 'dept08', name: '皮肤科', description: '皮肤病及性传播疾病诊治' },
    { id: 'dept09', name: '口腔科', description: '牙体牙髓、口腔颌面疾病诊治' },
    { id: 'dept10', name: '神经内科', description: '脑血管病、癫痫等神经系统疾病' },
    { id: 'dept11', name: '心血管内科', description: '高血压、冠心病等心血管疾病' },
    { id: 'dept12', name: '呼吸内科', description: '哮喘、肺炎等呼吸系统疾病' },
  ];
  DEPARTMENTS.forEach((d) => insert('departments', { ...d, created_at: now() }));

  // 医生（12）
  const DOCTORS = [
    { id: 'doc01', name: '张伟', title: '主任医师', dept: 'dept01' },
    { id: 'doc02', name: '李娜', title: '副主任医师', dept: 'dept02' },
    { id: 'doc03', name: '王强', title: '主治医师', dept: 'dept03' },
    { id: 'doc04', name: '刘敏', title: '主任医师', dept: 'dept04' },
    { id: 'doc05', name: '陈静', title: '副主任医师', dept: 'dept05' },
    { id: 'doc06', name: '杨磊', title: '主治医师', dept: 'dept06' },
    { id: 'doc07', name: '赵芳', title: '主任医师', dept: 'dept07' },
    { id: 'doc08', name: '黄杰', title: '副主任医师', dept: 'dept08' },
    { id: 'doc09', name: '周婷', title: '主治医师', dept: 'dept09' },
    { id: 'doc10', name: '吴刚', title: '主任医师', dept: 'dept10' },
    { id: 'doc11', name: '徐丽', title: '副主任医师', dept: 'dept11' },
    { id: 'doc12', name: '孙浩', title: '主治医师', dept: 'dept12' },
  ];
  DOCTORS.forEach((doc, i) => {
    const uid = `u_${doc.id}`;
    insert('users', {
      id: uid, username: `doctor${i + 1}`, password_hash: hashPassword('doctor123'),
      role: 'doctor', status: 'ACTIVE', created_at: now(),
    });
    insert('doctors', {
      id: doc.id, user_id: uid, name: doc.name, title: doc.title,
      department_id: doc.dept, phone: `138${String(10000000 + i)}`, created_at: now(),
    });
  });

  // 患者（12）
  const PATIENTS = [
    { id: 'pat01', name: '王小明', gender: 'M', age: 28, phone: '13800000001', id_card: '110101199801010011' },
    { id: 'pat02', name: '李红', gender: 'F', age: 35, phone: '13800000002', id_card: '110101199001010022' },
    { id: 'pat03', name: '张三', gender: 'M', age: 42, phone: '13800000003', id_card: '110101198301010033' },
    { id: 'pat04', name: '刘洋', gender: 'M', age: 19, phone: '13800000004', id_card: '110101200601010044' },
    { id: 'pat05', name: '陈晨', gender: 'F', age: 26, phone: '13800000005', id_card: '110101199901010055' },
    { id: 'pat06', name: '赵敏', gender: 'F', age: 51, phone: '13800000006', id_card: '110101197401010066' },
    { id: 'pat07', name: '黄伟', gender: 'M', age: 33, phone: '13800000007', id_card: '110101199201010077' },
    { id: 'pat08', name: '周芳', gender: 'F', age: 47, phone: '13800000008', id_card: '110101197801010088' },
    { id: 'pat09', name: '吴磊', gender: 'M', age: 23, phone: '13800000009', id_card: '110101200201010099' },
    { id: 'pat10', name: '徐静', gender: 'F', age: 39, phone: '13800000010', id_card: '110101198601010100' },
    { id: 'pat11', name: '孙丽', gender: 'F', age: 30, phone: '13800000011', id_card: '110101199501010111' },
    { id: 'pat12', name: '马超', gender: 'M', age: 56, phone: '13800000012', id_card: '110101196901010122' },
  ];
  PATIENTS.forEach((p, i) => {
    const uid = `u_${p.id}`;
    insert('users', {
      id: uid, username: `patient${i + 1}`, password_hash: hashPassword('patient123'),
      role: 'patient', status: 'ACTIVE', created_at: now(),
    });
    insert('patients', {
      id: p.id, user_id: uid, name: p.name, gender: p.gender, age: p.age,
      phone: p.phone, id_card: p.id_card, created_at: now(),
    });
  });

  // 管理员 / 收费员 / 药师
  insert('users', { id: 'u_admin', username: 'admin', password_hash: hashPassword('admin123'), role: 'admin', status: 'ACTIVE', created_at: now() });
  [{ id: 'u_cash01', username: 'cashier1' }, { id: 'u_cash02', username: 'cashier2' }].forEach((c) => {
    insert('users', { id: c.id, username: c.username, password_hash: hashPassword('cashier123'), role: 'cashier', status: 'ACTIVE', created_at: now() });
  });
  [{ id: 'u_pharma01', username: 'pharmacist1' }, { id: 'u_pharma02', username: 'pharmacist2' }].forEach((p) => {
    insert('users', { id: p.id, username: p.username, password_hash: hashPassword('pharma123'), role: 'pharmacist', status: 'ACTIVE', created_at: now() });
  });

  // 排班号源（每位医生 2 个班次，共 24 条）
  DOCTORS.forEach((doc, i) => {
    const base = { doctor_id: doc.id, department_id: doc.dept, total_num: 30, remaining_num: 30, status: 'AVAILABLE' };
    insert('schedules', { id: `sch${String(i * 2 + 1).padStart(2, '0')}`, ...base, work_date: '2026-10-27', time_slot: 'AM', created_at: now() });
    insert('schedules', { id: `sch${String(i * 2 + 2).padStart(2, '0')}`, ...base, work_date: '2026-10-28', time_slot: 'PM', created_at: now() });
  });

  // 药品库存（12）
  const DRUGS = [
    { id: 'drug01', name: '阿莫西林胶囊', spec: '0.25g*24粒', unit: '盒', price: 12.5, stock: 500, category: '抗生素类' },
    { id: 'drug02', name: '布洛芬缓释胶囊', spec: '0.3g*20粒', unit: '盒', price: 15.8, stock: 400, category: '解热镇痛类' },
    { id: 'drug03', name: '感冒灵颗粒', spec: '10g*9袋', unit: '盒', price: 9.9, stock: 600, category: '感冒类' },
    { id: 'drug04', name: '头孢拉定胶囊', spec: '0.25g*24粒', unit: '盒', price: 18.0, stock: 350, category: '抗生素类' },
    { id: 'drug05', name: '阿司匹林肠溶片', spec: '100mg*30片', unit: '盒', price: 8.5, stock: 800, category: '心血管类' },
    { id: 'drug06', name: '维生素C片', spec: '100mg*100片', unit: '瓶', price: 6.0, stock: 1000, category: '维生素类' },
    { id: 'drug07', name: '蒙脱石散', spec: '3g*10袋', unit: '盒', price: 13.0, stock: 300, category: '消化类' },
    { id: 'drug08', name: '奥美拉唑肠溶胶囊', spec: '20mg*14粒', unit: '盒', price: 22.5, stock: 250, category: '消化类' },
    { id: 'drug09', name: '盐酸氨溴索口服液', spec: '100ml', unit: '瓶', price: 16.0, stock: 200, category: '呼吸类' },
    { id: 'drug10', name: '氯雷他定片', spec: '10mg*6片', unit: '盒', price: 11.0, stock: 450, category: '抗过敏类' },
    { id: 'drug11', name: '碘伏消毒液', spec: '100ml', unit: '瓶', price: 5.5, stock: 900, category: '外用类' },
    { id: 'drug12', name: '云南白药创可贴', spec: '20片', unit: '盒', price: 7.8, stock: 700, category: '外用类' },
  ];
  DRUGS.forEach((d) => insert('drugs', { ...d, created_at: now() }));

  // 挂号样例（10 条，覆盖 WAITING / CONSULTING / COMPLETED 三种状态）
  const addReg = ({ id, patientId, doctorId, scheduleId, departmentId, status, chief = null, diagnosis = null }) => {
    insert('registrations', {
      id, registration_no: genNo('REG'), patient_id: patientId, schedule_id: scheduleId,
      doctor_id: doctorId, department_id: departmentId, chief_complaint: chief, diagnosis, status, created_at: now(),
    });
    const sch = findById('schedules', scheduleId);
    if (sch && sch.remaining_num > 0) sch.remaining_num -= 1;
  };

  addReg({ id: 'reg01', patientId: 'pat01', doctorId: 'doc01', scheduleId: 'sch01', departmentId: 'dept01', status: 'WAITING' });
  addReg({ id: 'reg02', patientId: 'pat02', doctorId: 'doc01', scheduleId: 'sch02', departmentId: 'dept01', status: 'CONSULTING', chief: '发热两天，伴咳嗽', diagnosis: '上呼吸道感染' });
  addReg({ id: 'reg03', patientId: 'pat03', doctorId: 'doc02', scheduleId: 'sch03', departmentId: 'dept02', status: 'WAITING' });
  addReg({ id: 'reg04', patientId: 'pat04', doctorId: 'doc02', scheduleId: 'sch04', departmentId: 'dept02', status: 'COMPLETED', chief: '胃部不适反复发作', diagnosis: '慢性胃炎' });
  addReg({ id: 'reg05', patientId: 'pat05', doctorId: 'doc03', scheduleId: 'sch05', departmentId: 'dept03', status: 'COMPLETED', chief: '鼻塞流涕伴头痛', diagnosis: '感冒' });
  addReg({ id: 'reg06', patientId: 'pat06', doctorId: 'doc03', scheduleId: 'sch06', departmentId: 'dept03', status: 'COMPLETED', chief: '关节疼痛一周', diagnosis: '类风湿性关节炎' });
  addReg({ id: 'reg07', patientId: 'pat07', doctorId: 'doc04', scheduleId: 'sch07', departmentId: 'dept04', status: 'WAITING' });
  addReg({ id: 'reg08', patientId: 'pat08', doctorId: 'doc04', scheduleId: 'sch08', departmentId: 'dept04', status: 'WAITING' });
  addReg({ id: 'reg09', patientId: 'pat09', doctorId: 'doc05', scheduleId: 'sch09', departmentId: 'dept05', status: 'WAITING' });
  addReg({ id: 'reg10', patientId: 'pat10', doctorId: 'doc05', scheduleId: 'sch10', departmentId: 'dept05', status: 'WAITING' });

  // 处方 + 明细（3 张，覆盖 PENDING / PAID / DISPENSED 三种状态）
  const addRx = ({ id, regId, patientId, doctorId, status, items }) => {
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    insert('prescriptions', { id, registration_id: regId, patient_id: patientId, doctor_id: doctorId, total_amount: total, status, created_at: now() });
    items.forEach((it, idx) => {
      insert('prescription_items', {
        id: `${id}_item${idx + 1}`, prescription_id: id, drug_id: it.drug_id,
        quantity: it.quantity, unit_price: it.unit_price, subtotal: it.subtotal, dosage: it.dosage, created_at: now(),
      });
    });
  };

  addRx({ id: 'rx01', regId: 'reg04', patientId: 'pat04', doctorId: 'doc02', status: 'PAID', items: [
    { drug_id: 'drug01', quantity: 2, unit_price: 12.5, subtotal: 25.0, dosage: '一次一粒，一日三次' },
    { drug_id: 'drug09', quantity: 1, unit_price: 16.0, subtotal: 16.0, dosage: '一次10ml，一日两次' },
  ] });
  addRx({ id: 'rx02', regId: 'reg05', patientId: 'pat05', doctorId: 'doc03', status: 'PENDING', items: [
    { drug_id: 'drug03', quantity: 2, unit_price: 9.9, subtotal: 19.8, dosage: '一次一袋，一日三次' },
    { drug_id: 'drug06', quantity: 1, unit_price: 6.0, subtotal: 6.0, dosage: '一次一片，一日一次' },
  ] });
  addRx({ id: 'rx03', regId: 'reg06', patientId: 'pat06', doctorId: 'doc03', status: 'DISPENSED', items: [
    { drug_id: 'drug02', quantity: 1, unit_price: 15.8, subtotal: 15.8, dosage: '疼痛时一次一粒' },
    { drug_id: 'drug10', quantity: 1, unit_price: 11.0, subtotal: 11.0, dosage: '一次一片，一日一次' },
  ] });

  // 收费单（2 条，均 PAID）
  insert('payments', { id: 'pay01', payment_no: genNo('PAY'), prescription_id: 'rx01', patient_id: 'pat04', cashier_id: 'u_cash01', amount: 41.0, status: 'PAID', paid_at: now(), created_at: now() });
  insert('payments', { id: 'pay02', payment_no: genNo('PAY'), prescription_id: 'rx03', patient_id: 'pat06', cashier_id: 'u_cash01', amount: 26.8, status: 'PAID', paid_at: now(), created_at: now() });

  // 发药记录（rx03 已发药，扣减库存）
  insert('dispense_records', { id: 'disp01', prescription_id: 'rx03', pharmacist_id: 'u_pharma01', status: 'DISPENSED', dispensed_at: now(), created_at: now() });
  const drug02 = findById('drugs', 'drug02'); if (drug02) drug02.stock -= 1;
  const drug10 = findById('drugs', 'drug10'); if (drug10) drug10.stock -= 1;
}

seed();

module.exports = {
  db,
  all, findById, find, findOne, insert, update, remove,
  findUserByUsername, findPatientByUserId, findDoctorByUserId,
  reset: seed,
};
