const router = require('express').Router();
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const ctrl = require('../controllers/common.controller');

router.get('/departments', auth, ctrl.getDepartments);
router.get('/doctors', auth, ctrl.getDoctors);
router.get('/schedules', auth, ctrl.getSchedules);
router.get('/drugs', auth, requireRole('doctor', 'pharmacist'), ctrl.getDrugs);

module.exports = router;
