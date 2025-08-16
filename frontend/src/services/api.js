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

  isAuthenticated() {
    return !!this.token;
  }
}

const apiService = new ApiService();
export default apiService;