const mockDb = require('../models/mockDb');
const { genId } = require('../utils/idGenerator');
const { success, fail } = require('../utils/response');
const { enrichPrescription } = require('../utils/helpers');

// 已缴费待发药处方
const listPrescriptions = (req, res) => {
  const list = mockDb
    .find('prescriptions', (p) => p.status === 'PAID')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  success(res, list.map(enrichPrescription));
};

// 发药：校验已缴费 + 库存充足，扣减库存，处方 已缴费 -> 已发药
const dispense = (req, res) => {
  const rx = mockDb.findById('prescriptions', req.params.id);
  if (!rx) return fail(res, '处方不存在', 404);
  if (rx.status !== 'PAID') return fail(res, '仅已缴费处方可发药', 400);

  const payment = mockDb.findOne('payments', (p) => p.prescription_id === rx.id && p.status === 'PAID');
  if (!payment) return fail(res, '该处方尚未缴费', 400);

  const items = mockDb.find('prescription_items', (it) => it.prescription_id === rx.id);
  if (items.length === 0) return fail(res, '处方无药品明细', 400);

  // 第一遍：校验库存充足
  for (const it of items) {
    const drug = mockDb.findById('drugs', it.drug_id);
    if (!drug) return fail(res, `药品不存在: ${it.drug_id}`, 404);
    if (drug.stock < it.quantity) return fail(res, `药品【${drug.name}】库存不足`, 400);
  }
  // 第二遍：原子扣减库存
  for (const it of items) {
    const drug = mockDb.findById('drugs', it.drug_id);
    drug.stock -= it.quantity;
  }

  mockDb.insert('dispense_records', {
    id: genId('disp_'),
    prescription_id: rx.id,
    pharmacist_id: req.user.userId,
    status: 'DISPENSED',
    dispensed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  rx.status = 'DISPENSED';

  success(res, enrichPrescription(rx), '发药成功');
};

module.exports = { listPrescriptions, dispense };
