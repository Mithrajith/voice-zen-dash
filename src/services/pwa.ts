// Service Worker Management and Offline Functionality

let swRegistration: ServiceWorkerRegistration | null = null;
let isOnline = navigator.onLine;

export interface OfflineQueueItem {
  id?: number;
  type: 'task' | 'transaction' | 'preference';
  data: any;
  timestamp: number;
}

// Service Worker Registration
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Voice Zen SW: Registered successfully', swRegistration);

    // Handle updates
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration?.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available
              showUpdateAvailableNotification();
            }
          }
        });
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return swRegistration;
  } catch (error) {
    console.error('Voice Zen SW: Registration failed:', error);
    return null;
  }
};

// Handle messages from service worker
const handleServiceWorkerMessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SW_MESSAGE':
      handleSyncNotification(payload.type, payload.data);
      break;
    case 'GET_AUTH_TOKEN':
      // Respond with auth token
      const token = localStorage.getItem('authToken');
      event.ports[0].postMessage({ token });
      break;
    default:
      console.log('Voice Zen SW: Unknown message from SW:', type);
  }
};

// Handle sync notifications
const handleSyncNotification = (type: string, data: any) => {
  switch (type) {
    case 'tasks-synced':
      console.log(`Synced ${data.count} tasks from offline queue`);
      window.dispatchEvent(new CustomEvent('offline-sync', {
        detail: { type: 'tasks', count: data.count }
      }));
      break;
    case 'transactions-synced':
      console.log(`Synced ${data.count} transactions from offline queue`);
      window.dispatchEvent(new CustomEvent('offline-sync', {
        detail: { type: 'transactions', count: data.count }
      }));
      break;
    case 'recurring-tasks-generated':
      console.log(`Generated ${data.generatedCount} recurring tasks`);
      window.dispatchEvent(new CustomEvent('recurring-tasks-generated', {
        detail: data
      }));
      break;
  }
};

// Show update available notification
const showUpdateAvailableNotification = () => {
  const event = new CustomEvent('sw-update-available');
  window.dispatchEvent(event);
};

// Update service worker
export const updateServiceWorker = async () => {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
};

// Offline Queue Management
export const addToOfflineQueue = async (type: 'task' | 'transaction' | 'preference', data: any) => {
  if (!navigator.serviceWorker.controller) {
    throw new Error('Service Worker not available');
  }

  const queueItem: OfflineQueueItem = {
    type,
    data,
    timestamp: Date.now()
  };

  const messageType = `STORE_OFFLINE_${type.toUpperCase()}`;
  navigator.serviceWorker.controller.postMessage({
    type: messageType,
    data: queueItem
  });

  console.log(`Added ${type} to offline queue`);
};

// Network status management
export const initializeNetworkMonitoring = () => {
  // Update online status
  const updateOnlineStatus = () => {
    const wasOffline = !isOnline;
    isOnline = navigator.onLine;

    if (isOnline && wasOffline) {
      console.log('Voice Zen: Back online, triggering sync');
      triggerBackgroundSync();
      
      window.dispatchEvent(new CustomEvent('network-status-changed', {
        detail: { isOnline: true, wasOffline: true }
      }));
    } else if (!isOnline && !wasOffline) {
      console.log('Voice Zen: Went offline');
      
      window.dispatchEvent(new CustomEvent('network-status-changed', {
        detail: { isOnline: false, wasOffline: false }
      }));
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Initial status
  updateOnlineStatus();
};

// Trigger background sync
export const triggerBackgroundSync = async () => {
  if (!swRegistration) {
    console.warn('Service Worker not registered');
    return;
  }

  try {
    // Check if background sync is supported
    if ('sync' in swRegistration) {
      const syncManager = (swRegistration as any).sync;
      await Promise.all([
        syncManager.register('task-sync'),
        syncManager.register('transaction-sync'),
        syncManager.register('recurring-task-sync')
      ]);
      console.log('Voice Zen: Background sync registered');
    } else {
      console.warn('Background Sync not supported');
    }
  } catch (error) {
    console.error('Voice Zen: Background sync registration failed:', error);
  }
};

// Push notifications setup
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
};

export const subscribeToNotifications = async (): Promise<PushSubscription | null> => {
  if (!swRegistration) {
    console.warn('Service Worker not registered');
    return null;
  }

  try {
    // Check if already subscribed
    let subscription = await swRegistration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertVapidKey(getVapidPublicKey()) as BufferSource
      });
    }

    console.log('Voice Zen: Push subscription acquired');
    return subscription;
  } catch (error) {
    console.error('Voice Zen: Push subscription failed:', error);
    return null;
  }
};

// Utility functions
const getVapidPublicKey = (): string => {
  // This should be your VAPID public key from the server
  // For demo purposes, using a placeholder
  return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM_aBmaw8_63Dj_2y1j8YRD1TUJ8C_GZdWk7tGHKzOY-e7waXfrLvM';
};

const convertVapidKey = (vapidKey: string): Uint8Array => {
  const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
  const base64 = (vapidKey + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Cache management
export const clearCaches = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('Voice Zen: Caches cleared');
};

export const getCacheSize = async (): Promise<number> => {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  } catch (error) {
    console.error('Voice Zen: Failed to get cache size:', error);
    return 0;
  }
};

// App installation
export const installApp = async () => {
  const beforeInstallPrompt = (window as any).beforeInstallPromptEvent;
  
  if (beforeInstallPrompt) {
    beforeInstallPrompt.prompt();
    const { outcome } = await beforeInstallPrompt.userChoice;
    console.log('Voice Zen: Install prompt outcome:', outcome);
    
    // Clear the prompt
    (window as any).beforeInstallPromptEvent = null;
    
    return outcome === 'accepted';
  }
  
  return false;
};

// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).beforeInstallPromptEvent = e;
  
  // Dispatch custom event to notify app
  window.dispatchEvent(new CustomEvent('app-install-available'));
});

// Network status getters
export const getNetworkStatus = () => ({
  isOnline,
  connection: (navigator as any).connection || null,
  effectiveType: (navigator as any).connection?.effectiveType || 'unknown'
});

// Export service worker registration for use by other modules
export const getServiceWorkerRegistration = () => swRegistration;

// Initialize everything
export const initializePWA = async () => {
  console.log('Voice Zen: Initializing PWA features...');
  
  try {
    // Register service worker
    await registerServiceWorker();
    
    // Initialize network monitoring
    initializeNetworkMonitoring();
    
    // Request notification permission (optional, can be done later)
    if (localStorage.getItem('notifications-permission-requested') !== 'true') {
      const permission = await requestNotificationPermission();
      localStorage.setItem('notifications-permission-requested', 'true');
      console.log('Voice Zen: Notification permission:', permission);
    }
    
    console.log('Voice Zen: PWA initialized successfully');
  } catch (error) {
    console.error('Voice Zen: PWA initialization failed:', error);
  }
};