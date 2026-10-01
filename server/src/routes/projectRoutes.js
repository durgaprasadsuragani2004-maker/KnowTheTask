const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticate = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
  createProjectValidator,
  updateProjectValidator,
  addMemberValidator,
} = require('../validators/projectValidator');
const validate = require('../middleware/validatorMiddleware');

router.use(authenticate);

router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post(
  '/',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  createProjectValidator,
  validate,
  projectController.createProject
);
router.put(
  '/:id',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  updateProjectValidator,
  validate,
  projectController.updateProject
);
router.delete(
  '/:id',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  projectController.deleteProject
);

// Member assignment routes
router.post(
  '/:id/members',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  addMemberValidator,
  validate,
  projectController.addProjectMember
);
router.delete(
  '/:id/members/:userId',
  authorizeRoles('ADMIN', 'PROJECT_MANAGER'),
  projectController.removeProjectMember
);

module.exports = router;
