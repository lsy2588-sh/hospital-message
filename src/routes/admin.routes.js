const router = require('express').Router();
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');
const ctrl = require('../controllers/admin.controller');

router.use(auth, requireRole('admin'));

router.get('/departments', ctrl.listDepartments);
router.post('/departments', ctrl.createDepartment);
router.put('/departments/:id', ctrl.updateDepartment);
router.delete('/departments/:id', ctrl.deleteDepartment);

router.get('/doctors', ctrl.listDoctors);
router.post('/doctors', ctrl.createDoctor);
router.put('/doctors/:id', ctrl.updateDoctor);
router.delete('/doctors/:id', ctrl.deleteDoctor);

router.get('/schedules', ctrl.listSchedules);
router.post('/schedules', ctrl.createSchedule);
router.put('/schedules/:id', ctrl.updateSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

router.get('/drugs', ctrl.listDrugs);
router.post('/drugs', ctrl.createDrug);
router.put('/drugs/:id', ctrl.updateDrug);
router.delete('/drugs/:id', ctrl.deleteDrug);

router.get('/users', ctrl.listUsers);

router.get('/audit-logs', ctrl.listAuditLogs);

module.exports = router;
