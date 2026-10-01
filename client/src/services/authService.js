import api from './api';

export const authService = {
  async login(email, password, role) {
    const response = await api.post('/auth/login', {
      email,
      password,
      role,
    });
    return response.data;
  },

  async register(name, email, password, role) {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      role,
    });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
