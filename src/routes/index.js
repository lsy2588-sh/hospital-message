const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/', require('./common.routes'));
router.use('/', require('./patient.routes'));
router.use('/doctor', require('./doctor.routes'));
router.use('/cashier', require('./cashier.routes'));
router.use('/pharmacist', require('./pharmacist.routes'));
// 后续：挂载 /admin（管理端同学负责）

module.exports = router;
