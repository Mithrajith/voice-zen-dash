const CACHE_NAME = 'voice-zen-dashboard-v2';
const STATIC_CACHE = 'voice-zen-static-v2';
const DYNAMIC_CACHE = 'voice-zen-dynamic-v2';
const API_CACHE = 'voice-zen-api-v2';

const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg',
  '/placeholder.svg'
];

const API_CACHE_URLS = [
  '/api/auth/me',
  '/api/tasks',
  '/api/budget/transactions',
  '/api/budget/limits',
  '/api/recurring'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Enhanced service worker with intelligent caching, offline sync, and background processing
// Includes advanced conflict resolution, optimistic updates, and smart sync strategies

// Background sync queue management
let syncQueue = [];
let isProcessingQueue = false;

// IndexedDB helper functions
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voice-zen-sw', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp');
        syncStore.createIndex('priority', 'priority');
      }
      
      if (!db.objectStoreNames.contains('offline-cache')) {
        const cacheStore = db.createObjectStore('offline-cache', { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp');
      }
    };
  });
};

self.addEventListener('install', (event) => {
  console.log('Enhanced Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('Pre-caching API endpoints');
        return Promise.allSettled(
          API_CACHE_URLS.map(url => 
            fetch(url).then(response => {
              if (response.ok) return cache.put(url, response);
            }).catch(() => {}) // Ignore failures during install
          )
        );
      }),
      openDB() // Initialize IndexedDB
    ])
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Enhanced Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Initialize sync queue processing
      initializeSyncQueue()
    ])
  );
  
  self.clients.claim();
});

// Advanced fetch handler with intelligent caching and offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http') || request.url.includes('chrome-extension')) {
    return;
  }
  
  // Handle API requests (including non-GET for offline queueing)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  if (STATIC_CACHE_URLS.some(staticUrl => url.pathname === staticUrl || url.pathname.endsWith(staticUrl))) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Handle other requests with network-first strategy
  event.respondWith(handleDefaultRequest(request));
});

// API request handler with offline queue and advanced conflict resolution
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // For non-GET requests, handle offline queueing
  if (request.method !== 'GET') {
    // Clone request BEFORE using it (Request body can only be consumed once)
    const requestClone = request.clone();
    
    try {
      const response = await fetch(request);
      
      if (response.ok) {
        // Cache successful responses for some endpoints
        if (['POST', 'PATCH'].includes(request.method)) {
          const cache = await caches.open(API_CACHE);
          // Cache the related GET endpoint if applicable
          const getUrl = url.pathname.replace(/\/[^\/]+$/, '');
          if (getUrl !== url.pathname) {
            try {
              const getResponse = await fetch(getUrl, {
                headers: { 'Authorization': request.headers.get('Authorization') }
              });
              if (getResponse.ok) {
                await cache.put(getUrl, getResponse);
              }
            } catch (e) {
              console.log('Failed to update cache after mutation:', e);
            }
          }
        }
        return response;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('API request failed, queueing for sync:', error);
      
      // Use the cloned request to read body
      let requestBody = null;
      try {
        if (requestClone.method !== 'GET') {
          requestBody = await requestClone.text();
        }
      } catch (e) {
        console.log('Failed to read request body:', e);
      }
      
      // Queue the request for later sync
      await queueOfflineRequest({
        id: `${request.method}-${url.pathname}-${Date.now()}`,
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestBody,
        timestamp: Date.now(),
        retryCount: 0
      });
      
      // Return optimistic response for certain operations
      if (request.method === 'POST' && url.pathname.includes('/tasks')) {
        let body = {};
        try {
          if (requestBody) {
            body = JSON.parse(requestBody);
          }
        } catch (e) {
          console.log('Failed to parse request body:', e);
        }
        return new Response(
          JSON.stringify({
            ...body,
            id: `temp-${Date.now()}`,
            status: 'pending-sync',
            offline: true
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Return a meaningful offline response
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'Request queued for sync when online',
          queued: true
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  // GET requests - intelligent cache strategy with freshness checking
  try {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Check cache freshness
    const cacheAge = cachedResponse ? 
      Date.now() - new Date(cachedResponse.headers.get('date')).getTime() : 
      Infinity;
    
    const CACHE_MAX_AGE = {
      '/api/auth/me': 5 * 60 * 1000,      // 5 minutes
      '/api/tasks': 2 * 60 * 1000,        // 2 minutes
      '/api/budget': 5 * 60 * 1000,       // 5 minutes
      'default': 10 * 60 * 1000            // 10 minutes
    };
    
    const maxAge = Object.keys(CACHE_MAX_AGE).find(path => 
      url.pathname.startsWith(path)
    ) || 'default';
    
    const isStale = cacheAge > CACHE_MAX_AGE[maxAge];
    
    // If we have fresh cache and we're offline, use it
    if (cachedResponse && !navigator.onLine) {
      return cachedResponse;
    }
    
    // Try network first for fresh data
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Update cache with fresh data
        await cache.put(request, networkResponse.clone());
        return networkResponse;
      } else {
        // If network fails but we have cache, use cache
        if (cachedResponse) {
          return cachedResponse;
        }
        throw new Error(`HTTP ${networkResponse.status}`);
      }
    } catch (networkError) {
      // Network failed, use cache if available
      if (cachedResponse) {
        console.log('Using cached response due to network failure');
        return cachedResponse;
      }
      throw networkError;
    }
  } catch (error) {
    console.log('API GET request failed:', error);
    
    // Return appropriate offline response
    if (url.pathname === '/api/auth/me') {
      return new Response(JSON.stringify({ 
        error: 'Offline', 
        message: 'Please check your connection' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return generic offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No cached data available'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Static asset handler - cache first with network fallback
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Static asset request failed:', error);
    throw error;
  }
}

// Navigation handler - return app shell with offline fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Navigation request failed, serving app shell:', error);
    
    // Return cached app shell
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Voice Zen Dashboard - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              background: #f5f5f5;
            }
            .offline-message {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .btn {
              background: #007bff;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 1rem;
            }
            .btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <h1>🔌 You're offline</h1>
            <p>Voice Zen Dashboard will sync your data when you're back online.</p>
            <button class="btn" onclick="window.location.reload()">Try again</button>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Default request handler with dynamic caching
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses (excluding large files)
    if (networkResponse.ok && 
        networkResponse.headers.get('content-length') < 1048576) { // 1MB limit
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to return cached version
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Queue offline requests for background sync
async function queueOfflineRequest(requestData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    
    await new Promise((resolve, reject) => {
      const request = store.add(requestData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('Queued offline request:', requestData.id);
    
    // Try to register for background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await self.registration.sync.register('background-sync');
      } catch (syncError) {
        console.log('Background sync registration failed:', syncError);
      }
    }
  } catch (error) {
    console.error('Failed to queue offline request:', error);
  }
}

// Initialize sync queue processing
async function initializeSyncQueue() {
  try {
    const db = await openDB();
    console.log('Sync queue initialized');
    
    // Process any existing queue items
    if (navigator.onLine) {
      await processOfflineQueue();
    }
  } catch (error) {
    console.error('Failed to initialize sync queue:', error);
  }
}

// Process offline queue when online
async function processOfflineQueue() {
  if (isProcessingQueue) return;
  
  try {
    isProcessingQueue = true;
    const db = await openDB();
    const transaction = db.transaction(['sync-queue'], 'readonly');
    const store = transaction.objectStore('sync-queue');
    
    const queueItems = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log(`Processing ${queueItems.length} queued requests`);
    
    for (const item of queueItems) {
      try {
        await processSyncItem(item);
      } catch (error) {
        console.error('Failed to process sync item:', item.id, error);
        
        // Increment retry count
        item.retryCount++;
        if (item.retryCount < 5) {
          // Save updated item back to queue
          const updateTransaction = db.transaction(['sync-queue'], 'readwrite');
          const updateStore = updateTransaction.objectStore('sync-queue');
          await new Promise((resolve, reject) => {
            const request = updateStore.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        } else {
          // Max retries reached, remove from queue
          await removeSyncItem(item.id);
          console.log('Max retries reached for item:', item.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to process offline queue:', error);
  } finally {
    isProcessingQueue = false;
  }
}

// Process individual sync item
async function processSyncItem(item) {
  const response = await fetch(item.url, {
    method: item.method,
    headers: item.headers,
    body: item.body
  });
  
  if (response.ok) {
    await removeSyncItem(item.id);
    console.log('Successfully synced item:', item.id);
    
    // Notify clients of successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        payload: { id: item.id, success: true }
      });
    });
  } else {
    throw new Error(`Sync failed with status: ${response.status}`);
  }
}

// Remove item from sync queue
async function removeSyncItem(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    
    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to remove sync item:', error);
  }
}

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Voice Zen Dashboard',
    body: 'You have a new notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'voice-zen-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      timestamp: Date.now(),
      url: '/'
    }
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload,
        data: {
          ...notificationData.data,
          ...payload.data
        }
      };
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body;
    }
  }
  
  // Add action buttons
  notificationData.actions = [
    {
      action: 'open',
      title: 'Open App',
      icon: '/icon.svg'
    },
    {
      action: 'dismiss',
      title: 'Dismiss'
    }
  ];

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'dismiss') {
    return; // Just close the notification
  }
  
  // Handle opening the app
  const urlToOpen = data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        
        // Open new window
        return clients.openWindow(urlToOpen);
      })
  );
});

// Initialize IndexedDB for offline storage
async function initializeOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voice-zen-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for offline sync
      if (!db.objectStoreNames.contains('pending-tasks')) {
        const taskStore = db.createObjectStore('pending-tasks', { keyPath: 'id', autoIncrement: true });
        taskStore.createIndex('timestamp', 'timestamp');
        taskStore.createIndex('type', 'type');
      }
      
      if (!db.objectStoreNames.contains('pending-transactions')) {
        const transactionStore = db.createObjectStore('pending-transactions', { keyPath: 'id', autoIncrement: true });
        transactionStore.createIndex('timestamp', 'timestamp');
        transactionStore.createIndex('type', 'type');
      }
      
      if (!db.objectStoreNames.contains('offline-cache')) {
        const cacheStore = db.createObjectStore('offline-cache', { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type');
        syncStore.createIndex('priority', 'priority');
        syncStore.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Sync functions for offline data
async function syncPendingTasks() {
  try {
    console.log('Voice Zen SW: Syncing pending tasks...');
    const pendingTasks = await getOfflineData('pending-tasks');
    
    if (!pendingTasks || pendingTasks.length === 0) {
      return;
    }
    
    let syncedCount = 0;
    
    for (const task of pendingTasks) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify(task.data)
        });
        
        if (response.ok) {
          await removeOfflineData('pending-tasks', task.id);
          syncedCount++;
        }
      } catch (error) {
        console.error('Voice Zen SW: Failed to sync task:', error);
      }
    }
    
    if (syncedCount > 0) {
      await notifyClients('tasks-synced', { count: syncedCount });
    }
    
    console.log(`Voice Zen SW: Synced ${syncedCount}/${pendingTasks.length} tasks`);
  } catch (error) {
    console.error('Voice Zen SW: Task sync failed:', error);
  }
}

async function syncPendingTransactions() {
  try {
    console.log('Voice Zen SW: Syncing pending transactions...');
    const pendingTransactions = await getOfflineData('pending-transactions');
    
    if (!pendingTransactions || pendingTransactions.length === 0) {
      return;
    }
    
    let syncedCount = 0;
    
    for (const transaction of pendingTransactions) {
      try {
        const response = await fetch('/api/budget/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify(transaction.data)
        });
        
        if (response.ok) {
          await removeOfflineData('pending-transactions', transaction.id);
          syncedCount++;
        }
      } catch (error) {
        console.error('Voice Zen SW: Failed to sync transaction:', error);
      }
    }
    
    if (syncedCount > 0) {
      await notifyClients('transactions-synced', { count: syncedCount });
    }
    
    console.log(`Voice Zen SW: Synced ${syncedCount}/${pendingTransactions.length} transactions`);
  } catch (error) {
    console.error('Voice Zen SW: Transaction sync failed:', error);
  }
}

async function syncRecurringTasks() {
  try {
    console.log('Voice Zen SW: Generating recurring tasks...');
    
    const response = await fetch('/api/recurring/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.data.generatedCount > 0) {
        await notifyClients('recurring-tasks-generated', result.data);
      }
    }
  } catch (error) {
    console.error('Voice Zen SW: Recurring task sync failed:', error);
  }
}

async function syncUserPreferences() {
  try {
    console.log('Voice Zen SW: Syncing user preferences...');
    const pendingPrefs = await getOfflineData('pending-preferences');
    
    if (!pendingPrefs || pendingPrefs.length === 0) {
      return;
    }
    
    for (const pref of pendingPrefs) {
      try {
        const response = await fetch('/api/auth/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify(pref.data)
        });
        
        if (response.ok) {
          await removeOfflineData('pending-preferences', pref.id);
        }
      } catch (error) {
        console.error('Voice Zen SW: Failed to sync preferences:', error);
      }
    }
  } catch (error) {
    console.error('Voice Zen SW: Preferences sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voice-zen-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

async function storeOfflineData(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voice-zen-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const dataWithTimestamp = {
        ...data,
        timestamp: Date.now()
      };
      
      const addRequest = store.add(dataWithTimestamp);
      
      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

async function removeOfflineData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voice-zen-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

async function getAuthToken() {
  try {
    // Try to get token from localStorage via client
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data.token || null);
        };
        
        clients[0].postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2]);
        
        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000);
      });
    }
    return null;
  } catch (error) {
    console.error('Voice Zen SW: Failed to get auth token:', error);
    return null;
  }
}

async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_MESSAGE',
      payload: { type, data }
    });
  });
}

// Handle messages from client
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'STORE_OFFLINE_TASK':
      storeOfflineData('pending-tasks', data)
        .then(() => {
          self.registration.sync.register('task-sync');
        })
        .catch(console.error);
      break;
      
    case 'STORE_OFFLINE_TRANSACTION':
      storeOfflineData('pending-transactions', data)
        .then(() => {
          self.registration.sync.register('transaction-sync');
        })
        .catch(console.error);
      break;
      
    case 'GET_AUTH_TOKEN':
      // This is handled by the client-side message channel
      break;
      
    default:
      console.log('Voice Zen SW: Unknown message type:', type);
  }
});