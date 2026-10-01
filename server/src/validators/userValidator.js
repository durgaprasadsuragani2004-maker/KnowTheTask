const { body, param } = require('express-validator');

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('User name is required.'),
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER']).withMessage('Role must be ADMIN, PROJECT_MANAGER, or TEAM_MEMBER.'),
];

const updateUserValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('role').optional().isIn(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER']).withMessage('Invalid role.'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean.'),
];

module.exports = {
  createUserValidator,
  updateUserValidator,
};
