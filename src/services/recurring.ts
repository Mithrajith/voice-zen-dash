import api, { ApiResponse, handleApiError, retryRequest } from './api';

export interface RecurringTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  interval: number; // in hours
  isActive: boolean;
  lastGenerated?: string;
  nextDue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTaskCreateData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  interval: number; // in hours
}

export interface RecurringTaskUpdateData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  interval?: number;
  isActive?: boolean;
}

export interface RecurringTasksQueryParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RecurringTasksResponse {
  recurringTasks: RecurringTask[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RecurringTaskStats {
  totalRecurring: number;
  activeRecurring: number;
  tasksGenerated: number;
  upcomingGeneration: Array<{
    recurringTaskId: string;
    title: string;
    nextDue: string;
  }>;
}

export const recurringTaskService = {
  // Get all recurring tasks
  async getRecurringTasks(params?: RecurringTasksQueryParams): Promise<RecurringTasksResponse> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<RecurringTasksResponse>>('/recurring', { params })
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to get recurring tasks');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get recurring task by ID
  async getRecurringTask(id: string): Promise<RecurringTask> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<{ recurringTask: RecurringTask }>>(`/recurring/${id}`)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.recurringTask;
      }
      
      throw new Error(response.data.message || 'Recurring task not found');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Create new recurring task
  async createRecurringTask(data: RecurringTaskCreateData): Promise<RecurringTask> {
    try {
      const response = await retryRequest(() =>
        api.post<ApiResponse<{ recurringTask: RecurringTask }>>('/recurring', data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.recurringTask;
      }
      
      throw new Error(response.data.message || 'Failed to create recurring task');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Update recurring task
  async updateRecurringTask(id: string, data: RecurringTaskUpdateData): Promise<RecurringTask> {
    try {
      const response = await retryRequest(() =>
        api.patch<ApiResponse<{ recurringTask: RecurringTask }>>(`/recurring/${id}`, data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.recurringTask;
      }
      
      throw new Error(response.data.message || 'Failed to update recurring task');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Delete recurring task
  async deleteRecurringTask(id: string): Promise<void> {
    try {
      const response = await retryRequest(() =>
        api.delete<ApiResponse<null>>(`/recurring/${id}`)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete recurring task');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Generate new tasks from recurring tasks
  async generateTasks(): Promise<{ generatedCount: number; tasks: Array<{ title: string; dueDate: string }> }> {
    try {
      const response = await retryRequest(() =>
        api.post<ApiResponse<{ generatedCount: number; tasks: Array<{ title: string; dueDate: string }> }>>('/recurring/generate')
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to generate tasks');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get recurring task statistics
  async getStats(): Promise<RecurringTaskStats> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<RecurringTaskStats>>('/recurring/stats')
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to get recurring task stats');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Toggle active status
  async toggleActive(id: string): Promise<RecurringTask> {
    const task = await this.getRecurringTask(id);
    return this.updateRecurringTask(id, { isActive: !task.isActive });
  },

  // Get active recurring tasks
  async getActiveRecurringTasks(): Promise<RecurringTask[]> {
    const response = await this.getRecurringTasks({ 
      isActive: true, 
      limit: 100,
      sortBy: 'nextDue',
      sortOrder: 'asc'
    });
    return response.recurringTasks;
  },

  // Get upcoming task generations (next 24 hours)
  async getUpcomingGenerations(): Promise<RecurringTask[]> {
    const activeTask = await this.getActiveRecurringTasks();
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return activeTask.filter(task => {
      if (!task.nextDue) return false;
      const nextDue = new Date(task.nextDue);
      return nextDue >= now && nextDue <= next24Hours;
    });
  }
};

// Recurring task scheduler helper
export const createRecurringTaskScheduler = () => {
  let intervalId: NodeJS.Timeout | null = null;
  let isRunning = false;
  
  const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  
  const checkAndGenerate = async () => {
    if (!navigator.onLine || isRunning) return;
    
    try {
      isRunning = true;
      console.log('Checking for recurring tasks to generate...');
      
      const result = await recurringTaskService.generateTasks();
      
      if (result.generatedCount > 0) {
        console.log(`Generated ${result.generatedCount} new tasks from recurring tasks`);
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('recurring:tasksGenerated', {
          detail: result
        }));
        
        // Show notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Generated ${result.generatedCount} new task(s)`, {
            body: result.tasks.map(t => t.title).join(', '),
            icon: '/icon.svg'
          });
        }
      }
    } catch (error) {
      console.error('Failed to check recurring tasks:', error);
    } finally {
      isRunning = false;
    }
  };
  
  const start = () => {
    if (intervalId) return;
    
    // Check immediately
    checkAndGenerate();
    
    // Set up interval
    intervalId = setInterval(checkAndGenerate, CHECK_INTERVAL);
    
    console.log('Recurring task scheduler started');
  };
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('Recurring task scheduler stopped');
    }
  };
  
  // Auto-start when online
  window.addEventListener('online', () => {
    if (!intervalId) {
      start();
    }
  });
  
  // Stop when offline
  window.addEventListener('offline', stop);
  
  return {
    start,
    stop,
    isRunning: () => !!intervalId,
    checkNow: checkAndGenerate
  };
};

export type RecurringTaskScheduler = ReturnType<typeof createRecurringTaskScheduler>;