import { useState, useEffect } from 'react';

export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RecurringTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  recurringType: RecurringType;
  startDate: string;
  lastGenerated?: string;
  isActive: boolean;
  time?: string; // Time in HH:MM format
  daysOfWeek?: number[]; // 0-6 for weekly tasks
  dayOfMonth?: number; // 1-31 for monthly tasks
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  recurringTaskId?: string; // Link to the recurring task that generated this
}

export const useRecurringTasks = () => {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recurringTasks');
    if (saved) {
      setRecurringTasks(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('recurringTasks', JSON.stringify(recurringTasks));
  }, [recurringTasks]);

  const addRecurringTask = (task: Omit<RecurringTask, 'id' | 'lastGenerated' | 'isActive'>) => {
    const newTask: RecurringTask = {
      ...task,
      id: Date.now().toString(),
      isActive: true,
    };
    setRecurringTasks(prev => [...prev, newTask]);
    return newTask;
  };

  const updateRecurringTask = (id: string, updates: Partial<RecurringTask>) => {
    setRecurringTasks(prev => 
      prev.map(task => task.id === id ? { ...task, ...updates } : task)
    );
  };

  const deleteRecurringTask = (id: string) => {
    setRecurringTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleRecurringTask = (id: string) => {
    setRecurringTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, isActive: !task.isActive } : task
      )
    );
  };

  const generateTasksForRecurring = (existingTasks: Task[]): Task[] => {
    const now = new Date();
    const newTasks: Task[] = [];

    recurringTasks.forEach(recurringTask => {
      if (!recurringTask.isActive) return;

      const shouldGenerate = shouldGenerateNewTask(recurringTask, now, existingTasks);
      
      if (shouldGenerate) {
        const dueDate = calculateNextDueDate(recurringTask, now);
        
        const newTask: Task = {
          id: `${recurringTask.id}-${Date.now()}`,
          title: recurringTask.title,
          description: recurringTask.description,
          dueDate: dueDate.toISOString(),
          priority: recurringTask.priority,
          completed: false,
          createdAt: now.toISOString(),
          recurringTaskId: recurringTask.id,
        };

        newTasks.push(newTask);

        // Update lastGenerated
        updateRecurringTask(recurringTask.id, { 
          lastGenerated: now.toISOString().split('T')[0] 
        });
      }
    });

    return newTasks;
  };

  const shouldGenerateNewTask = (
    recurringTask: RecurringTask, 
    now: Date, 
    existingTasks: Task[]
  ): boolean => {
    const today = now.toISOString().split('T')[0];
    
    // Check if we already generated a task today
    if (recurringTask.lastGenerated === today) {
      return false;
    }

    // Check if there's already a pending task for today from this recurring task
    const todayStr = now.toDateString();
    const hasPendingTask = existingTasks.some(task => 
      task.recurringTaskId === recurringTask.id &&
      !task.completed &&
      new Date(task.dueDate).toDateString() === todayStr
    );

    if (hasPendingTask) {
      return false;
    }

    switch (recurringTask.recurringType) {
      case 'daily':
        return true; // Generate daily tasks every day
        
      case 'weekly':
        if (recurringTask.daysOfWeek && recurringTask.daysOfWeek.length > 0) {
          return recurringTask.daysOfWeek.includes(now.getDay());
        }
        return true; // Default to same day of week as start date
        
      case 'monthly':
        if (recurringTask.dayOfMonth) {
          return now.getDate() === recurringTask.dayOfMonth;
        }
        return now.getDate() === new Date(recurringTask.startDate).getDate();
        
      default:
        return false;
    }
  };

  const calculateNextDueDate = (recurringTask: RecurringTask, baseDate: Date): Date => {
    const dueDate = new Date(baseDate);
    
    // Set time if specified
    if (recurringTask.time) {
      const [hours, minutes] = recurringTask.time.split(':').map(Number);
      dueDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to end of day if no time specified
      dueDate.setHours(23, 59, 0, 0);
    }

    return dueDate;
  };

  const getRecurringTaskStats = () => {
    const activeCount = recurringTasks.filter(t => t.isActive).length;
    const inactiveCount = recurringTasks.filter(t => !t.isActive).length;
    
    const typeBreakdown = recurringTasks.reduce((acc, task) => {
      if (task.isActive) {
        acc[task.recurringType] = (acc[task.recurringType] || 0) + 1;
      }
      return acc;
    }, {} as Record<RecurringType, number>);

    return {
      total: recurringTasks.length,
      active: activeCount,
      inactive: inactiveCount,
      typeBreakdown,
    };
  };

  // Auto-generate tasks on load and periodically
  useEffect(() => {
    const checkAndGenerate = (tasks: Task[]) => {
      const newTasks = generateTasksForRecurring(tasks);
      return newTasks;
    };

    // Set up periodic check (every hour)
    const interval = setInterval(() => {
      const existingTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const newTasks = checkAndGenerate(existingTasks);
      
      if (newTasks.length > 0) {
        const updatedTasks = [...existingTasks, ...newTasks];
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
        
        // Dispatch custom event to notify task list of updates
        window.dispatchEvent(new CustomEvent('recurringTasksGenerated', { 
          detail: { newTasks } 
        }));
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [recurringTasks]);

  return {
    recurringTasks,
    addRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    toggleRecurringTask,
    generateTasksForRecurring,
    getRecurringTaskStats,
  };
};