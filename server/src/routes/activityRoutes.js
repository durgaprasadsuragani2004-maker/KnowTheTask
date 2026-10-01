const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/tasks/:id/activity', activityController.getTaskActivity);
router.get('/projects/:id/activity', activityController.getProjectActivity);

module.exports = router;
