import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import { projectService, taskService, analyticsService } from '../services/dataService';
import StatCard from '../components/StatCard';
import { formatRole, formatStatus, formatDate } from '../utils/formatters';
import {
  FolderKanban,
  CheckSquare,
  CheckCircle2,
  Users,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [projRes, taskRes, analyticsRes] = await Promise.all([
        projectService.getAll(),
        taskService.getAll(),
        analyticsService.getDashboard(),
      ]);

      if (projRes.success) setProjects(projRes.projects || []);
      if (taskRes.success) setTasks(taskRes.tasks || []);
      if (analyticsRes.success) setAnalytics(analyticsRes);
    } catch (err) {
      setError('Failed to fetch dashboard data from server.');
      console.error('Dashboard fetchData error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refetch when user switches tabs or refocuses window
    const handleFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, user?.id, user?.role]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      await fetchData(true);
    } catch (err) {
      alert('Failed to update task status: ' + (err.response?.data?.message || err.message));
    }
  };

  const projStats = analytics?.projects || {
    total: projects.length,
    active: 0,
    completed: 0,
    planning: 0,
    on_hold: 0,
  };

  const taskStats = analytics?.tasks || {
    total: tasks.length,
    completed: 0,
    pending: 0,
    in_progress: 0,
    review: 0,
    todo: 0,
  };

  const memberStats = analytics?.members || {
    total: 0,
    active: 0,
    inactive: 0,
    total_managers: 0,
    active_managers: 0,
    inactive_managers: 0,
  };

  const deadlineStats = analytics?.deadlines || {
    overdue: 0,
    due_soon: 0,
    completed: 0,
    upcoming: 0,
    no_deadline: 0,
  };

  const completionRate =
    taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  const tasksByStatusData = analytics?.tasksByStatus || [
    { label: 'To Do', count: taskStats.todo, fill: '#64748b' },
    { label: 'In Progress', count: taskStats.in_progress, fill: '#2563eb' },
    { label: 'In Review', count: taskStats.review, fill: '#d97706' },
    { label: 'Completed', count: taskStats.completed, fill: '#059669' },
  ];

  const tasksByPriorityData = analytics?.tasksByPriority || [
    { label: 'Low', count: 0, fill: '#94a3b8' },
    { label: 'Medium', count: 0, fill: '#3b82f6' },
    { label: 'High', count: 0, fill: '#f59e0b' },
    { label: 'Urgent', count: 0, fill: '#ef4444' },
  ];

  const projectsByStatusData = analytics?.projectsByStatus || [
    { label: 'Planning', count: projStats.planning, fill: '#8b5cf6' },
    { label: 'Active', count: projStats.active, fill: '#0284c7' },
    { label: 'Completed', count: projStats.completed, fill: '#10b981' },
    { label: 'On Hold', count: projStats.on_hold, fill: '#f97316' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-navy-950 text-white rounded">
                {formatRole(user?.role)} Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">PostgreSQL Live Data</span>
              {isRefreshing && (
                <span className="inline-flex items-center text-[11px] text-slate-400">
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  Syncing...
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-navy-950">Welcome back, {user?.name}</h1>
            <p className="text-sm text-slate-600 mt-1">
              {user?.role === 'ADMIN' &&
                'Global administrator access: manage projects, users, active validation, and platform metrics.'}
              {user?.role === 'PROJECT_MANAGER' &&
                'Authorized project management: assign team members, schedule deliverables, and track velocity.'}
              {user?.role === 'TEAM_MEMBER' &&
                'Individual contributor workspace: track assigned tasks, update completion statuses, and meet deadlines.'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchData(false)}
              disabled={loading || isRefreshing}
              className="px-3 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center cursor-pointer"
              title="Refresh dashboard from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/tasks"
              className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 transition-colors shadow-sm inline-flex items-center"
            >
              <span>View Tasks</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-slate-50 border-l-4 border-navy-950 rounded text-sm text-navy-950 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role-tailored Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'ADMIN' && (
          <>
            <StatCard
              title="Total Projects"
              value={loading ? '...' : projStats.total}
              subtitle={`${projStats.active} Active • ${projStats.planning} Planning`}
              icon={FolderKanban}
            />
            <StatCard
              title="Total Tasks"
              value={loading ? '...' : taskStats.total}
              subtitle={`${taskStats.in_progress} in progress • ${taskStats.pending} pending`}
              icon={CheckSquare}
            />
            <StatCard
              title="Team Members"
              value={loading ? '...' : memberStats.total}
              subtitle={`${memberStats.active} active • ${memberStats.inactive} inactive`}
              icon={Users}
            />
            <StatCard
              title="Completed Tasks"
              value={loading ? '...' : taskStats.completed}
              subtitle={`${completionRate}% completion rate`}
              icon={CheckCircle2}
            />
          </>
        )}

        {user?.role === 'PROJECT_MANAGER' && (
          <>
            <StatCard
              title="Managed Projects"
              value={loading ? '...' : projStats.total}
              subtitle={`${projStats.active} Active • ${projStats.completed} Completed`}
              icon={FolderKanban}
            />
            <StatCard
              title="Managed Tasks"
              value={loading ? '...' : taskStats.total}
              subtitle={`${taskStats.in_progress} in progress • ${taskStats.pending} pending`}
              icon={CheckSquare}
            />
            <StatCard
              title="Team Members"
              value={loading ? '...' : memberStats.total}
              subtitle={`${memberStats.active} active contributors`}
              icon={Users}
            />
            <StatCard
              title="Completed Tasks"
              value={loading ? '...' : taskStats.completed}
              subtitle={`${completionRate}% completion rate`}
              icon={CheckCircle2}
            />
          </>
        )}

        {user?.role === 'TEAM_MEMBER' && (
          <>
            <StatCard
              title="My Projects"
              value={loading ? '...' : projStats.total}
              subtitle={`${projStats.active} active workspaces`}
              icon={FolderKanban}
            />
            <StatCard
              title="Assigned Tasks"
              value={loading ? '...' : taskStats.total}
              subtitle={`${taskStats.pending} pending deliverables`}
              icon={CheckSquare}
            />
            <StatCard
              title="In Progress"
              value={loading ? '...' : taskStats.in_progress}
              subtitle="Active assignments"
              icon={Clock}
            />
            <StatCard
              title="Completed Tasks"
              value={loading ? '...' : taskStats.completed}
              subtitle={`${completionRate}% completed`}
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {/* Deadline & Velocity Breakdown Row (Part 7) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-navy-950 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-navy-950" />
              <span>Deadline Analytics & Velocity Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500">Live deadline tracking based on task schedules</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Overdue */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-rose-700 font-semibold text-[11px] uppercase tracking-wider">
                Overdue
              </span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-900 mt-1">
              {loading ? '...' : deadlineStats.overdue}
            </div>
            <p className="text-[11px] text-rose-600 mt-0.5">Past deadline & incomplete</p>
          </div>

          {/* Due Soon */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-semibold text-[11px] uppercase tracking-wider">
                Due Soon
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">
              {loading ? '...' : deadlineStats.due_soon}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">Due in the next 2 days</p>
          </div>

          {/* Upcoming */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-semibold text-[11px] uppercase tracking-wider">
                Upcoming
              </span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-950 mt-1">
              {loading ? '...' : deadlineStats.upcoming}
            </div>
            <p className="text-[11px] text-blue-600 mt-0.5">Scheduled for future dates</p>
          </div>

          {/* Completed */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-semibold text-[11px] uppercase tracking-wider">
                Completed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-1">
              {loading ? '...' : deadlineStats.completed}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Successfully finished</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid (Part 6 & 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks by Status Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-950 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-navy-950" />
                <span>Tasks by Status</span>
              </h2>
              <p className="text-[11px] text-slate-500">Distribution across workflow states</p>
            </div>
          </div>
          <div className="h-56 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading chart...
              </div>
            ) : taskStats.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No tasks available to visualize
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {tasksByStatusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tasks by Priority Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-950 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-navy-950" />
                <span>Tasks by Priority</span>
              </h2>
              <p className="text-[11px] text-slate-500">Urgency level breakdown</p>
            </div>
          </div>
          <div className="h-56 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading chart...
              </div>
            ) : taskStats.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No tasks available to visualize
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByPriorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {tasksByPriorityData.map((entry, index) => (
                      <Cell key={`cell-priority-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Projects Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-950 flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-navy-950" />
                <span>Projects Breakdown</span>
              </h2>
              <p className="text-[11px] text-slate-500">Lifecycle status of projects</p>
            </div>
          </div>
          <div className="h-56 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading chart...
              </div>
            ) : projStats.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                No projects available to visualize
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectsByStatusData.filter((d) => d.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {projectsByStatusData.map((entry, index) => (
                      <Cell key={`cell-proj-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Projects & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-navy-950">Recent Projects</h2>
              <p className="text-xs text-slate-500">Sorted by creation date (newest first)</p>
            </div>
            <Link to="/projects" className="text-xs font-semibold text-navy-900 hover:underline">
              View all ({projects.length})
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No projects found.</div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="block p-3.5 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-navy-950">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-slate-500 line-clamp-1">{p.description}</div>
                      )}
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                        <span>{p.member_count || 0} members</span>
                        <span>&bull;</span>
                        <span>{p.total_tasks || 0} tasks</span>
                        <span>&bull;</span>
                        <span>Due: {formatDate(p.deadline)}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-slate-100 text-navy-900 border border-slate-200 rounded-md font-semibold whitespace-nowrap">
                      {formatStatus(p.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-navy-950">Recent Tasks</h2>
              <p className="text-xs text-slate-500">Latest active deliverables</p>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-navy-900 hover:underline">
              View all ({tasks.length})
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No tasks assigned yet.</div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-navy-950">{t.title}</div>
                    <div className="text-xs text-slate-500">{t.project_name}</div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-navy-900">Priority: {t.priority}</span>
                      <span>&bull;</span>
                      <span>Due: {formatDate(t.deadline)}</span>
                    </div>
                  </div>

                  {/* Interactive Status Changer directly syncs with PATCH /api/tasks/:id/status */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="text-xs font-semibold bg-white border border-slate-300 text-navy-950 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-950 transition-colors cursor-pointer"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">In Review</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
