const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  createTaskValidator,
  updateTaskValidator,
  updateTaskStatusValidator,
} = require('../validators/taskValidator');
const validate = require('../middleware/validatorMiddleware');

const commentController = require('../controllers/commentController');
const activityController = require('../controllers/activityController');

router.use(authenticate);

router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post(
  '/',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  createTaskValidator,
  validate,
  taskController.createTask
);
router.put(
  '/:id',
  updateTaskValidator,
  validate,
  taskController.updateTask
);
router.patch(
  '/:id/status',
  updateTaskStatusValidator,
  validate,
  taskController.updateTaskStatus
);
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  taskController.deleteTask
);

// Task comments endpoints (Part 4)
router.get('/:id/comments', commentController.getTaskComments);
router.post('/:id/comments', commentController.createComment);

// Task activity endpoints (Part 5)
router.get('/:id/activity', activityController.getTaskActivity);

module.exports = router;

