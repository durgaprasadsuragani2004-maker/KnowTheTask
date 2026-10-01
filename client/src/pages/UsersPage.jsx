import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { userService } from '../services/dataService';
import { formatRole, formatDate, formatStatus, formatPriority } from '../utils/formatters';
import Pagination from '../components/Pagination';
import {
  Users,
  Plus,
  ShieldCheck,
  UserCog,
  User,
  Search,
  Eye,
  UserX,
  UserCheck,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  Lock,
  Key,
  EyeOff,
  FolderKanban,
  CheckSquare,
  Clock,
  Briefcase,
  AlertCircle,
} from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('name');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Workload details modal (Part 17 & 18)
  const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
  const [workloadUser, setWorkloadUser] = useState(null);
  const [workloadData, setWorkloadData] = useState(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);

  // Edit Profile modal (Parts 2-5)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    email: '',
    role: 'TEAM_MEMBER',
    is_active: true,
    changePassword: false,
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Deactivate confirmation modal
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  const [deactivateError, setDeactivateError] = useState('');
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);

  // Safe delete modal (Parts 6 & 7)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [hasHistory, setHasHistory] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // Add User Form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER',
  });
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getAll({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        sort: sortOrder,
        page,
        limit: 10,
      });
      if (res.success) {
        setUsers(res.users || []);
        setTotalPages(res.totalPages || 1);
        setTotalUsers(res.total !== undefined ? res.total : (res.users?.length || 0));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, search, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, search, sortOrder]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await userService.create(formData);
      if (res.success) {
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'TEAM_MEMBER' });
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  // Open Edit Profile Modal (Parts 2-5)
  const openEditModal = (u) => {
    setEditFormData({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_active: u.is_active !== false,
      changePassword: false,
      password: '',
      confirmPassword: '',
    });
    setEditFormError('');
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEditProfile = async (e) => {
    e.preventDefault();
    setEditFormError('');

    if (editFormData.changePassword) {
      if (!editFormData.password || editFormData.password.length < 6) {
        setEditFormError('New password must be at least 6 characters long.');
        return;
      }
      if (editFormData.password !== editFormData.confirmPassword) {
        setEditFormError('Passwords do not match.');
        return;
      }
    }

    try {
      setIsSubmittingEdit(true);
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        is_active: editFormData.is_active,
      };
      if (editFormData.changePassword && editFormData.password) {
        payload.password = editFormData.password;
      }

      await userService.update(editFormData.id, payload);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'Failed to update user profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Workload Details Modal (Part 17 & 18)
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

  // Deactivate
  const openDeactivateModal = (u) => {
    if (u.id === user?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }
    setUserToDeactivate(u);
    setDeactivateError('');
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      setIsProcessingStatus(true);
      setDeactivateError('');
      await userService.updateStatus(userToDeactivate.id, false);
      setIsDeactivateModalOpen(false);
      setUserToDeactivate(null);
      fetchUsers();
    } catch (err) {
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate user.');
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleActivateUser = async (u) => {
    try {
      await userService.updateStatus(u.id, true);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to activate user.');
    }
  };

  // Safe Delete (Parts 6 & 7)
  const openDeleteModal = (u) => {
    if (u.id === user?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    setUserToDelete(u);
    setDeleteError('');
    setHasHistory(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsProcessingDelete(true);
      setDeleteError('');
      setHasHistory(false);
      await userService.delete(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete user.';
      setDeleteError(msg);
      if (err.response?.data?.has_history) {
        setHasHistory(true);
      }
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleDeleteDeactivateInstead = async () => {
    if (!userToDelete) return;
    try {
      setIsProcessingDelete(true);
      await userService.updateStatus(userToDelete.id, false);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate user.');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4 text-navy-950" />;
      case 'PROJECT_MANAGER':
        return <UserCog className="w-4 h-4 text-navy-950" />;
      default:
        return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Team Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Manage organization users, roles, edit profiles, workload, and security'
              : user?.role === 'PROJECT_MANAGER'
              ? 'Team members and collaborators across your managed projects'
              : 'Team members in your project workspaces'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Filters (Search, Role Filter, Status Filter, Sorting - Parts 8 & 24) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-950"
          />
        </div>

        {/* Status Filter */}
        {user?.role === 'ADMIN' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Users</option>
            <option value="INACTIVE">Inactive Users</option>
          </select>
        )}

        {/* Role Filter */}
        {user?.role !== 'TEAM_MEMBER' && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
          >
            <option value="">All Roles</option>
            {isAdmin && <option value="ADMIN">Admin</option>}
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="TEAM_MEMBER">Team Member</option>
          </select>
        )}

        {/* Sort Filter (Part 24: Sorting by tasks, projects, name, date) */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
        >
          <option value="name">Name (A-Z)</option>
          <option value="tasks_desc">Most Tasks Assigned</option>
          <option value="tasks_asc">Fewest Tasks Assigned</option>
          <option value="projects_desc">Most Projects Assigned</option>
          <option value="projects_asc">Fewest Projects Assigned</option>
          <option value="newest">Recently Added</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Table (Parts 8 & 14: Name, Email, Role, Status, Projects, Tasks, Actions) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading team members...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center p-8">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-navy-950">No team members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Projects</th>
                  <th className="py-3 px-4 text-center">Assigned Tasks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter((u) => {
                    if (user?.role === 'ADMIN') return true;
                    if (user?.role === 'PROJECT_MANAGER') return u.role !== 'ADMIN';
                    return u.role === 'TEAM_MEMBER';
                  })
                  .map((u) => {
                    const isSelf = u.id === user?.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-navy-950 text-xs">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-navy-950 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-500 text-[11px]">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-navy-950 border border-slate-200 rounded-md font-semibold text-[11px]">
                            {getRoleIcon(u.role)}
                            <span>{formatRole(u.role)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Projects Assigned (Part 8 & 14) */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold text-[11px]">
                            {u.projects_count ?? 0}
                          </span>
                        </td>

                        {/* Tasks Assigned (Part 8 & 14) */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded font-semibold text-[11px] border ${
                            (u.tasks_count || 0) > 0
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {u.tasks_count ?? 0}
                          </span>
                        </td>

                        {/* Actions (Part 8: Workload, Edit, Deactivate, Delete) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View Workload Details (Parts 14-18) */}
                            <button
                              onClick={() => openWorkloadModal(u)}
                              className="inline-flex items-center px-2 py-1 text-slate-700 hover:text-navy-950 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                              title="View Workload Details"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              <span>Workload</span>
                            </button>

                            {/* Admin Controls */}
                            {isAdmin && (
                              <>
                                {/* Edit Profile (Parts 2-5) */}
                                <button
                                  onClick={() => openEditModal(u)}
                                  className="inline-flex items-center px-2 py-1 text-navy-950 hover:bg-navy-50 bg-white border border-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                  title="Edit User Profile"
                                >
                                  <Pencil className="w-3 h-3 mr-1 text-slate-600" />
                                  <span>Edit</span>
                                </button>

                                {/* Activate / Deactivate */}
                                {u.is_active ? (
                                  <button
                                    onClick={() => openDeactivateModal(u)}
                                    disabled={isSelf}
                                    className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
                                      isSelf
                                        ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 cursor-pointer'
                                    }`}
                                    title={isSelf ? 'Cannot deactivate yourself' : 'Deactivate member'}
                                  >
                                    <UserX className="w-3 h-3 mr-1" />
                                    <span>Deactivate</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleActivateUser(u)}
                                    className="inline-flex items-center px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                    title="Reactivate member"
                                  >
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    <span>Activate</span>
                                  </button>
                                )}

                                {/* Delete User (Parts 6 & 7) */}
                                <button
                                  onClick={() => openDeleteModal(u)}
                                  disabled={isSelf}
                                  className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
                                    isSelf
                                      ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                      : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 cursor-pointer'
                                  }`}
                                  title={isSelf ? 'Cannot delete yourself' : 'Delete user permanently'}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  <span>Delete</span>
                                </button>
                              </>
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
      {!loading && users.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalUsers}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      )}

      {/* EDIT PROFILE MODAL (Parts 2-5) */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-navy-950">Edit User Profile</h2>
                <p className="text-xs text-slate-500">Update name, email, organizational role, and credentials</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-navy-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg font-medium">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleSaveEditProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Address * (Unique)
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Role *
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="TEAM_MEMBER">Team Member</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status *
                  </label>
                  <select
                    value={editFormData.is_active ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'ACTIVE' })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium"
                  >
                    <option value="ACTIVE">🟢 Active</option>
                    <option value="INACTIVE">🔴 Inactive</option>
                  </select>
                </div>
              </div>

              {/* Password Management (Part 4) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="changePasswordToggle"
                      checked={editFormData.changePassword}
                      onChange={(e) => setEditFormData({ ...editFormData, changePassword: e.target.checked })}
                      className="rounded text-navy-950 focus:ring-navy-950 cursor-pointer"
                    />
                    <label htmlFor="changePasswordToggle" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Change User Password
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-400">Leave unchecked to keep current password</span>
                </div>

                {editFormData.changePassword && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        New Password (min 6 characters) *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={editFormData.password}
                          onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                          placeholder="Enter new password"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 pr-8 focus:outline-none focus:ring-1 focus:ring-navy-950"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-950"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={editFormData.confirmPassword}
                        onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKLOAD DETAILS MODAL (Parts 17 & 18) */}
      {isWorkloadModalOpen && workloadUser && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
                  <span>Workload Overview</span>
                  <span className="text-xs font-normal text-slate-500">— {workloadUser.name}</span>
                </h2>
                <p className="text-xs text-slate-500">Objective allocation metrics and associated deliverables</p>
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
                {/* User Header Card */}
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

                {/* Workload Indicator KPI Cards (Part 18: Objective metrics) */}
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

                {/* Assigned Projects List */}
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

                {/* Assigned Tasks List */}
                <div>
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-navy-950" />
                    <span>Associated Tasks ({workloadData.tasks?.length || 0})</span>
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
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {formatPriority(t.priority)}
                                </span>
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

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {isDeactivateModalOpen && userToDeactivate && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-navy-950">Deactivate Member</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to deactivate <strong className="text-navy-950">{userToDeactivate.name}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1 leading-relaxed">
              <p className="font-semibold text-navy-950">Impact of deactivation:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>User is immediately removed from all project and task assignment dropdowns.</li>
                <li>Existing project and task history remains preserved with dynamic Inactive badges.</li>
                <li>You can reactivate this account at any time.</li>
              </ul>
            </div>

            {deactivateError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg font-medium">
                {deactivateError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(false)}
                disabled={isProcessingStatus}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={isProcessingStatus}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessingStatus ? 'Deactivating...' : 'Deactivate User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL (Parts 6 & 7) */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-navy-950">Delete User Account</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to permanently delete <strong className="text-navy-950">{userToDelete.name}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1 leading-relaxed">
              <p className="font-semibold text-navy-950">Safe Deletion Policy:</p>
              <p>
                To preserve historical integrity, users who have authored projects, tasks, or comments cannot be permanently destroyed. Inactive accounts should be deactivated instead.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg font-medium space-y-2">
                <p>{deleteError}</p>
                {hasHistory && (
                  <button
                    type="button"
                    onClick={handleDeleteDeactivateInstead}
                    disabled={isProcessingDelete}
                    className="inline-flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5 mr-1" />
                    <span>Deactivate Account Instead</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isProcessingDelete}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              {!hasHistory && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isProcessingDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessingDelete ? 'Deleting...' : 'Delete Permanently'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal (Admin Only) */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy-950 mb-1">Add Team Member</h2>
            <p className="text-xs text-slate-500 mb-4">Create a new user account with hashed password</p>

            {formError && (
              <div className="mb-4 p-3 bg-slate-50 border-l-4 border-navy-950 text-xs text-navy-950 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@knowthetask.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assigned Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                >
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

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
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
