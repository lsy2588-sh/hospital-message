const router = require('express').Router();
const { register, login } = require('../controllers/auth.controller');
const { requiredFields, passwordMin } = require('../middlewares/validate');

router.post('/register', requiredFields('username', 'password', 'name'), passwordMin(6), register);
router.post('/login', requiredFields('username', 'password'), login);

module.exports = router;
