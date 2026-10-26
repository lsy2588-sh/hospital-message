const mockDb = require('../models/mockDb');

// 四舍五入到两位小数（金额计算）
const round2 = (n) => Math.round(n * 100) / 100;

const deptName = (id) => { const d = mockDb.findById('departments', id); return d ? d.name : null; };
const doctorName = (id) => { const d = mockDb.findById('doctors', id); return d ? d.name : null; };
const patientName = (id) => { const p = mockDb.findById('patients', id); return p ? p.name : null; };
const drugName = (id) => { const d = mockDb.findById('drugs', id); return d ? d.name : null; };

// 挂号单补充冗余展示字段
const enrichRegistration = (r) => ({
  ...r,
  patient_name: patientName(r.patient_id),
  doctor_name: doctorName(r.doctor_id),
  department_name: deptName(r.department_id),
});

// 处方补充展示字段 + 明细（含药品名）
const enrichPrescription = (p) => ({
  ...p,
  patient_name: patientName(p.patient_id),
  doctor_name: doctorName(p.doctor_id),
  items: mockDb
    .find('prescription_items', (it) => it.prescription_id === p.id)
    .map((it) => ({ ...it, drug_name: drugName(it.drug_id) })),
});

module.exports = { round2, deptName, doctorName, patientName, drugName, enrichRegistration, enrichPrescription };
