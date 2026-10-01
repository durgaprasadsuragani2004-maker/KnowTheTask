const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { createUserValidator, updateUserValidator } = require('../validators/userValidator');
const validate = require('../middleware/validatorMiddleware');

router.use(authenticate);

router.get('/', userController.getAllUsers);
router.get('/assignable', userController.getAssignableUsers);
router.get('/:id/workload', userController.getUserWorkload);
router.get('/:id', userController.getUserById);
router.post('/', authorizeRoles('ADMIN'), createUserValidator, validate, userController.createUser);
router.put('/:id', updateUserValidator, validate, userController.updateUser);
router.patch('/:id/status', authorizeRoles('ADMIN'), userController.updateUserStatus);
router.delete('/:id', authorizeRoles('ADMIN'), userController.deleteUser);

module.exports = router;
