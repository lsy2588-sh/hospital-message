const mockDb = require('../models/mockDb');
const { genId, genNo } = require('../utils/idGenerator');
const { success, fail } = require('../utils/response');
const { enrichRegistration, enrichPrescription } = require('../utils/helpers');

const getPatient = (req) => mockDb.findPatientByUserId(req.user.userId);

// 挂号：原子扣减号源
const createRegistration = (req, res) => {
  const patient = getPatient(req);
  if (!patient) return fail(res, '患者信息不存在', 404);

  const { schedule_id } = req.body;
  const schedule = mockDb.findById('schedules', schedule_id);
  if (!schedule) return fail(res, '号源不存在', 404);
  if (schedule.status !== 'AVAILABLE') return fail(res, '该号源已停诊', 400);
  if (schedule.remaining_num <= 0) return fail(res, '号源已满', 400);

  const dup = mockDb.findOne('registrations',
    (r) => r.patient_id === patient.id
      && (r.status === 'WAITING' || r.status === 'CONSULTING'));
  if (dup) return fail(res, '您已挂号，请勿重复挂号', 400);

  schedule.remaining_num -= 1; // 校验 + 扣减同步完成，防超卖

  const registration = mockDb.insert('registrations', {
    id: genId('reg_'),
    registration_no: genNo('REG'),
    patient_id: patient.id,
    schedule_id: schedule.id,
    doctor_id: schedule.doctor_id,
    department_id: schedule.department_id,
    chief_complaint: null,
    diagnosis: null,
    status: 'WAITING',
    created_at: new Date().toISOString(),
  });

  success(res, enrichRegistration(registration), '挂号成功', 201);
};

const listRegistrations = (req, res) => {
  const patient = getPatient(req);
  const list = mockDb
    .find('registrations', (r) => r.patient_id === patient.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichRegistration));
};

const getRegistration = (req, res) => {
  const patient = getPatient(req);
  const reg = mockDb.findById('registrations', req.params.id);
  if (!reg) return fail(res, '挂号单不存在', 404);
  if (reg.patient_id !== patient.id) return fail(res, '无权限访问', 403);
  success(res, enrichRegistration(reg));
};

// 取消挂号：仅候诊状态，回补号源
const cancelRegistration = (req, res) => {
  const patient = getPatient(req);
  const reg = mockDb.findById('registrations', req.params.id);
  if (!reg) return fail(res, '挂号单不存在', 404);
  if (reg.patient_id !== patient.id) return fail(res, '无权限访问', 403);
  if (reg.status !== 'WAITING') return fail(res, '仅候诊状态可取消', 400);

  reg.status = 'CANCELLED';
  const schedule = mockDb.findById('schedules', reg.schedule_id);
  if (schedule) schedule.remaining_num += 1; // 回补号源

  success(res, enrichRegistration(reg), '取消成功');
};

const listPrescriptions = (req, res) => {
  const patient = getPatient(req);
  const list = mockDb
    .find('prescriptions', (p) => p.patient_id === patient.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichPrescription));
};

const getPrescription = (req, res) => {
  const patient = getPatient(req);
  const rx = mockDb.findById('prescriptions', req.params.id);
  if (!rx) return fail(res, '处方不存在', 404);
  if (rx.patient_id !== patient.id) return fail(res, '无权限访问', 403);
  success(res, enrichPrescription(rx));
};

const listPayments = (req, res) => {
  const patient = getPatient(req);
  const list = mockDb
    .find('payments', (p) => p.patient_id === patient.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list);
};

module.exports = {
  createRegistration, listRegistrations, getRegistration, cancelRegistration,
  listPrescriptions, getPrescription, listPayments,
};
