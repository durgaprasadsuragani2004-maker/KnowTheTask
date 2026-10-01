import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { projectService, taskService, userService } from '../services/dataService';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { formatStatus, formatDate, formatRole } from '../utils/formatters';
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckSquare,
  Plus,
  Trash2,
  Edit3,
  Clock,
  UserCheck,
  AlertCircle,
  X,
  UserPlus,
  Kanban,
  Eye,
} from 'lucide-react';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberError, setMemberError] = useState('');

  // Task form
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'MEDIUM',
    status: 'TODO',
    deadline: '',
  });
  const [taskError, setTaskError] = useState('');

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await projectService.getById(id);
      if (res.success) {
        setProject(res.project);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await userService.getAll();
      if (res.success) {
        // BUG 2 & 5 & Phase 3: Exclude users already in the project, ONLY show eligible active TEAM_MEMBER users (never Admin, never PM, never inactive)
        const existingMemberIds = new Set((project?.members || []).map((m) => m.id));
        const filtered = (res.users || []).filter(
          (u) => u.role === 'TEAM_MEMBER' && !existingMemberIds.has(u.id) && u.is_active !== false
        );
        setAvailableUsers(filtered);
        if (filtered.length > 0) setSelectedUserId(filtered[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  useEffect(() => {
    if (isAddMemberOpen && project) {
      fetchAvailableUsers();
    }
  }, [isAddMemberOpen, project]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!selectedUserId) {
      setMemberError('Please select a team member.');
      return;
    }

    try {
      await projectService.addMember(id, selectedUserId);
      setIsAddMemberOpen(false);
      setSelectedUserId('');
      fetchProjectDetails();
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }
    try {
      await projectService.removeMember(id, userId);
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    if (!taskData.title.trim()) {
      setTaskError('Task title is required.');
      return;
    }

    // BUG 8: Validate deadline is not in the past
    if (taskData.deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dl = new Date(taskData.deadline);
      dl.setHours(23, 59, 59, 999);
      if (dl < today) {
        setTaskError('Task deadline cannot be earlier than the task creation date.');
        return;
      }
    }

    try {
      await taskService.create({
        ...taskData,
        project_id: id,
        assigned_to: taskData.assigned_to || null,
      });
      setIsCreateTaskOpen(false);
      setTaskData({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: '',
      });
      fetchProjectDetails();
    } catch (err) {
      setTaskError(err.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const canManage =
    user?.role === 'ADMIN' ||
    (user?.role === 'PROJECT_MANAGER' &&
      (project?.manager_id === user?.id || project?.created_by === user?.id));

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500">
        Loading project details...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-navy-950">Project Not Found</h2>
        <p className="text-xs text-slate-600 mt-1 mb-4">{error || 'Unable to access project.'}</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Navigation */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-navy-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
      </div>

      {/* Project Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-navy-900 border border-slate-200 rounded font-semibold">
                {formatStatus(project.status)}
              </span>
              <span className="text-xs text-slate-500">
                Created {formatDate(project.created_at)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-navy-950">{project.name}</h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {canManage && (
              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="inline-flex items-center px-3.5 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Meta Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Project Manager</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-semibold text-navy-950">
                {project.manager_name || 'Unassigned'}
              </span>
              {project.manager_is_active === false && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></span>
                  Inactive
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Timeline</span>
            <span className="font-semibold text-navy-950 mt-0.5 block">
              {formatDate(project.start_date)} &ndash; {formatDate(project.deadline)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Team Members</span>
            <span className="font-semibold text-navy-950 mt-0.5 block">
              {project.member_count} assigned
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Progress</span>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-navy-950 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              <span className="font-bold text-navy-950">{project.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Team Members & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Team Members List (1 Column) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Team Members</h2>
              <p className="text-[11px] text-slate-500">People assigned to this project</p>
            </div>
            {canManage && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-navy-950 text-white rounded-lg hover:bg-navy-900 transition-colors shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add Team Member</span>
              </button>
            )}
          </div>

          {project.members?.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No members assigned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {project.members?.map((m) => (
                <div
                  key={m.id}
                  className="p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-navy-950">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-medium">
                        {formatRole(m.role)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{m.email}</div>
                    
                    {/* Active/Inactive Status Badge with Green/Red Pill */}
                    <div className="pt-0.5">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {canManage && m.id !== project.manager_id && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="inline-flex items-center text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      title="Remove member from project"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Tasks (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-navy-950">Project Tasks</h2>
              <p className="text-[11px] text-slate-500">
                {project.completed_tasks} of {project.total_tasks} completed
              </p>
            </div>
            <Link
              to={`/kanban?project=${project.id}`}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-navy-950 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Kanban className="w-3.5 h-3.5 mr-1.5" />
              <span>Kanban Board</span>
            </Link>
          </div>

          {project.tasks?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No tasks created in this project yet.
            </div>
          ) : (
            <div className="space-y-3">
              {project.tasks?.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTask({ ...t, project_name: project.name });
                    setIsTaskDetailsOpen(true);
                  }}
                  className="p-3.5 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-navy-950 group-hover:text-navy-900 flex items-center gap-1.5">
                      <span>{t.title}</span>
                      <Eye className="w-3 h-3 text-slate-400 group-hover:text-navy-950" />
                    </div>
                    {t.description && (
                      <p className="text-slate-500 text-[11px] line-clamp-1">{t.description}</p>
                    )}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-0.5">
                      <span className="font-semibold text-navy-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {t.priority}
                      </span>
                      <span>&bull;</span>
                      <span className="inline-flex items-center">
                        <span>Assignee: {t.assignee_name || 'Unassigned'}</span>
                        {t.assignee_is_active === false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-50 text-red-700 border border-red-200 ml-1.5">
                            <span className="w-1 h-1 rounded-full bg-red-500 mr-1"></span>
                            Inactive
                          </span>
                        )}
                      </span>
                      <span>&bull;</span>
                      <span>Due: {formatDate(t.deadline)}</span>
                    </div>
                  </div>

                  <select
                    value={t.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleTaskStatusChange(t.id, e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-300 text-navy-950 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer self-start sm:self-auto"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-navy-950">Add Team Member</h2>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-slate-400 hover:text-navy-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select an available member to join this project.
            </p>

            {memberError && (
              <div className="mb-4 p-2.5 bg-slate-50 border-l-4 border-navy-950 text-xs text-navy-950 font-medium">
                {memberError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Select User
                </label>
                {availableUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    All available team members are already assigned to this project.
                  </p>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {formatRole(u.role)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableUsers.length === 0}
                  className="px-3.5 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 disabled:opacity-50 cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-navy-950">Add Project Task</h2>
              <button
                onClick={() => setIsCreateTaskOpen(false)}
                className="text-slate-400 hover:text-navy-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Create a deliverable for "{project.name}".
            </p>

            {taskError && (
              <div className="mb-4 p-2.5 bg-slate-50 border-l-4 border-navy-950 text-xs text-navy-950 font-medium">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  placeholder="e.g. Set up database backup automation"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  placeholder="Task details and deliverables..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Assign To
                  </label>
                  <select
                    value={taskData.assigned_to}
                    onChange={(e) => setTaskData({ ...taskData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="">Unassigned</option>
                    {project.members
                      ?.filter((m) => m.role === 'TEAM_MEMBER' && m.is_active !== false)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatRole(m.role)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={taskData.priority}
                    onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={taskData.status}
                    onChange={(e) => setTaskData({ ...taskData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={taskData.deadline}
                    onChange={(e) => setTaskData({ ...taskData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal with Comments & Activity */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isTaskDetailsOpen}
          onClose={() => {
            setIsTaskDetailsOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={fetchProjectDetails}
        />
      )}

    </div>
  );
}
