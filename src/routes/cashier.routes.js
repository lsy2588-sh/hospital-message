const router = require('express').Router();
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const ctrl = require('../controllers/cashier.controller');

router.use(auth, requireRole('cashier'));

router.get('/prescriptions', ctrl.listPrescriptions);
router.post('/payments', ctrl.createPayment);

module.exports = router;
