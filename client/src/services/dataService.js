import api from './api';

export const projectService = {
  async getAll(params) {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async create(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  async update(id, projectData) {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  async addMember(projectId, userId) {
    const response = await api.post(`/projects/${projectId}/members`, { user_id: userId });
    return response.data;
  },

  async removeMember(projectId, userId) {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  },
};

export const taskService = {
  async getAll(params) {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async create(taskData) {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  async update(id, taskData) {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  async updateStatus(id, status) {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
};

export const userService = {
  async getAll(params) {
    const response = await api.get('/users', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async create(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  },

  async update(id, userData) {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  async updateStatus(id, isActive) {
    const response = await api.patch(`/users/${id}/status`, { is_active: isActive });
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export const commentService = {
  async getByTask(taskId) {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async create(taskId, comment) {
    const response = await api.post(`/tasks/${taskId}/comments`, { comment });
    return response.data;
  },

  async update(commentId, comment) {
    const response = await api.put(`/comments/${commentId}`, { comment });
    return response.data;
  },

  async delete(commentId) {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },
};

export const activityService = {
  async getByTask(taskId) {
    const response = await api.get(`/tasks/${taskId}/activity`);
    return response.data;
  },

  async getByProject(projectId) {
    const response = await api.get(`/projects/${projectId}/activity`);
    return response.data;
  },
};

export const notificationService = {
  async getAll(params) {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
};

export const analyticsService = {
  async getDashboard() {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
};


