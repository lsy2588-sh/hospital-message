const router = require('express').Router();
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const ctrl = require('../controllers/patient.controller');

// 患者路由挂载在根路径（/api/registrations 等），
// 必须逐条加鉴权，不能用 router.use 全局拦截，否则会误拦 /doctor、/cashier 等
const guard = [auth, requireRole('patient')];

router.post('/registrations', ...guard, ctrl.createRegistration);
router.get('/registrations', ...guard, ctrl.listRegistrations);
router.get('/registrations/:id', ...guard, ctrl.getRegistration);
router.post('/registrations/:id/cancel', ...guard, ctrl.cancelRegistration);
router.get('/prescriptions', ...guard, ctrl.listPrescriptions);
router.get('/prescriptions/:id', ...guard, ctrl.getPrescription);
router.get('/payments', ...guard, ctrl.listPayments);

module.exports = router;
