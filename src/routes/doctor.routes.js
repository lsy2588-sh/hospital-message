const router = require('express').Router();
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const ctrl = require('../controllers/doctor.controller');

router.use(auth, requireRole('doctor'));

router.get('/registrations', ctrl.listRegistrations);
router.post('/registrations/:id/accept', ctrl.acceptRegistration);
router.post('/prescriptions', ctrl.createPrescription);
router.get('/prescriptions', ctrl.listPrescriptions);
router.get('/patients/:id/records', ctrl.getPatientRecords);

module.exports = router;
