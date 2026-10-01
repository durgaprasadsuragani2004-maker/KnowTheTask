const { body } = require('express-validator');

const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'])
    .withMessage('Selected role must be ADMIN, PROJECT_MANAGER, or TEAM_MEMBER.'),
];

const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'])
    .withMessage('Role must be ADMIN, PROJECT_MANAGER, or TEAM_MEMBER.'),
];

module.exports = {
  loginValidator,
  registerValidator,
};
