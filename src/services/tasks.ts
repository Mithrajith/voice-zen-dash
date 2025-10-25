import api, { ApiResponse, handleApiError, retryRequest } from './api';
import { dataSyncManager } from './dataSync';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  category: string;
  dueDate?: string;
  reminderDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  dueDate?: string;
  reminderDate?: string;
}

export interface TaskUpdateData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
  category?: string;
  dueDate?: string;
  reminderDate?: string;
}

export interface TasksQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TaskOverview {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };
  tasksByStatus: {
    pending: number;
    'in-progress': number;
    completed: number;
  };
  tasksByCategory: Record<string, number>;
  completionRate: number;
  upcomingDeadlines: Task[];
}

export const taskService = {
  // Get all tasks with pagination and filtering
  async getTasks(params?: TasksQueryParams): Promise<TasksResponse> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<TasksResponse>>('/tasks', { params })
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to get tasks');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get task by ID
  async getTask(id: string): Promise<Task> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<{ task: Task }>>(`/tasks/${id}`)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.task;
      }
      
      throw new Error(response.data.message || 'Task not found');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Create new task with optimistic updates
  async createTask(data: TaskCreateData): Promise<Task> {
    try {
      // Use optimistic update with sync manager
      const result = await dataSyncManager.performOptimisticUpdate(
        'task',
        'CREATE',
        {
          ...data,
          id: `temp-${Date.now()}`,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      return result.localData as Task;
    } catch (syncError) {
      // Fallback to direct API call
      try {
        const response = await retryRequest(() =>
          api.post<ApiResponse<{ task: Task }>>('/tasks', data)
        );
        
        if (response.data.success && response.data.data) {
          return response.data.data.task;
        }
        
        throw new Error(response.data.message || 'Failed to create task');
      } catch (error) {
        throw new Error(handleApiError(error));
      }
    }
  },

  // Update task with optimistic updates
  async updateTask(id: string, data: TaskUpdateData): Promise<Task> {
    try {
      // Get cached task first
      const cachedTask = await dataSyncManager.getFromCache('task', id);
      const updatedTask = {
        ...cachedTask,
        ...data,
        id,
        updatedAt: new Date().toISOString()
      };
      
      // Use optimistic update with sync manager
      const result = await dataSyncManager.performOptimisticUpdate(
        'task',
        'UPDATE',
        updatedTask,
        id
      );
      return result.localData as Task;
    } catch (syncError) {
      // Fallback to direct API call
      try {
        const response = await retryRequest(() =>
          api.patch<ApiResponse<{ task: Task }>>(`/tasks/${id}`, data)
        );
        
        if (response.data.success && response.data.data) {
          return response.data.data.task;
        }
        
        throw new Error(response.data.message || 'Failed to update task');
      } catch (error) {
        throw new Error(handleApiError(error));
      }
    }
  },

  // Delete task
  async deleteTask(id: string): Promise<void> {
    try {
      const response = await retryRequest(() =>
        api.delete<ApiResponse<null>>(`/tasks/${id}`)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete task');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Bulk operations
  async bulkUpdateTasks(taskIds: string[], updates: TaskUpdateData): Promise<Task[]> {
    try {
      const response = await retryRequest(() =>
        api.patch<ApiResponse<{ tasks: Task[] }>>('/tasks/bulk', {
          taskIds,
          updates
        })
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.tasks;
      }
      
      throw new Error(response.data.message || 'Failed to bulk update tasks');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async bulkDeleteTasks(taskIds: string[]): Promise<void> {
    try {
      const response = await retryRequest(() =>
        api.delete<ApiResponse<null>>('/tasks/bulk', {
          data: { taskIds }
        })
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to bulk delete tasks');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get task overview/statistics
  async getOverview(): Promise<TaskOverview> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<TaskOverview>>('/tasks/overview')
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to get task overview');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Mark task as complete
  async completeTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'completed' });
  },

  // Mark task as in-progress
  async startTask(id: string): Promise<Task> {
    return this.updateTask(id, { status: 'in-progress' });
  },

  // Get tasks by category
  async getTasksByCategory(category: string, params?: Omit<TasksQueryParams, 'category'>): Promise<TasksResponse> {
    return this.getTasks({ ...params, category });
  },

  // Get overdue tasks
  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date().toISOString();
    const response = await this.getTasks({
      sortBy: 'dueDate',
      sortOrder: 'asc',
      limit: 100
    });
    
    return response.tasks.filter(task => 
      task.dueDate && 
      task.status !== 'completed' && 
      new Date(task.dueDate) < new Date(now)
    );
  },

  // Get upcoming tasks (due in next 7 days)
  async getUpcomingTasks(): Promise<Task[]> {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    
    const response = await this.getTasks({
      sortBy: 'dueDate',
      sortOrder: 'asc',
      limit: 100
    });
    
    return response.tasks.filter(task => 
      task.dueDate && 
      task.status !== 'completed' && 
      new Date(task.dueDate) >= now && 
      new Date(task.dueDate) <= nextWeek
    );
  }
};

// Task cache helper for offline functionality
export const createTaskCache = () => {
  const CACHE_KEY = 'tasks_cache';
  const CACHE_TIMESTAMP_KEY = 'tasks_cache_timestamp';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const isOnline = () => navigator.onLine;

  const getCachedTasks = (): TasksResponse | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (!cached || !timestamp) return null;
      
      const age = Date.now() - parseInt(timestamp);
      if (age > CACHE_DURATION) return null;
      
      return JSON.parse(cached);
    } catch {
      return null;
    }
  };

  const setCachedTasks = (data: TasksResponse) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache tasks:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  };

  return {
    async getTasks(params?: TasksQueryParams): Promise<TasksResponse> {
      if (isOnline()) {
        try {
          const data = await taskService.getTasks(params);
          if (!params || (!params.page && !params.search)) {
            setCachedTasks(data);
          }
          return data;
        } catch (error) {
          const cached = getCachedTasks();
          if (cached) {
            console.warn('Using cached tasks due to error:', error);
            return cached;
          }
          throw error;
        }
      } else {
        const cached = getCachedTasks();
        if (cached) {
          return cached;
        }
        throw new Error('No cached data available offline');
      }
    },
    clearCache
  };
};

export type TaskCache = ReturnType<typeof createTaskCache>;