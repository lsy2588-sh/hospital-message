const mockDb = require('../models/mockDb');
const { genId } = require('../utils/idGenerator');
const { success, fail } = require('../utils/response');
const { round2, enrichRegistration, enrichPrescription } = require('../utils/helpers');

const getDoctor = (req) => mockDb.findDoctorByUserId(req.user.userId);

// 我名下的挂号（可按状态筛选）
const listRegistrations = (req, res) => {
  const doctor = getDoctor(req);
  if (!doctor) return fail(res, '医生信息不存在', 404);
  const { status } = req.query;
  let list = mockDb.find('registrations', (r) => r.doctor_id === doctor.id);
  if (status) list = list.filter((r) => r.status === status);
  list = list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichRegistration));
};

// 接诊：候诊 -> 就诊，同时写入主诉/诊断
const acceptRegistration = (req, res) => {
  const doctor = getDoctor(req);
  const reg = mockDb.findById('registrations', req.params.id);
  if (!reg) return fail(res, '挂号单不存在', 404);
  if (reg.doctor_id !== doctor.id) return fail(res, '无权限访问', 403);
  if (reg.status !== 'WAITING') return fail(res, '仅候诊状态可接诊', 400);

  const { chief_complaint, diagnosis } = req.body;
  reg.status = 'CONSULTING';
  reg.chief_complaint = chief_complaint || '';
  reg.diagnosis = diagnosis || '';
  success(res, enrichRegistration(reg), '接诊成功');
};

// 开处方：生成明细 + 计算总额，挂号单 就诊 -> 完成（1:1）
const createPrescription = (req, res) => {
  const doctor = getDoctor(req);
  const { registration_id, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) return fail(res, '处方明细不能为空', 400);

  const reg = mockDb.findById('registrations', registration_id);
  if (!reg) return fail(res, '挂号单不存在', 404);
  if (reg.doctor_id !== doctor.id) return fail(res, '无权限访问', 403);
  if (reg.status !== 'CONSULTING') return fail(res, '仅就诊中的挂号单可开处方', 400);

  const exists = mockDb.findOne('prescriptions', (p) => p.registration_id === registration_id);
  if (exists) return fail(res, '该挂号单已开过处方', 400);

  const detail = [];
  for (const it of items) {
    const { drug_id, quantity, dosage } = it;
    if (!Number.isInteger(quantity) || quantity <= 0) return fail(res, '药品数量必须为正整数', 400);
    const drug = mockDb.findById('drugs', drug_id);
    if (!drug) return fail(res, `药品不存在: ${drug_id}`, 404);
    detail.push({
      drug_id, quantity, dosage: dosage || '',
      unit_price: drug.price, // 单价快照，医生不能改价
      subtotal: round2(drug.price * quantity),
    });
  }

  const total_amount = round2(detail.reduce((s, it) => s + it.subtotal, 0));

  const prescription = mockDb.insert('prescriptions', {
    id: genId('rx_'),
    registration_id: reg.id,
    patient_id: reg.patient_id,
    doctor_id: doctor.id,
    total_amount,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  });

  detail.forEach((it) => {
    mockDb.insert('prescription_items', {
      id: genId('rxi_'),
      prescription_id: prescription.id,
      ...it,
      created_at: new Date().toISOString(),
    });
  });

  reg.status = 'COMPLETED';

  success(res, enrichPrescription(prescription), '开方成功', 201);
};

// 我开的处方
const listPrescriptions = (req, res) => {
  const doctor = getDoctor(req);
  const list = mockDb
    .find('prescriptions', (p) => p.doctor_id === doctor.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichPrescription));
};

// 我名下某患者的历史记录
const getPatientRecords = (req, res) => {
  const doctor = getDoctor(req);
  const patientId = req.params.id;
  const hasRecord = mockDb.findOne('registrations', (r) => r.doctor_id === doctor.id && r.patient_id === patientId);
  if (!hasRecord) return fail(res, '该患者不是您名下的患者', 403);
  const list = mockDb
    .find('registrations', (r) => r.doctor_id === doctor.id && r.patient_id === patientId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichRegistration));
};

module.exports = { listRegistrations, acceptRegistration, createPrescription, listPrescriptions, getPatientRecords };
