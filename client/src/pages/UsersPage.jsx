import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { userService } from '../services/dataService';
import { formatRole, formatDate } from '../utils/formatters';
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

  // Deactivate confirmation modal
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  const [deactivateError, setDeactivateError] = useState('');
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);

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

  const openDetailsModal = (u) => {
    setSelectedUser(u);
    setIsDetailsModalOpen(true);
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
              ? 'Manage user accounts, roles, activations, and platform permissions'
              : user?.role === 'PROJECT_MANAGER'
              ? 'Team members and collaborators across projects'
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

      {/* Filters (Search, Role Filter, Status Filter - Part 10) */}
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

        {/* Status Filter (Part 10) */}
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

        {/* Sort Filter */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
        >
          <option value="name">Name (A-Z)</option>
          <option value="newest">Recently Added</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Table */}
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
                  <th className="py-3 px-4">Joined Date</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter((u) => {
                    // Double layer frontend filtering (Bug 5)
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
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDate(u.created_at)}
                        </td>

                        {/* Admin Member Management Actions (Part 1) */}
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openDetailsModal(u)}
                                className="inline-flex items-center px-2 py-1 text-slate-600 hover:text-navy-950 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                title="View Member Details"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                <span>View</span>
                              </button>

                              {u.is_active ? (
                                <button
                                  onClick={() => openDeactivateModal(u)}
                                  disabled={isSelf}
                                  className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
                                    isSelf
                                      ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                      : 'text-rose-700 bg-rose-50/60 hover:bg-rose-100 border-rose-200 cursor-pointer'
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
                            </div>
                          </td>
                        )}
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

      {/* Confirmation Dialog for Deactivation (Part 1) */}
      {isDeactivateModalOpen && userToDeactivate && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl">
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
                <li>User cannot be assigned to new projects or deliverables.</li>
                <li>Existing tasks, comments, and project histories remain intact.</li>
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isProcessingStatus ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal (Part 1) */}
      {isDetailsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-950">Member Profile Details</h2>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-navy-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-navy-950 text-white font-bold text-lg flex items-center justify-center">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-950">{selectedUser.name}</h3>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-navy-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {formatRole(selectedUser.role)}
                  </span>
                  {selectedUser.is_active ? (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Account ID</span>
                <span className="font-mono text-[11px] text-slate-700">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Account Created</span>
                <span className="font-medium text-navy-950">{formatDate(selectedUser.created_at)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-navy-950">
                  {selectedUser.is_active ? 'Active Contributor' : 'Deactivated'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer"
              >
                Close
              </button>
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

