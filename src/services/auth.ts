import api, { ApiResponse, handleApiError, retryRequest } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: string;
  lastLogin?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  reminderFrequency: number; // hours
  defaultTaskPriority: 'low' | 'medium' | 'high';
  defaultBudgetCategory: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await retryRequest(() =>
        api.post<ApiResponse<AuthResponse>>('/auth/register', data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await retryRequest(() =>
        api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<{ user: User }>>('/auth/me')
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.user;
      }
      
      throw new Error('Failed to get user data');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Update user preferences
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await retryRequest(() =>
        api.patch<ApiResponse<{ preferences: UserPreferences }>>('/auth/preferences', preferences)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.preferences;
      }
      
      throw new Error(response.data.message || 'Failed to update preferences');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Logout (client-side only)
  logout(): void {
    // Clear token and user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
};

// Auth context helper
export const createAuthContext = () => {
  let currentUser: User | null = null;
  let isLoading = false;
  const listeners = new Set<(user: User | null) => void>();

  const notifyListeners = () => {
    listeners.forEach(listener => listener(currentUser));
  };

  const setUser = (user: User | null) => {
    currentUser = user;
    if (user) {
      localStorage.setItem('userData', JSON.stringify(user));
    } else {
      localStorage.removeItem('userData');
    }
    notifyListeners();
  };

  const initialize = async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      return;
    }

    isLoading = true;
    notifyListeners();

    try {
      const user = await authService.getCurrentUser();
      setUser(user);
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      authService.logout();
      setUser(null);
    } finally {
      isLoading = false;
      notifyListeners();
    }
  };

  // Listen for logout events
  window.addEventListener('auth:logout', () => {
    setUser(null);
  });

  return {
    getCurrentUser: () => currentUser,
    isLoading: () => isLoading,
    subscribe: (listener: (user: User | null) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize,
    login: async (credentials: LoginCredentials) => {
      const { user, token } = await authService.login(credentials);
      localStorage.setItem('authToken', token);
      setUser(user);
      return user;
    },
    register: async (data: RegisterData) => {
      const { user, token } = await authService.register(data);
      localStorage.setItem('authToken', token);
      setUser(user);
      return user;
    },
    logout: () => {
      authService.logout();
      setUser(null);
    },
    updatePreferences: async (preferences: Partial<UserPreferences>) => {
      const updatedPreferences = await authService.updatePreferences(preferences);
      if (currentUser) {
        setUser({
          ...currentUser,
          preferences: updatedPreferences
        });
      }
      return updatedPreferences;
    }
  };
};

export type AuthContext = ReturnType<typeof createAuthContext>;