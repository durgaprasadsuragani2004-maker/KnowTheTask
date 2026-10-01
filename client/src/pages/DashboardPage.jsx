import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../hooks/useAuth';
import { projectService, taskService, analyticsService, userService } from '../services/dataService';
import StatCard from '../components/StatCard';
import { formatRole, formatStatus, formatDate, formatPriority } from '../utils/formatters';
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
  Briefcase,
  UserCheck,
  UserX,
  Eye,
  X,
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
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Workload details modal (Part 17 & 18)
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
  const [workloadUser, setWorkloadUser] = useState(null);
  const [workloadData, setWorkloadData] = useState(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [projRes, taskRes, analyticsRes, workloadRes] = await Promise.all([
        projectService.getAll(),
        taskService.getAll(),
        analyticsService.getDashboard(),
        analyticsService.getWorkload().catch(() => ({ success: false })),
      ]);

      if (projRes.success) setProjects(projRes.projects || []);
      if (taskRes.success) setTasks(taskRes.tasks || []);
      if (analyticsRes.success) setAnalytics(analyticsRes);
      if (workloadRes && workloadRes.success) setWorkload(workloadRes);
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

  const openWorkloadModal = async (u) => {
    setWorkloadUser(u);
    setIsWorkloadModalOpen(true);
    setLoadingWorkload(true);
    try {
      const res = await userService.getWorkload(u.id);
      if (res.success) {
        setWorkloadData(res);
      }
    } catch (err) {
      console.error('Error fetching workload:', err);
    } finally {
      setLoadingWorkload(false);
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

  const totalOrgUsers = (memberStats.total_members || 0) + (memberStats.total_managers || 0) + 1;
  const activeOrgUsers = (memberStats.active_members || 0) + (memberStats.active_managers || 0) + 1;
  const inactiveOrgUsers = (memberStats.inactive_members || 0) + (memberStats.inactive_managers || 0);

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
                'Global administrator oversight: manage organization hierarchy, users, workload, and platform metrics.'}
              {user?.role === 'PROJECT_MANAGER' &&
                'Authorized project management: oversee projects, assign active team members, and monitor delivery workload.'}
              {user?.role === 'TEAM_MEMBER' &&
                'Individual contributor workspace: view assigned tasks, update completion statuses, and meet deadlines.'}
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

      {/* ADMIN ORGANIZATION OVERVIEW CARDS (Part 19) */}
      {user?.role === 'ADMIN' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-navy-950" />
                <span>Organization Hierarchy & Resource Summary</span>
              </h2>
              <p className="text-xs text-slate-500">Live PostgreSQL organization-level metric breakdown</p>
            </div>
            <Link
              to="/users"
              className="text-xs font-semibold text-navy-900 hover:underline flex items-center gap-1"
            >
              <span>Manage Users</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Users Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-navy-950 text-sm flex items-center justify-between">
                <span>Total Users</span>
                <span className="text-base text-navy-950">{totalOrgUsers}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Active Users</span>
                  <strong className="text-emerald-700">{activeOrgUsers}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Inactive Users</span>
                  <strong className="text-rose-600">{inactiveOrgUsers}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Project Managers</span>
                  <strong className="text-navy-950">{memberStats.total_managers}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Team Members</span>
                  <strong className="text-navy-950">{memberStats.total_members}</strong>
                </div>
              </div>
            </div>

            {/* Projects Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-navy-950 text-sm flex items-center justify-between">
                <span>Total Projects</span>
                <span className="text-base text-navy-950">{projStats.total}</span>
              </div>
              <div className="space-y-1 pt-1 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Active Projects</span>
                  <strong className="text-blue-700">{projStats.active}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Planning Phase</span>
                  <strong className="text-purple-700">{projStats.planning}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Completed Projects</span>
                  <strong className="text-emerald-700">{projStats.completed}</strong>
                </div>
              </div>
            </div>

            {/* Tasks Breakdown */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-navy-950 text-sm flex items-center justify-between">
                <span>Total Tasks</span>
                <span className="text-base text-navy-950">{taskStats.total}</span>
              </div>
              <div className="space-y-1 pt-1 text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Active Tasks</span>
                  <strong className="text-blue-700">{taskStats.in_progress + taskStats.todo + taskStats.review}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Completed Tasks</span>
                  <strong className="text-emerald-700">{taskStats.completed}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Overdue Tasks</span>
                  <strong className="text-rose-600">{deadlineStats.overdue}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT MANAGER WORKLOAD TABLE (Part 15 & 19: Admin view of PM workload) */}
      {user?.role === 'ADMIN' && workload?.managers && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-navy-950" />
                <span>Project Manager Workload</span>
              </h2>
              <p className="text-xs text-slate-500">Live project and task allocations per Project Manager</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {workload.managers.length} Managers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Manager Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Projects</th>
                  <th className="py-2.5 px-3 text-center">Tasks</th>
                  <th className="py-2.5 px-3 text-center">Active Tasks</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workload.managers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400 italic">No Project Managers registered</td>
                  </tr>
                ) : (
                  workload.managers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-navy-950">
                        <div>{m.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{m.email}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {m.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-navy-950">{m.projects_count}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{m.tasks_count}</td>
                      <td className="py-2.5 px-3 text-center text-blue-700 font-bold">{m.active_tasks_count}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${m.overdue_tasks_count > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {m.overdue_tasks_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => openWorkloadModal(m)}
                          className="inline-flex items-center px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-navy-950 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TEAM MEMBER WORKLOAD TABLE (Part 16 & 19: Admin and PM view) */}
      {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && workload?.members && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-navy-950" />
                <span>Team Member Workload</span>
              </h2>
              <p className="text-xs text-slate-500">
                {user?.role === 'ADMIN'
                  ? 'All organization team members and assigned deliverables'
                  : 'Team members participating in your managed projects'}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {workload.members.length} Members
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Projects</th>
                  <th className="py-2.5 px-3 text-center">Assigned Tasks</th>
                  <th className="py-2.5 px-3 text-center">Active Tasks</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workload.members.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400 italic">No team members assigned</td>
                  </tr>
                ) : (
                  workload.members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-navy-950">
                        <div>{m.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{m.email}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {m.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-navy-950">{m.projects_count}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{m.tasks_count}</td>
                      <td className="py-2.5 px-3 text-center text-blue-700 font-bold">{m.active_tasks_count}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${m.overdue_tasks_count > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {m.overdue_tasks_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => openWorkloadModal(m)}
                          className="inline-flex items-center px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-navy-950 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deadline & Velocity Breakdown Row */}
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
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-rose-700 font-semibold text-[11px] uppercase tracking-wider">Overdue</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-900 mt-1">
              {loading ? '...' : deadlineStats.overdue}
            </div>
            <p className="text-[11px] text-rose-600 mt-0.5">Past deadline & incomplete</p>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-amber-800 font-semibold text-[11px] uppercase tracking-wider">Due Soon</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">
              {loading ? '...' : deadlineStats.due_soon}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">Due in the next 2 days</p>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-semibold text-[11px] uppercase tracking-wider">Upcoming</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-950 mt-1">
              {loading ? '...' : deadlineStats.upcoming}
            </div>
            <p className="text-[11px] text-blue-600 mt-0.5">Scheduled for future dates</p>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-semibold text-[11px] uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-1">
              {loading ? '...' : deadlineStats.completed}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Successfully finished</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
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
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : taskStats.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No tasks available to visualize</div>
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
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : taskStats.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No tasks available to visualize</div>
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
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : projStats.total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No projects available to visualize</div>
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
                  <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
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

      {/* WORKLOAD DETAILS MODAL (Parts 17 & 18) */}
      {isWorkloadModalOpen && workloadUser && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
                  <span>Workload Details</span>
                  <span className="text-xs font-normal text-slate-500">— {workloadUser.name}</span>
                </h2>
                <p className="text-xs text-slate-500">Objective allocation breakdown</p>
              </div>
              <button
                onClick={() => setIsWorkloadModalOpen(false)}
                className="text-slate-400 hover:text-navy-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingWorkload ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading workload metrics...</div>
            ) : workloadData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-navy-950 text-white font-bold flex items-center justify-center text-sm">
                      {workloadUser.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-navy-950 text-sm">{workloadUser.name}</div>
                      <div className="text-xs text-slate-500">{workloadUser.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-navy-950">
                      {formatRole(workloadUser.role)}
                    </span>
                    {workloadUser.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">Projects</span>
                    <span className="text-xl font-bold text-navy-950 mt-1 block">
                      {workloadData.workload.projects_count}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">Active Tasks</span>
                    <span className="text-xl font-bold text-blue-700 mt-1 block">
                      {workloadData.workload.active_tasks_count}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">Completed Tasks</span>
                    <span className="text-xl font-bold text-emerald-700 mt-1 block">
                      {workloadData.workload.completed_tasks_count}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">Overdue Tasks</span>
                    <span className={`text-xl font-bold mt-1 block ${
                      workloadData.workload.overdue_tasks_count > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {workloadData.workload.overdue_tasks_count}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-navy-950" />
                    <span>Projects ({workloadData.projects?.length || 0})</span>
                  </h4>
                  {workloadData.projects?.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">No projects assigned</div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Project Name</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Deadline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {workloadData.projects.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-navy-950">{p.name}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                                  {formatStatus(p.status)}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-slate-500">{formatDate(p.deadline)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-navy-950" />
                    <span>Tasks ({workloadData.tasks?.length || 0})</span>
                  </h4>
                  {workloadData.tasks?.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">No tasks assigned</div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Task Title</th>
                            <th className="py-2 px-3">Project</th>
                            <th className="py-2 px-3">Priority</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {workloadData.tasks.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-medium text-navy-950">{t.title}</td>
                              <td className="py-2 px-3 text-slate-500">{t.project_name || '—'}</td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] font-semibold text-slate-600">{formatPriority(t.priority)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  t.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : t.status === 'IN_PROGRESS'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {formatStatus(t.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWorkloadModalOpen(false)}
                className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
