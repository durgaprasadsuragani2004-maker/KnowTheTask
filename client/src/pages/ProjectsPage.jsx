import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { projectService, userService } from '../services/dataService';
import { formatStatus, formatDate, formatRole } from '../utils/formatters';
import Pagination from '../components/Pagination';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  X,
  Trash2,
  Edit,
  ArrowRight,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // Available users for PM and Team Member assignment (ONLY ACTIVE users, NEVER includes Admins)
  const [managers, setManagers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allManagersList, setAllManagersList] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'PLANNING',
    start_date: '',
    deadline: '',
    manager_id: '',
    member_ids: [],
  });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectService.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        manager_id: managerFilter || undefined,
        sort: sortOrder || undefined,
        page,
        limit: 9,
      });
      if (res.success) {
        setProjects(res.projects || []);
        setTotalPages(res.totalPages || 1);
        setTotalProjects(res.total !== undefined ? res.total : (res.projects?.length || 0));
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async (currentManager = null) => {
    try {
      const res = await userService.getAssignable();
      if (res.success) {
        let activeUsers = res.users || [];
        let pms = activeUsers.filter((u) => u.role === 'PROJECT_MANAGER');
        const members = activeUsers.filter((u) => u.role === 'TEAM_MEMBER');

        // If editing and current manager is inactive, retain them for display
        if (currentManager && currentManager.id && !pms.some((m) => m.id === currentManager.id)) {
          pms = [{ ...currentManager, is_active: false }, ...pms];
        }

        setManagers(pms);
        setTeamMembers(members);

        if (pms.length > 0 && !formData.manager_id && !currentManager) {
          if (user?.role === 'PROJECT_MANAGER') {
            setFormData((prev) => ({ ...prev, manager_id: user.id }));
          } else {
            setFormData((prev) => ({ ...prev, manager_id: pms[0].id }));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all managers for filter dropdown on mount
  useEffect(() => {
    const loadManagersForFilter = async () => {
      try {
        const res = await userService.getAll({ role: 'PROJECT_MANAGER' });
        if (res.success) {
          setAllManagersList(res.users || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.role === 'ADMIN') {
      loadManagersForFilter();
    }
  }, [user?.role]);

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter, managerFilter, sortOrder, page]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, managerFilter, sortOrder]);

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingProjectId(null);
    setFormData({
      name: '',
      description: '',
      status: 'PLANNING',
      start_date: '',
      deadline: '',
      manager_id: user?.role === 'PROJECT_MANAGER' ? user.id : managers[0]?.id || '',
      member_ids: [],
    });
    setFormError('');
    setFieldErrors({});
    fetchAssignableUsers(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e, project) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingProjectId(project.id);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'PLANNING',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      deadline: project.deadline ? project.deadline.split('T')[0] : '',
      manager_id: project.manager_id || '',
      member_ids: [],
    });
    setFormError('');
    setFieldErrors({});
    fetchAssignableUsers({
      id: project.manager_id,
      name: project.manager_name,
      email: project.manager_email,
      role: 'PROJECT_MANAGER',
      is_active: project.manager_is_active,
    });
    setIsModalOpen(true);
  };

  const handleMemberToggle = (userId) => {
    setFormData((prev) => {
      const current = new Set(prev.member_ids);
      if (current.has(userId)) {
        current.delete(userId);
      } else {
        current.add(userId);
      }
      return { ...prev, member_ids: Array.from(current) };
    });
    if (fieldErrors.member_ids) {
      setFieldErrors((prev) => ({ ...prev, member_ids: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    // Field-level Validation (BUG 1)
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    if (!formData.deadline) {
      errors.deadline = 'Deadline is required';
    } else if (formData.start_date && new Date(formData.deadline) < new Date(formData.start_date)) {
      errors.deadline = 'Deadline cannot be before start date';
    }
    if (!formData.manager_id) {
      errors.manager_id = 'Project Manager is required';
    }
    if (!isEditMode && (!formData.member_ids || formData.member_ids.length === 0)) {
      errors.member_ids = 'Please select at least one valid team member';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      if (isEditMode) {
        const { member_ids, ...updatePayload } = formData;
        await projectService.update(editingProjectId, updatePayload);
      } else {
        await projectService.create(formData);
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors)) {
        const beErrors = {};
        resp.errors.forEach((e) => {
          if (e.field) beErrors[e.field] = e.message;
        });
        setFieldErrors(beErrors);
      }
      setFormError(resp?.message || 'Failed to save project.');
    }
  };

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this project?')) {
      return;
    }
    try {
      await projectService.delete(projectId);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Projects</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track milestones, deliverables, and team assignments
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name or manager..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-950"
          />
        </div>

        {/* Manager Filter */}
        {allManagersList.length > 0 && (
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
          >
            <option value="">All Managers</option>
            {allManagersList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>

        {/* Sort Order */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name (A-Z)</option>
          <option value="deadline">Deadline (Soonest)</option>
        </select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center bg-white border border-slate-200 rounded-xl p-8">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-navy-950">No projects found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search criteria or create a new project.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => {
              const canEdit =
                user?.role === 'ADMIN' ||
                (user?.role === 'PROJECT_MANAGER' &&
                  (p.manager_id === user?.id || p.created_by === user?.id));

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-bold text-navy-950 leading-snug group-hover:text-navy-900 transition-colors">
                        {p.name}
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-navy-900 border border-slate-200 rounded font-semibold whitespace-nowrap">
                        {formatStatus(p.status)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {p.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-bold text-navy-950">{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                        <div
                          className="bg-navy-950 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${p.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Project Meta */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Project Manager:</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-navy-950">
                            {p.manager_name || 'Unassigned'}
                          </span>
                          {p.manager_is_active === false && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></span>
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Timeline:</span>
                        <span className="text-slate-600">
                          {formatDate(p.start_date)} &ndash; {formatDate(p.deadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span>{p.member_count} Members &bull; {p.total_tasks} Tasks</span>
                        
                        {canEdit && (
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => openEditModal(e, p)}
                              className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                              title="Edit project"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, p.id)}
                              className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-100"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalProjects}
            itemsPerPage={9}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-navy-950">
                {isEditMode ? 'Edit Project' : 'Create New Project'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-navy-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Configure project scope, schedule, and team assignments.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-slate-50 border-l-4 border-navy-950 text-xs text-navy-950 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                  }}
                  placeholder="e.g. Infrastructure Cloud Migration"
                  className={`w-full px-3 py-2 bg-white border ${
                    fieldErrors.name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'
                  } rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950`}
                />
                {fieldErrors.name && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project scope, objectives, and deliverables..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              {/* Project Manager Selection (Admin accounts excluded!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign Project Manager *
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => {
                    setFormData({ ...formData, manager_id: e.target.value });
                    if (fieldErrors.manager_id) setFieldErrors({ ...fieldErrors, manager_id: null });
                  }}
                  className={`w-full px-3 py-2 bg-white border ${
                    fieldErrors.manager_id ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'
                  } rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950`}
                >
                  <option value="">Select Project Manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email}){m.is_active === false ? ' — Inactive' : ''}
                    </option>
                  ))}
                </select>
                {fieldErrors.manager_id && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1">{fieldErrors.manager_id}</p>
                )}
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value });
                      if (fieldErrors.start_date) setFieldErrors({ ...fieldErrors, start_date: null });
                    }}
                    className={`w-full px-3 py-2 bg-white border ${
                      fieldErrors.start_date ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'
                    } rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950`}
                  />
                  {fieldErrors.start_date && (
                    <p className="text-rose-600 text-[11px] font-semibold mt-1">{fieldErrors.start_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    min={formData.start_date || undefined}
                    value={formData.deadline}
                    onChange={(e) => {
                      setFormData({ ...formData, deadline: e.target.value });
                      if (fieldErrors.deadline) setFieldErrors({ ...fieldErrors, deadline: null });
                    }}
                    className={`w-full px-3 py-2 bg-white border ${
                      fieldErrors.deadline ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'
                    } rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950`}
                  />
                  {fieldErrors.deadline && (
                    <p className="text-rose-600 text-[11px] font-semibold mt-1">{fieldErrors.deadline}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>

              {/* Team Members Assignment (Checkboxes, Admins and PMs excluded!) */}
              {!isEditMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                    Assign Team Members ({formData.member_ids.length} selected)
                  </label>
                  <div
                    className={`max-h-36 overflow-y-auto border ${
                      fieldErrors.member_ids ? 'border-rose-500' : 'border-slate-200'
                    } rounded-lg p-2 divide-y divide-slate-100 bg-slate-50/50`}
                  >
                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2">No team members available.</p>
                    ) : (
                      teamMembers.map((member) => {
                        const checked = formData.member_ids.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className="flex items-center space-x-2.5 py-1.5 px-2 hover:bg-slate-100 rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleMemberToggle(member.id)}
                              className="rounded border-slate-300 text-navy-950 focus:ring-navy-950"
                            />
                            <div>
                              <span className="font-medium text-navy-950">{member.name}</span>
                              <span className="text-[11px] text-slate-400 ml-1.5">
                                ({member.email})
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {fieldErrors.member_ids && (
                    <p className="text-rose-600 text-[11px] font-semibold mt-1">{fieldErrors.member_ids}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 shadow-sm cursor-pointer"
                >
                  {isEditMode ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
