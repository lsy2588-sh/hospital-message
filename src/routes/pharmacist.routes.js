const router = require('express').Router();
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const ctrl = require('../controllers/pharmacist.controller');

router.use(auth, requireRole('pharmacist'));

router.get('/prescriptions', ctrl.listPrescriptions);
router.post('/prescriptions/:id/dispense', ctrl.dispense);

module.exports = router;
