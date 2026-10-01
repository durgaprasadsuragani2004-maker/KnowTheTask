const { query } = require('../config/db');

/**
 * GET /api/analytics/dashboard
 * Role-scoped comprehensive analytics for Admin, Project Manager, and Team Member
 */
async function getDashboardAnalytics(req, res, next) {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'ADMIN') {
      // 1. Project stats
      const projStatsRes = await query(`
        SELECT 
          COUNT(*) AS total_projects,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS active_projects,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_projects,
          COUNT(*) FILTER (WHERE status = 'PLANNING') AS planning_projects,
          COUNT(*) FILTER (WHERE status = 'ON_HOLD') AS on_hold_projects
        FROM projects
      `);
      const projStats = projStatsRes.rows[0];

      // 2. Task stats
      const taskStatsRes = await query(`
        SELECT 
          COUNT(*) AS total_tasks,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_tasks,
          COUNT(*) FILTER (WHERE status != 'COMPLETED') AS pending_tasks,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'REVIEW') AS review_tasks,
          COUNT(*) FILTER (WHERE status = 'TODO') AS todo_tasks
        FROM tasks
      `);
      const taskStats = taskStatsRes.rows[0];

      // 3. Member stats
      const memberStatsRes = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE role = 'TEAM_MEMBER') AS total_members,
          COUNT(*) FILTER (WHERE role = 'TEAM_MEMBER' AND is_active = true) AS active_members,
          COUNT(*) FILTER (WHERE role = 'TEAM_MEMBER' AND is_active = false) AS inactive_members,
          COUNT(*) FILTER (WHERE role = 'PROJECT_MANAGER') AS total_managers,
          COUNT(*) FILTER (WHERE role = 'PROJECT_MANAGER' AND is_active = true) AS active_managers,
          COUNT(*) FILTER (WHERE role = 'PROJECT_MANAGER' AND is_active = false) AS inactive_managers
        FROM users
      `);
      const memberStats = memberStatsRes.rows[0];

      // 4. Tasks by Status
      const statusRes = await query(`
        SELECT status, COUNT(*) AS count
        FROM tasks
        GROUP BY status
      `);
      const statusMap = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, COMPLETED: 0 };
      statusRes.rows.forEach((r) => {
        statusMap[r.status] = parseInt(r.count, 10);
      });
      const tasksByStatus = [
        { status: 'TODO', label: 'To Do', count: statusMap.TODO, fill: '#64748b' },
        { status: 'IN_PROGRESS', label: 'In Progress', count: statusMap.IN_PROGRESS, fill: '#2563eb' },
        { status: 'REVIEW', label: 'In Review', count: statusMap.REVIEW, fill: '#d97706' },
        { status: 'COMPLETED', label: 'Completed', count: statusMap.COMPLETED, fill: '#059669' },
      ];

      // 5. Tasks by Priority
      const priorityRes = await query(`
        SELECT priority, COUNT(*) AS count
        FROM tasks
        GROUP BY priority
      `);
      const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
      priorityRes.rows.forEach((r) => {
        priorityMap[r.priority] = parseInt(r.count, 10);
      });
      const tasksByPriority = [
        { priority: 'LOW', label: 'Low', count: priorityMap.LOW, fill: '#94a3b8' },
        { priority: 'MEDIUM', label: 'Medium', count: priorityMap.MEDIUM, fill: '#3b82f6' },
        { priority: 'HIGH', label: 'High', count: priorityMap.HIGH, fill: '#f59e0b' },
        { priority: 'URGENT', label: 'Urgent', count: priorityMap.URGENT, fill: '#ef4444' },
      ];

      // 6. Project Status breakdown
      const projBreakdownRes = await query(`
        SELECT status, COUNT(*) AS count
        FROM projects
        GROUP BY status
      `);
      const projMap = { PLANNING: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0 };
      projBreakdownRes.rows.forEach((r) => {
        projMap[r.status] = parseInt(r.count, 10);
      });
      const projectsByStatus = [
        { status: 'PLANNING', label: 'Planning', count: projMap.PLANNING, fill: '#8b5cf6' },
        { status: 'IN_PROGRESS', label: 'Active', count: projMap.IN_PROGRESS, fill: '#0284c7' },
        { status: 'COMPLETED', label: 'Completed', count: projMap.COMPLETED, fill: '#10b981' },
        { status: 'ON_HOLD', label: 'On Hold', count: projMap.ON_HOLD, fill: '#f97316' },
      ];

      // 7. Deadline Analytics (Part 7)
      const deadlineRes = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'COMPLETED') AS overdue,
          COUNT(*) FILTER (WHERE deadline >= CURRENT_DATE AND deadline <= CURRENT_DATE + INTERVAL '2 days' AND status != 'COMPLETED') AS due_soon,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE deadline > CURRENT_DATE + INTERVAL '2 days' AND status != 'COMPLETED') AS upcoming,
          COUNT(*) FILTER (WHERE deadline IS NULL AND status != 'COMPLETED') AS no_deadline
        FROM tasks
      `);
      const deadlineStats = deadlineRes.rows[0];

      return res.status(200).json({
        success: true,
        role: userRole,
        projects: {
          total: parseInt(projStats.total_projects, 10),
          active: parseInt(projStats.active_projects, 10),
          completed: parseInt(projStats.completed_projects, 10),
          planning: parseInt(projStats.planning_projects, 10),
          on_hold: parseInt(projStats.on_hold_projects, 10),
        },
        tasks: {
          total: parseInt(taskStats.total_tasks, 10),
          completed: parseInt(taskStats.completed_tasks, 10),
          pending: parseInt(taskStats.pending_tasks, 10),
          in_progress: parseInt(taskStats.in_progress_tasks, 10),
          review: parseInt(taskStats.review_tasks, 10),
          todo: parseInt(taskStats.todo_tasks, 10),
        },
        members: {
          total: parseInt(memberStats.total_members, 10),
          active: parseInt(memberStats.active_members, 10),
          inactive: parseInt(memberStats.inactive_members, 10),
          total_managers: parseInt(memberStats.total_managers, 10),
          active_managers: parseInt(memberStats.active_managers, 10),
          inactive_managers: parseInt(memberStats.inactive_managers, 10),
        },
        deadlines: {
          overdue: parseInt(deadlineStats.overdue, 10),
          due_soon: parseInt(deadlineStats.due_soon, 10),
          completed: parseInt(deadlineStats.completed, 10),
          upcoming: parseInt(deadlineStats.upcoming, 10),
          no_deadline: parseInt(deadlineStats.no_deadline, 10),
        },
        tasksByStatus,
        tasksByPriority,
        projectsByStatus,
      });
    }

    if (userRole === 'PROJECT_MANAGER') {
      // Scoped to projects managed or created by the PM
      const pmProjFilter = `(p.manager_id = $1 OR p.created_by = $1 OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $1))`;

      const projStatsRes = await query(`
        SELECT 
          COUNT(*) AS total_projects,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS active_projects,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_projects,
          COUNT(*) FILTER (WHERE status = 'PLANNING') AS planning_projects,
          COUNT(*) FILTER (WHERE status = 'ON_HOLD') AS on_hold_projects
        FROM projects p
        WHERE ${pmProjFilter}
      `, [userId]);
      const projStats = projStatsRes.rows[0];

      const taskStatsRes = await query(`
        SELECT 
          COUNT(*) AS total_tasks,
          COUNT(*) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks,
          COUNT(*) FILTER (WHERE t.status != 'COMPLETED') AS pending_tasks,
          COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS') AS in_progress_tasks,
          COUNT(*) FILTER (WHERE t.status = 'REVIEW') AS review_tasks,
          COUNT(*) FILTER (WHERE t.status = 'TODO') AS todo_tasks
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE ${pmProjFilter}
      `, [userId]);
      const taskStats = taskStatsRes.rows[0];

      // Members on PM's projects
      const memberStatsRes = await query(`
        SELECT 
          COUNT(DISTINCT u.id) AS total_members,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) AS active_members,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = false) AS inactive_members
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        JOIN projects p ON pm.project_id = p.id
        WHERE ${pmProjFilter} AND u.role = 'TEAM_MEMBER'
      `, [userId]);
      const memberStats = memberStatsRes.rows[0];

      // Tasks by status
      const statusRes = await query(`
        SELECT t.status, COUNT(*) AS count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE ${pmProjFilter}
        GROUP BY t.status
      `, [userId]);
      const statusMap = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, COMPLETED: 0 };
      statusRes.rows.forEach((r) => {
        statusMap[r.status] = parseInt(r.count, 10);
      });
      const tasksByStatus = [
        { status: 'TODO', label: 'To Do', count: statusMap.TODO, fill: '#64748b' },
        { status: 'IN_PROGRESS', label: 'In Progress', count: statusMap.IN_PROGRESS, fill: '#2563eb' },
        { status: 'REVIEW', label: 'In Review', count: statusMap.REVIEW, fill: '#d97706' },
        { status: 'COMPLETED', label: 'Completed', count: statusMap.COMPLETED, fill: '#059669' },
      ];

      // Tasks by priority
      const priorityRes = await query(`
        SELECT t.priority, COUNT(*) AS count
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE ${pmProjFilter}
        GROUP BY t.priority
      `, [userId]);
      const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
      priorityRes.rows.forEach((r) => {
        priorityMap[r.priority] = parseInt(r.count, 10);
      });
      const tasksByPriority = [
        { priority: 'LOW', label: 'Low', count: priorityMap.LOW, fill: '#94a3b8' },
        { priority: 'MEDIUM', label: 'Medium', count: priorityMap.MEDIUM, fill: '#3b82f6' },
        { priority: 'HIGH', label: 'High', count: priorityMap.HIGH, fill: '#f59e0b' },
        { priority: 'URGENT', label: 'Urgent', count: priorityMap.URGENT, fill: '#ef4444' },
      ];

      // Projects by status
      const projBreakdownRes = await query(`
        SELECT status, COUNT(*) AS count
        FROM projects p
        WHERE ${pmProjFilter}
        GROUP BY status
      `, [userId]);
      const projMap = { PLANNING: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0 };
      projBreakdownRes.rows.forEach((r) => {
        projMap[r.status] = parseInt(r.count, 10);
      });
      const projectsByStatus = [
        { status: 'PLANNING', label: 'Planning', count: projMap.PLANNING, fill: '#8b5cf6' },
        { status: 'IN_PROGRESS', label: 'Active', count: projMap.IN_PROGRESS, fill: '#0284c7' },
        { status: 'COMPLETED', label: 'Completed', count: projMap.COMPLETED, fill: '#10b981' },
        { status: 'ON_HOLD', label: 'On Hold', count: projMap.ON_HOLD, fill: '#f97316' },
      ];

      // Deadlines
      const deadlineRes = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE t.deadline < CURRENT_DATE AND t.status != 'COMPLETED') AS overdue,
          COUNT(*) FILTER (WHERE t.deadline >= CURRENT_DATE AND t.deadline <= CURRENT_DATE + INTERVAL '2 days' AND t.status != 'COMPLETED') AS due_soon,
          COUNT(*) FILTER (WHERE t.status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE t.deadline > CURRENT_DATE + INTERVAL '2 days' AND t.status != 'COMPLETED') AS upcoming,
          COUNT(*) FILTER (WHERE t.deadline IS NULL AND t.status != 'COMPLETED') AS no_deadline
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE ${pmProjFilter}
      `, [userId]);
      const deadlineStats = deadlineRes.rows[0];

      return res.status(200).json({
        success: true,
        role: userRole,
        projects: {
          total: parseInt(projStats.total_projects, 10),
          active: parseInt(projStats.active_projects, 10),
          completed: parseInt(projStats.completed_projects, 10),
          planning: parseInt(projStats.planning_projects, 10),
          on_hold: parseInt(projStats.on_hold_projects, 10),
        },
        tasks: {
          total: parseInt(taskStats.total_tasks, 10),
          completed: parseInt(taskStats.completed_tasks, 10),
          pending: parseInt(taskStats.pending_tasks, 10),
          in_progress: parseInt(taskStats.in_progress_tasks, 10),
          review: parseInt(taskStats.review_tasks, 10),
          todo: parseInt(taskStats.todo_tasks, 10),
        },
        members: {
          total: parseInt(memberStats.total_members || '0', 10),
          active: parseInt(memberStats.active_members || '0', 10),
          inactive: parseInt(memberStats.inactive_members || '0', 10),
        },
        deadlines: {
          overdue: parseInt(deadlineStats.overdue, 10),
          due_soon: parseInt(deadlineStats.due_soon, 10),
          completed: parseInt(deadlineStats.completed, 10),
          upcoming: parseInt(deadlineStats.upcoming, 10),
          no_deadline: parseInt(deadlineStats.no_deadline, 10),
        },
        tasksByStatus,
        tasksByPriority,
        projectsByStatus,
      });
    }

    // Role = TEAM_MEMBER
    // Scoped strictly to projects they belong to, and tasks assigned to them
    const projStatsRes = await query(`
      SELECT 
        COUNT(DISTINCT p.id) AS total_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'IN_PROGRESS') AS active_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'COMPLETED') AS completed_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'PLANNING') AS planning_projects,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'ON_HOLD') AS on_hold_projects
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1
    `, [userId]);
    const projStats = projStatsRes.rows[0];

    const taskStatsRes = await query(`
      SELECT 
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_tasks,
        COUNT(*) FILTER (WHERE status != 'COMPLETED') AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'REVIEW') AS review_tasks,
        COUNT(*) FILTER (WHERE status = 'TODO') AS todo_tasks
      FROM tasks
      WHERE assigned_to = $1
    `, [userId]);
    const taskStats = taskStatsRes.rows[0];

    // Tasks by status
    const statusRes = await query(`
      SELECT status, COUNT(*) AS count
      FROM tasks
      WHERE assigned_to = $1
      GROUP BY status
    `, [userId]);
    const statusMap = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, COMPLETED: 0 };
    statusRes.rows.forEach((r) => {
      statusMap[r.status] = parseInt(r.count, 10);
    });
    const tasksByStatus = [
      { status: 'TODO', label: 'To Do', count: statusMap.TODO, fill: '#64748b' },
      { status: 'IN_PROGRESS', label: 'In Progress', count: statusMap.IN_PROGRESS, fill: '#2563eb' },
      { status: 'REVIEW', label: 'In Review', count: statusMap.REVIEW, fill: '#d97706' },
      { status: 'COMPLETED', label: 'Completed', count: statusMap.COMPLETED, fill: '#059669' },
    ];

    // Tasks by priority
    const priorityRes = await query(`
      SELECT priority, COUNT(*) AS count
      FROM tasks
      WHERE assigned_to = $1
      GROUP BY priority
    `, [userId]);
    const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    priorityRes.rows.forEach((r) => {
      priorityMap[r.priority] = parseInt(r.count, 10);
    });
    const tasksByPriority = [
      { priority: 'LOW', label: 'Low', count: priorityMap.LOW, fill: '#94a3b8' },
      { priority: 'MEDIUM', label: 'Medium', count: priorityMap.MEDIUM, fill: '#3b82f6' },
      { priority: 'HIGH', label: 'High', count: priorityMap.HIGH, fill: '#f59e0b' },
      { priority: 'URGENT', label: 'Urgent', count: priorityMap.URGENT, fill: '#ef4444' },
    ];

    // Projects by status
    const projBreakdownRes = await query(`
      SELECT p.status, COUNT(DISTINCT p.id) AS count
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1
      GROUP BY p.status
    `, [userId]);
    const projMap = { PLANNING: 0, IN_PROGRESS: 0, COMPLETED: 0, ON_HOLD: 0 };
    projBreakdownRes.rows.forEach((r) => {
      projMap[r.status] = parseInt(r.count, 10);
    });
    const projectsByStatus = [
      { status: 'PLANNING', label: 'Planning', count: projMap.PLANNING, fill: '#8b5cf6' },
      { status: 'IN_PROGRESS', label: 'Active', count: projMap.IN_PROGRESS, fill: '#0284c7' },
      { status: 'COMPLETED', label: 'Completed', count: projMap.COMPLETED, fill: '#10b981' },
      { status: 'ON_HOLD', label: 'On Hold', count: projMap.ON_HOLD, fill: '#f97316' },
    ];

    // Deadlines
    const deadlineRes = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'COMPLETED') AS overdue,
        COUNT(*) FILTER (WHERE deadline >= CURRENT_DATE AND deadline <= CURRENT_DATE + INTERVAL '2 days' AND status != 'COMPLETED') AS due_soon,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
        COUNT(*) FILTER (WHERE deadline > CURRENT_DATE + INTERVAL '2 days' AND status != 'COMPLETED') AS upcoming,
        COUNT(*) FILTER (WHERE deadline IS NULL AND status != 'COMPLETED') AS no_deadline
      FROM tasks
      WHERE assigned_to = $1
    `, [userId]);
    const deadlineStats = deadlineRes.rows[0];

    return res.status(200).json({
      success: true,
      role: userRole,
      projects: {
        total: parseInt(projStats.total_projects, 10),
        active: parseInt(projStats.active_projects, 10),
        completed: parseInt(projStats.completed_projects, 10),
        planning: parseInt(projStats.planning_projects, 10),
        on_hold: parseInt(projStats.on_hold_projects, 10),
      },
      tasks: {
        total: parseInt(taskStats.total_tasks, 10),
        completed: parseInt(taskStats.completed_tasks, 10),
        pending: parseInt(taskStats.pending_tasks, 10),
        in_progress: parseInt(taskStats.in_progress_tasks, 10),
        review: parseInt(taskStats.review_tasks, 10),
        todo: parseInt(taskStats.todo_tasks, 10),
      },
      deadlines: {
        overdue: parseInt(deadlineStats.overdue, 10),
        due_soon: parseInt(deadlineStats.due_soon, 10),
        completed: parseInt(deadlineStats.completed, 10),
        upcoming: parseInt(deadlineStats.upcoming, 10),
        no_deadline: parseInt(deadlineStats.no_deadline, 10),
      },
      tasksByStatus,
      tasksByPriority,
      projectsByStatus,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardAnalytics,
};
