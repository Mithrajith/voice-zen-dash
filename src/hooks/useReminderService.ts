import { useEffect, useRef } from 'react';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
}

export class ReminderService {
  private static instance: ReminderService;
  private intervalId: number | null = null;
  private isActive = false;

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  start(getTasks: () => Task[], showNotification: (title: string, body: string) => void) {
    if (this.isActive) return;

    this.isActive = true;
    
    // Check immediately
    this.checkReminders(getTasks(), showNotification);
    
    // Set up 3-hour interval (3 * 60 * 60 * 1000 milliseconds)
    this.intervalId = window.setInterval(() => {
      this.checkReminders(getTasks(), showNotification);
    }, 3 * 60 * 60 * 1000);

    console.log('Reminder service started - checking every 3 hours');
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    console.log('Reminder service stopped');
  }

  private checkReminders(tasks: Task[], showNotification: (title: string, body: string) => void) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Get today's incomplete tasks
    const todaysTasks = tasks.filter(task => {
      if (task.completed) return false;
      
      const taskDate = new Date(task.dueDate);
      const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      
      return taskDay.getTime() === today.getTime();
    });

    // Get overdue tasks
    const overdueTasks = tasks.filter(task => {
      if (task.completed) return false;
      
      const taskDate = new Date(task.dueDate);
      return taskDate < today;
    });

    // Get tomorrow's tasks (preview notification)
    const tomorrowsTasks = tasks.filter(task => {
      if (task.completed) return false;
      
      const taskDate = new Date(task.dueDate);
      const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
      
      return taskDay.getTime() === tomorrow.getTime();
    });

    // Show notifications
    if (todaysTasks.length > 0) {
      const highPriorityToday = todaysTasks.filter(t => t.priority === 'high').length;
      const title = `📋 Today's Tasks (${todaysTasks.length})`;
      let body = `You have ${todaysTasks.length} pending task${todaysTasks.length > 1 ? 's' : ''} for today`;
      
      if (highPriorityToday > 0) {
        body += ` - ${highPriorityToday} high priority!`;
      }

      showNotification(title, body);
    }

    if (overdueTasks.length > 0) {
      const title = `⚠️ Overdue Tasks (${overdueTasks.length})`;
      const body = `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue and need${overdueTasks.length === 1 ? 's' : ''} attention`;
      
      showNotification(title, body);
    }

    // Show preview of tomorrow's tasks (only during evening hours)
    const currentHour = now.getHours();
    if (tomorrowsTasks.length > 0 && currentHour >= 18 && currentHour <= 22) {
      const title = `📅 Tomorrow's Preview (${tomorrowsTasks.length})`;
      const body = `You have ${tomorrowsTasks.length} task${tomorrowsTasks.length > 1 ? 's' : ''} scheduled for tomorrow`;
      
      showNotification(title, body);
    }
  }

  // Manual check function for immediate reminders
  checkNow(tasks: Task[], showNotification: (title: string, body: string) => void) {
    this.checkReminders(tasks, showNotification);
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

export const useReminderService = (tasks: Task[]) => {
  const serviceRef = useRef<ReminderService>();
  
  useEffect(() => {
    serviceRef.current = ReminderService.getInstance();
    
    return () => {
      serviceRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  const startReminders = () => {
    if (serviceRef.current && 'Notification' in window) {
      serviceRef.current.start(
        () => tasks,
        (title: string, body: string) => {
          if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
              body,
              icon: '/favicon.ico',
              tag: 'todo-reminder',
              requireInteraction: false,
            });

            // Auto-close notification after 5 seconds
            setTimeout(() => notification.close(), 5000);
          }
        }
      );
    }
  };

  const stopReminders = () => {
    serviceRef.current?.stop();
  };

  const checkReminders = () => {
    if (serviceRef.current && 'Notification' in window) {
      serviceRef.current.checkNow(
        tasks,
        (title: string, body: string) => {
          if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
              body,
              icon: '/favicon.ico',
              tag: 'todo-reminder-manual',
              requireInteraction: false,
            });

            setTimeout(() => notification.close(), 5000);
          }
        }
      );
    }
  };

  const isActive = () => {
    return serviceRef.current?.isRunning() || false;
  };

  return {
    startReminders,
    stopReminders,
    checkReminders,
    isActive,
    hasPermission: 'Notification' in window && Notification.permission === 'granted',
    canRequestPermission: 'Notification' in window && Notification.permission === 'default'
  };
};