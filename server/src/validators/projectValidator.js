const { body } = require('express-validator');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const createProjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required.')
    .isLength({ max: 255 })
    .withMessage('Project name cannot exceed 255 characters.'),
  body('description')
    .optional({ nullable: true })
    .trim(),
  body('start_date')
    .notEmpty()
    .withMessage('Start date is required.')
    .isISO8601()
    .withMessage('Start date must be a valid date.'),
  body('deadline')
    .notEmpty()
    .withMessage('Deadline is required.')
    .isISO8601()
    .withMessage('Deadline must be a valid date.')
    .custom((deadline, { req }) => {
      if (req.body.start_date && new Date(deadline) < new Date(req.body.start_date)) {
        throw new Error('Deadline cannot be before start date.');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'])
    .withMessage('Status must be PLANNING, IN_PROGRESS, COMPLETED, or ON_HOLD.'),
  body('manager_id')
    .optional({ nullable: true })
    .matches(UUID_REGEX)
    .withMessage('Project Manager must be a valid user ID.'),
  body('member_ids')
    .optional()
    .isArray()
    .withMessage('member_ids must be an array of user IDs.'),
];

const updateProjectValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty.')
    .isLength({ max: 255 }),
  body('description')
    .optional({ nullable: true })
    .trim(),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date.'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date.')
    .custom((deadline, { req }) => {
      const startDate = req.body.start_date;
      if (startDate && new Date(deadline) < new Date(startDate)) {
        throw new Error('Deadline cannot be before start date.');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'])
    .withMessage('Status must be PLANNING, IN_PROGRESS, COMPLETED, or ON_HOLD.'),
  body('manager_id')
    .optional({ nullable: true })
    .matches(UUID_REGEX)
    .withMessage('Project Manager must be a valid user ID.'),
  body('member_ids')
    .optional()
    .isArray()
    .withMessage('member_ids must be an array of user IDs.'),
];

const addMemberValidator = [
  body('user_id')
    .notEmpty()
    .withMessage('user_id is required.')
    .matches(UUID_REGEX)
    .withMessage('user_id must be a valid UUID.'),
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  addMemberValidator,
};
