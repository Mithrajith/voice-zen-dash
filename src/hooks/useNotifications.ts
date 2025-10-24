import { useEffect } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
}

export const useNotifications = () => {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (options: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        silent: options.silent || false,
        requireInteraction: options.requireInteraction || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    return null;
  };

  const scheduleNotification = (options: NotificationOptions, delay: number) => {
    setTimeout(() => {
      showNotification(options);
    }, delay);
  };

  const checkTaskReminders = (tasks: any[]) => {
    const now = new Date();
    tasks.forEach((task) => {
      if (!task.completed && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Notify if task is due within 1 hour
        if (hoursDiff > 0 && hoursDiff <= 1) {
          showNotification({
            title: 'Task Reminder',
            body: `"${task.title}" is due soon!`,
            tag: `task-${task.id}`,
            requireInteraction: true,
          });
        }
        
        // Notify if task is overdue
        if (hoursDiff < 0 && hoursDiff > -24) {
          showNotification({
            title: 'Overdue Task',
            body: `"${task.title}" was due ${Math.abs(Math.round(hoursDiff))} hours ago`,
            tag: `overdue-${task.id}`,
            requireInteraction: true,
          });
        }
      }
    });
  };

  const checkBudgetAlerts = (transactions: any[]) => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthlyExpenses = transactions
      .filter((t: any) => {
        const date = new Date(t.date);
        return (
          t.type === 'expense' &&
          date.getMonth() === thisMonth &&
          date.getFullYear() === thisYear
        );
      })
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const monthlyIncome = transactions
      .filter((t: any) => {
        const date = new Date(t.date);
        return (
          t.type === 'income' &&
          date.getMonth() === thisMonth &&
          date.getFullYear() === thisYear
        );
      })
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    // Alert if expenses exceed 80% of income
    if (monthlyIncome > 0 && (monthlyExpenses / monthlyIncome) > 0.8) {
      showNotification({
        title: 'Budget Alert',
        body: `You've spent ${Math.round((monthlyExpenses / monthlyIncome) * 100)}% of your monthly income`,
        tag: 'budget-alert',
        requireInteraction: true,
      });
    }

    // Alert if expenses exceed income
    if (monthlyExpenses > monthlyIncome) {
      showNotification({
        title: 'Budget Warning',
        body: 'Your monthly expenses exceed your income!',
        tag: 'budget-warning',
        requireInteraction: true,
      });
    }
  };

  return {
    showNotification,
    scheduleNotification,
    checkTaskReminders,
    checkBudgetAlerts,
  };
};