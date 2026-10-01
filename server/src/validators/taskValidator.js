const { body } = require('express-validator');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const createTaskValidator = [
  body('project_id')
    .notEmpty()
    .withMessage('project_id is required.')
    .matches(UUID_REGEX)
    .withMessage('project_id must be a valid UUID.'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required.')
    .isLength({ max: 255 })
    .withMessage('Task title cannot exceed 255 characters.'),
  body('description')
    .optional({ nullable: true })
    .trim(),
  body('assigned_to')
    .optional({ nullable: true })
    .matches(UUID_REGEX)
    .withMessage('assigned_to must be a valid UUID.'),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT.'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
    .withMessage('Status must be TODO, IN_PROGRESS, REVIEW, or COMPLETED.'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Deadline must be a valid date.')
    .custom((deadline) => {
      if (deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dl = new Date(deadline);
        dl.setHours(23, 59, 59, 999);
        if (dl < today) {
          throw new Error('Task deadline cannot be earlier than the task creation date.');
        }
      }
      return true;
    }),
];

const updateTaskValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty.')
    .isLength({ max: 255 }),
  body('description')
    .optional({ nullable: true })
    .trim(),
  body('assigned_to')
    .optional({ nullable: true }),
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT.'),
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
    .withMessage('Status must be TODO, IN_PROGRESS, REVIEW, or COMPLETED.'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Deadline must be a valid date.'),
];

const updateTaskStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required.')
    .isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'])
    .withMessage('Status must be TODO, IN_PROGRESS, REVIEW, or COMPLETED.'),
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  updateTaskStatusValidator,
};
