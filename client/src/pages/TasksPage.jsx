import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { taskService, projectService, userService } from '../services/dataService';
import { formatStatus, formatDate, formatRole } from '../utils/formatters';
import { Link } from 'react-router-dom';
import TaskDetailsModal from '../components/TaskDetailsModal';
import Pagination from '../components/Pagination';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  User,
  AlertCircle,
  X,
  Edit,
  Trash2,
  Eye,
  Clock,
  Filter,
  ArrowUpDown,
  Kanban,
} from 'lucide-react';

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Project members cache for the currently selected project in task form
  const [currentProjectMembers, setCurrentProjectMembers] = useState([]);

  // Task form state
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'MEDIUM',
    status: 'TODO',
    deadline: '',
  });
  const [formError, setFormError] = useState('');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await taskService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        project_id: projectFilter || undefined,
        assigned_to: assignedFilter || undefined,
        sort: sortOrder,
        page,
        limit: 10,
      });
      if (res.success) {
        setTasks(res.tasks || []);
        setTotalPages(res.totalPages || 1);
        setTotalTasks(res.total !== undefined ? res.total : (res.tasks?.length || 0));
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        projectService.getAll(),
        userService.getAssignable({ role: 'TEAM_MEMBER' }),
      ]);
      if (projRes.success) setProjects(projRes.projects || []);
      if (userRes.success) {
        // Only show Active Team Members in assignee list / filters
        setUsers(userRes.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, priorityFilter, projectFilter, assignedFilter, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, projectFilter, assignedFilter, sortOrder]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  // When selected project changes in Task creation form, fetch project members
  useEffect(() => {
    async function loadProjectMembers() {
      if (!formData.project_id) {
        setCurrentProjectMembers([]);
        return;
      }
      try {
        const res = await projectService.getById(formData.project_id);
        if (res.success && res.project?.members) {
          // Strictly allow ONLY Active Team Members belonging to this project (Critical Fix Part 1)
          setCurrentProjectMembers(
            res.project.members.filter((m) => m.role === 'TEAM_MEMBER' && m.is_active !== false)
          );
        }
      } catch (err) {
        console.error('Error fetching project members for task assignment:', err);
      }
    }

    loadProjectMembers();
  }, [formData.project_id]);

  const openCreateModal = () => {
    const defaultProjId = projects.length > 0 ? projects[0].id : '';
    setFormData({
      project_id: defaultProjId,
      title: '',
      description: '',
      assigned_to: '',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: '',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = async (task) => {
    setEditingTaskId(task.id);
    setFormData({
      project_id: task.project_id,
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      status: task.status,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
    });
    setFormError('');
    if (task.project_id) {
      try {
        const res = await projectService.getById(task.project_id);
        if (res.success && res.project?.members) {
          // Allow active members + retain currently assigned user even if inactive
          setCurrentProjectMembers(
            res.project.members.filter(
              (m) => m.role === 'TEAM_MEMBER' && (m.is_active !== false || m.id === task.assigned_to)
            )
          );
        }
      } catch (err) {
        console.error('Error loading project members for edit:', err);
      }
    }
    setIsEditModalOpen(true);
  };

  const openDetailsModal = async (task) => {
    try {
      const res = await taskService.getById(task.id);
      if (res.success) {
        setSelectedTask(res.task);
        setIsDetailsModalOpen(true);
      }
    } catch (err) {
      setSelectedTask(task);
      setIsDetailsModalOpen(true);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Failed to update task status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Task title is required.');
      return;
    }
    if (!formData.project_id) {
      setFormError('Please select a project.');
      return;
    }

    if (formData.deadline) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (formData.deadline < todayStr) {
        setFormError('Task deadline cannot be earlier than the task creation date.');
        return;
      }
    }

    try {
      await taskService.create({
        ...formData,
        assigned_to: formData.assigned_to || null,
        deadline: formData.deadline || null,
      });
      setIsCreateModalOpen(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    if (formData.deadline) {
      const originalTask = tasks.find((t) => t.id === editingTaskId);
      const creationDateStr = originalTask?.created_at
        ? new Date(originalTask.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      if (formData.deadline < creationDateStr) {
        setFormError('Task deadline cannot be earlier than the task creation date.');
        return;
      }
    }

    try {
      await taskService.update(editingTaskId, {
        ...formData,
        assigned_to: formData.assigned_to || null,
        deadline: formData.deadline || null,
      });
      setIsEditModalOpen(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update task.');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskService.delete(taskId);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Tasks & Deliverables</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track execution progress, priorities, and assignments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to="/kanban"
            className="inline-flex items-center px-3.5 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Kanban className="w-3.5 h-3.5 mr-1.5" />
            <span>Kanban Board</span>
          </Link>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title, description or assignee..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-950"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Assigned User Filter - Hidden for Team Member (Bug 5 & Bug 10) */}
          {user?.role !== 'TEAM_MEMBER' && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
            >
              <option value="">All Assignees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Sorting */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="deadline_asc">Due Date (Soonest)</option>
            <option value="deadline_desc">Due Date (Latest)</option>
            <option value="priority">Priority (Urgent First)</option>
          </select>

        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center p-8">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-navy-950">No tasks found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => {
                  const canEdit =
                    user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

                  const canDelete =
                    user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => openDetailsModal(t)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy-950 group-hover:text-navy-900 transition-colors">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-slate-500 line-clamp-1 text-[11px] mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {t.project_name}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-navy-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {t.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <span>
                            {t.assignee_name || (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </span>
                          {t.assignee_is_active === false && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></span>
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(t.deadline)}
                      </td>

                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className="text-xs font-semibold bg-white border border-slate-300 text-navy-950 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>

                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openDetailsModal(t)}
                            className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                            title="View task details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                              title="Edit task"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && tasks.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalTasks}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-navy-950">Create New Task</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-navy-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Add deliverable and assign to authorized project member.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 bg-slate-50 border-l-4 border-navy-950 text-xs text-navy-950 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Project *
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value, assigned_to: '' })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Implement schema migration and foreign keys"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deliverable specifications, acceptance criteria..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              {/* CRITICAL: Assignee list contains ONLY members belonging to selected project */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign To (Project Members Only)
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                >
                  <option value="">Unassigned</option>
                  {currentProjectMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({formatRole(m.role)})
                    </option>
                  ))}
                </select>
                {formData.project_id && currentProjectMembers.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    No members currently assigned to this project. You can assign members on the project details page.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  />
                </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-navy-950">Edit Task</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-navy-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-slate-50 border-l-4 border-navy-950 text-xs text-navy-950 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              {user?.role !== 'TEAM_MEMBER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="">Unassigned</option>
                    {currentProjectMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({formatRole(m.role)}){m.is_active === false ? ' — Inactive' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  min={
                    tasks.find((t) => t.id === editingTaskId)?.created_at
                      ? new Date(tasks.find((t) => t.id === editingTaskId).created_at)
                          .toISOString()
                          .split('T')[0]
                      : new Date().toISOString().split('T')[0]
                  }
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal with Comments & Activity History (Parts 3, 4, 5) */}
      {isDetailsModalOpen && selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={fetchTasks}
        />
      )}

    </div>
  );
}
