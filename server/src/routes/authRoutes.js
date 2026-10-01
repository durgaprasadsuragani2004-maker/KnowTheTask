const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginValidator, registerValidator } = require('../validators/authValidator');
const validate = require('../middleware/validatorMiddleware');
const authenticate = require('../middleware/authMiddleware');

router.post('/login', loginValidator, validate, authController.login);
router.post('/register', registerValidator, validate, authController.register);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
