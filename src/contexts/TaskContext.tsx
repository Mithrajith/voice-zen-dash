import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Task, TaskCreateData, TaskUpdateData, TasksQueryParams, createTaskCache } from '../services/tasks';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/use-toast';
import { useLoading } from '../components/LoadingSystem';
import { useErrorHandler } from '../components/ErrorSystem';

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  
  // Actions
  loadTasks: (params?: TasksQueryParams) => Promise<void>;
  createTask: (data: TaskCreateData) => Promise<Task>;
  updateTask: (id: string, data: TaskUpdateData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<Task>;
  bulkUpdate: (taskIds: string[], updates: TaskUpdateData) => Promise<void>;
  bulkDelete: (taskIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getCurrentUser, isInitialized } = useAuth();
  const { toast } = useToast();
  const { setLoading, isLoading } = useLoading();
  const { handleAsyncError } = useErrorHandler();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  // Create task cache instance
  const taskCache = React.useMemo(() => createTaskCache(), []);

  // Load tasks
  const loadTasks = useCallback(async (params?: TasksQueryParams) => {
    if (!getCurrentUser()) return;

    const result = await handleAsyncError(async () => {
      setLoading('tasks-load', true);
      setError(null);
      
      const response = await taskCache.getTasks(params);
      setTasks(response.tasks);
      setPagination(response.pagination);
      return response;
    }, { operation: 'loadTasks', params });

    setLoading('tasks-load', false);
  }, [getCurrentUser, taskCache, handleAsyncError, setLoading]);

  // Create task
  const createTask = useCallback(async (data: TaskCreateData): Promise<Task> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    const result = await handleAsyncError(async () => {
      setLoading('tasks-create', true);
      setError(null);
      
      const { taskService } = await import('../services/tasks');
      const newTask = await taskService.createTask(data);
      
      // Add to current list if we're on first page without filters
      setTasks(prev => [newTask, ...prev]);
      
      toast({
        title: 'Task created',
        description: `"${newTask.title}" has been added to your tasks.`,
      });
      
      return newTask;
    }, { operation: 'createTask', data });

    setLoading('tasks-create', false);
    
    if (!result) {
      throw new Error('Failed to create task');
    }
    
    return result;
  }, [getCurrentUser, toast, handleAsyncError, setLoading]);

  // Update task
  const updateTask = useCallback(async (id: string, data: TaskUpdateData): Promise<Task> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { taskService } = await import('../services/tasks');
      const updatedTask = await taskService.updateTask(id, data);
      
      // Update in current list
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      
      toast({
        title: 'Task updated',
        description: `"${updatedTask.title}" has been updated.`,
      });
      
      return updatedTask;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to update task',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Delete task
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { taskService } = await import('../services/tasks');
      await taskService.deleteTask(id);
      
      // Remove from current list
      const taskToDelete = tasks.find(t => t.id === id);
      setTasks(prev => prev.filter(task => task.id !== id));
      
      toast({
        title: 'Task deleted',
        description: taskToDelete ? `"${taskToDelete.title}" has been deleted.` : 'Task has been deleted.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to delete task',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, tasks, toast]);

  // Complete task
  const completeTask = useCallback(async (id: string): Promise<Task> => {
    return updateTask(id, { status: 'completed' });
  }, [updateTask]);

  // Bulk update
  const bulkUpdate = useCallback(async (taskIds: string[], updates: TaskUpdateData): Promise<void> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { taskService } = await import('../services/tasks');
      const updatedTasks = await taskService.bulkUpdateTasks(taskIds, updates);
      
      // Update current list
      setTasks(prev => prev.map(task => {
        const updated = updatedTasks.find(ut => ut.id === task.id);
        return updated || task;
      }));
      
      toast({
        title: 'Tasks updated',
        description: `${taskIds.length} task(s) have been updated.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tasks';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to update tasks',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Bulk delete
  const bulkDelete = useCallback(async (taskIds: string[]): Promise<void> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { taskService } = await import('../services/tasks');
      await taskService.bulkDeleteTasks(taskIds);
      
      // Remove from current list
      setTasks(prev => prev.filter(task => !taskIds.includes(task.id)));
      
      toast({
        title: 'Tasks deleted',
        description: `${taskIds.length} task(s) have been deleted.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tasks';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to delete tasks',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Refresh current view
  const refresh = useCallback(async () => {
    await loadTasks(pagination ? {
      page: pagination.page,
      limit: pagination.limit
    } : undefined);
  }, [loadTasks, pagination]);

  // Clear cache
  const clearCache = useCallback(() => {
    taskCache.clearCache();
  }, [taskCache]);

  // Load initial tasks when authenticated
  useEffect(() => {
    if (isInitialized && getCurrentUser()) {
      loadTasks();
    } else if (isInitialized && !getCurrentUser()) {
      // Clear tasks when not authenticated
      setTasks([]);
      setPagination(null);
      setError(null);
    }
  }, [isInitialized, getCurrentUser, loadTasks]);

  // Listen for auth logout to clear data
  useEffect(() => {
    const handleLogout = () => {
      setTasks([]);
      setPagination(null);
      setError(null);
      clearCache();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [clearCache]);

  const contextValue: TaskContextType = {
    tasks,
    isLoading: isLoading('tasks-load'),
    error,
    pagination,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    bulkUpdate,
    bulkDelete,
    refresh,
    clearCache
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

// Custom hooks for specific task operations
export const useTaskActions = () => {
  const { createTask, updateTask, deleteTask, completeTask } = useTasks();
  return { createTask, updateTask, deleteTask, completeTask };
};

export const useTaskFilters = () => {
  const { loadTasks } = useTasks();
  
  const filterByStatus = useCallback((status: string) => {
    return loadTasks({ status, page: 1 });
  }, [loadTasks]);
  
  const filterByPriority = useCallback((priority: string) => {
    return loadTasks({ priority, page: 1 });
  }, [loadTasks]);
  
  const filterByCategory = useCallback((category: string) => {
    return loadTasks({ category, page: 1 });
  }, [loadTasks]);
  
  const search = useCallback((query: string) => {
    return loadTasks({ search: query, page: 1 });
  }, [loadTasks]);
  
  return { filterByStatus, filterByPriority, filterByCategory, search };
};