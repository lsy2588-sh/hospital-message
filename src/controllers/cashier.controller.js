const mockDb = require('../models/mockDb');
const { genId, genNo } = require('../utils/idGenerator');
const { success, fail } = require('../utils/response');
const { enrichPrescription } = require('../utils/helpers');

// 待缴费处方（默认 PENDING，可 ?status= 覆盖）
const listPrescriptions = (req, res) => {
  const { status } = req.query;
  let list = mockDb.find('prescriptions', (p) => p.status === (status || 'PENDING'));
  list = list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichPrescription));
};

// 收费：金额取处方 total_amount，处方 待缴费 -> 已缴费
const createPayment = (req, res) => {
  const { prescription_id } = req.body;
  const rx = mockDb.findById('prescriptions', prescription_id);
  if (!rx) return fail(res, '处方不存在', 404);
  if (rx.status !== 'PENDING') return fail(res, '该处方无需缴费或已缴费', 400);

  const amount = rx.total_amount; // 金额以后端计算为准，忽略前端传值

  const payment = mockDb.insert('payments', {
    id: genId('pay_'),
    payment_no: genNo('PAY'),
    prescription_id: rx.id,
    patient_id: rx.patient_id,
    cashier_id: req.user.userId,
    amount,
    status: 'PAID',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  rx.status = 'PAID';

  success(res, payment, '收费成功', 201);
};

module.exports = { listPrescriptions, createPayment };
