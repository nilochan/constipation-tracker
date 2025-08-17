const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          window.location.href = '/login';
        }
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async register(userData) {
    const response = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  logout() {
    this.setToken(null);
  }

  async getDailyData(date) {
    return this.request(`/data/${date}`);
  }

  async updateDailyData(date, updates) {
    return this.request(`/data/${date}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async addBowelMovement(date, movement) {
    return this.request(`/data/${date}/bowel-movements`, {
      method: 'POST',
      body: JSON.stringify(movement),
    });
  }

  async deleteBowelMovement(date, movementId) {
    return this.request(`/data/${date}/bowel-movements/${movementId}`, {
      method: 'DELETE',
    });
  }

  async addMeal(date, meal) {
    return this.request(`/data/${date}/meals`, {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  }

  async getAnalytics(days = 30) {
    return this.request(`/analytics/${days}`);
  }

  // Daily Notes API
  async addDailyNote(date, note) {
    return this.request(`/data/${date}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async deleteDailyNote(date, noteId) {
    return this.request(`/data/${date}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // Profile API
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async exportData(format = 'json') {
    const response = await fetch(`${API_BASE_URL}/profile/export?format=${format}`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Export failed');
    }
    
    return response.blob();
  }

  async uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE_URL}/profile/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Photo upload failed');
    }

    return response.json();
  }

  async uploadChatHistory(chatHistory, source) {
    return this.request('/ai/upload-chat-history', {
      method: 'POST',
      body: JSON.stringify({ chatHistory, source }),
    });
  }

  // AI Services
  async getDailySummary(date) {
    return this.request('/ai/daily-summary', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async getWeeklySummary() {
    return this.request('/ai/weekly-summary', {
      method: 'POST',
    });
  }

  async chatWithAI(message) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Admin Services
  async getAdminActivityLogs(limit = 100, offset = 0) {
    return this.request(`/admin/activity-logs?limit=${limit}&offset=${offset}`);
  }

  async getAdminUserStats() {
    return this.request('/admin/user-stats');
  }

  async promoteToAdmin(username, adminSecret) {
    return this.request('/admin/promote', {
      method: 'POST',
      body: JSON.stringify({ username, adminSecret }),
    });
  }

  isAuthenticated() {
    return !!this.token;
  }
}

const apiService = new ApiService();
export default apiService;