// Advanced Data Synchronization and Offline Management System

import React from 'react';
import { addToOfflineQueue, getNetworkStatus } from './pwa';

export interface SyncQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'task' | 'transaction' | 'budget-limit' | 'recurring-task' | 'user-preferences';
  data: any;
  localId?: string; // For optimistic updates
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  conflicts?: ConflictData[];
}

export interface ConflictData {
  field: string;
  localValue: any;
  serverValue: any;
  resolution?: 'local' | 'server' | 'merge';
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  version: string;
  lastSync?: number;
}

class DataSyncManager {
  private dbName = 'voice-zen-sync';
  private dbVersion = 3;
  private db: IDBDatabase | null = null;
  private syncQueue: SyncQueueItem[] = [];
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    this.initializeDB();
    this.setupEventListeners();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Sync queue store
        if (!db.objectStoreNames.contains('sync-queue')) {
          const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type');
          syncStore.createIndex('entity', 'entity');
          syncStore.createIndex('priority', 'priority');
          syncStore.createIndex('timestamp', 'timestamp');
        }
        
        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
          cacheStore.createIndex('lastSync', 'lastSync');
        }
        
        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictStore.createIndex('entity', 'entity');
          conflictStore.createIndex('timestamp', 'timestamp');
        }
        
        // Offline actions store
        if (!db.objectStoreNames.contains('offline-actions')) {
          const actionsStore = db.createObjectStore('offline-actions', { keyPath: 'id', autoIncrement: true });
          actionsStore.createIndex('type', 'type');
          actionsStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    // Listen for sync messages from service worker
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_COMPLETED') {
        this.handleSyncCompleted(event.data.payload);
      }
    });
  }

  // Optimistic Updates
  async performOptimisticUpdate<T>(
    entity: SyncQueueItem['entity'],
    operation: SyncQueueItem['type'],
    data: T,
    localId?: string
  ): Promise<{ success: boolean; localData: T; conflictId?: string }> {
    const optimisticId = localId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Apply optimistic update locally
    await this.updateLocalCache(entity, data, optimisticId);
    
    // Queue for sync
    const syncItem: SyncQueueItem = {
      id: `${entity}-${operation}-${Date.now()}`,
      type: operation,
      entity,
      data,
      localId: optimisticId,
      timestamp: Date.now(),
      retryCount: 0,
      priority: operation === 'DELETE' ? 'high' : 'medium'
    };
    
    await this.addToSyncQueue(syncItem);
    
    // Try immediate sync if online
    if (this.isOnline) {
      setTimeout(() => this.processSyncQueue(), 100);
    }
    
    return { success: true, localData: data };
  }

  // Cache Management
  async updateLocalCache(entity: string, data: any, id: string): Promise<void> {
    if (!this.db) return;
    
    const cacheKey = `${entity}-${id}`;
    const cacheEntry: CacheEntry = {
      key: cacheKey,
      data,
      timestamp: Date.now(),
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      version: data.version || '1.0',
      lastSync: this.isOnline ? Date.now() : undefined
    };
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    await store.put(cacheEntry);
  }

  async getFromCache(entity: string, id: string): Promise<any> {
    if (!this.db) return null;
    
    const cacheKey = `${entity}-${id}`;
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise((resolve) => {
      const request = store.get(cacheKey);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry;
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  // Sync Queue Management
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    await store.put(item);
    
    this.syncQueue.push(item);
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || !this.db) return;
    
    this.syncInProgress = true;
    console.log('Processing sync queue...');
    
    try {
      const transaction = this.db.transaction(['sync-queue'], 'readonly');
      const store = transaction.objectStore('sync-queue');
      const items = await this.getAllFromStore(store);
      
      // Sort by priority and timestamp
      const sortedItems = items.sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorities[b.priority] - priorities[a.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });
      
      for (const item of sortedItems) {
        await this.processSyncItem(item);
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    try {
      let endpoint = '';
      let method = '';
      let body = null;
      
      // Map entity and operation to API endpoint
      switch (item.entity) {
        case 'task':
          endpoint = '/api/tasks';
          if (item.type === 'CREATE') {
            method = 'POST';
            body = item.data;
          } else if (item.type === 'UPDATE') {
            endpoint += `/${item.data.id}`;
            method = 'PATCH';
            body = item.data;
          } else if (item.type === 'DELETE') {
            endpoint += `/${item.data.id}`;
            method = 'DELETE';
          }
          break;
          
        case 'transaction':
          endpoint = '/api/budget/transactions';
          if (item.type === 'CREATE') {
            method = 'POST';
            body = item.data;
          } else if (item.type === 'UPDATE') {
            endpoint += `/${item.data.id}`;
            method = 'PATCH';
            body = item.data;
          } else if (item.type === 'DELETE') {
            endpoint += `/${item.data.id}`;
            method = 'DELETE';
          }
          break;
          
        // Add other entities...
      }
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : null
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Check for conflicts
        if (result.conflict) {
          await this.handleConflict(item, result);
        } else {
          // Success - remove from queue and update cache
          await this.removeFromSyncQueue(item.id);
          
          if (result.data) {
            await this.updateLocalCache(item.entity, result.data, result.data.id);
          }
          
          // Notify success
          this.notifySync('success', {
            entity: item.entity,
            type: item.type,
            data: result.data
          });
        }
      } else {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 409) {
          // Conflict
          await this.handleConflict(item, errorData);
        } else if (response.status >= 500) {
          // Server error - retry later
          await this.incrementRetryCount(item);
        } else {
          // Client error - remove from queue
          await this.removeFromSyncQueue(item.id);
          this.notifySync('error', {
            entity: item.entity,
            type: item.type,
            error: errorData.message || 'Sync failed'
          });
        }
      }
    } catch (error) {
      console.error('Sync item processing failed:', error);
      await this.incrementRetryCount(item);
    }
  }

  // Conflict Resolution
  private async handleConflict(item: SyncQueueItem, conflictData: any): Promise<void> {
    const conflict = {
      id: `conflict-${Date.now()}`,
      syncItemId: item.id,
      entity: item.entity,
      localData: item.data,
      serverData: conflictData.serverData,
      conflicts: conflictData.conflicts || [],
      timestamp: Date.now()
    };
    
    // Store conflict for user resolution
    if (this.db) {
      const transaction = this.db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      await store.put(conflict);
    }
    
    // Notify UI about conflict
    this.notifySync('conflict', conflict);
  }

  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    if (!this.db) return;
    
    // Get conflict data
    const transaction = this.db.transaction(['conflicts'], 'readwrite');
    const store = transaction.objectStore('conflicts');
    const conflict = await this.getFromStore(store, conflictId);
    
    if (!conflict) return;
    
    let finalData = conflict.localData;
    
    switch (resolution) {
      case 'server':
        finalData = conflict.serverData;
        break;
      case 'merge':
        finalData = mergedData || conflict.localData;
        break;
      case 'local':
      default:
        finalData = conflict.localData;
        break;
    }
    
    // Update the original sync item with resolved data
    const syncTransaction = this.db.transaction(['sync-queue'], 'readwrite');
    const syncStore = syncTransaction.objectStore('sync-queue');
    const syncItem = await this.getFromStore(syncStore, conflict.syncItemId);
    
    if (syncItem) {
      syncItem.data = finalData;
      syncItem.retryCount = 0; // Reset retry count
      await syncStore.put(syncItem);
    }
    
    // Remove conflict
    await store.delete(conflictId);
    
    // Retry sync
    await this.processSyncQueue();
  }

  // Utility methods
  private async getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }

  private async getFromStore(store: IDBObjectStore, key: any): Promise<any> {
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  private async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    await store.delete(id);
    
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
  }

  private async incrementRetryCount(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;
    
    item.retryCount++;
    
    if (item.retryCount >= 5) {
      // Max retries reached - move to failed queue or remove
      await this.removeFromSyncQueue(item.id);
      this.notifySync('failed', {
        entity: item.entity,
        type: item.type,
        error: 'Max retries exceeded'
      });
    } else {
      const transaction = this.db.transaction(['sync-queue'], 'readwrite');
      const store = transaction.objectStore('sync-queue');
      await store.put(item);
    }
  }

  private handleSyncCompleted(payload: any): void {
    console.log('Sync completed:', payload);
    // Handle service worker sync completion
  }

  private notifySync(type: 'success' | 'error' | 'conflict' | 'failed', data: any): void {
    window.dispatchEvent(new CustomEvent('data-sync', {
      detail: { type, data }
    }));
  }

  // Public API
  async syncNow(): Promise<void> {
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    await store.clear();
  }

  async getQueueLength(): Promise<number> {
    if (!this.db) return 0;
    
    const transaction = this.db.transaction(['sync-queue'], 'readonly');
    const store = transaction.objectStore('sync-queue');
    
    return new Promise((resolve) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  async getPendingConflicts(): Promise<any[]> {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['conflicts'], 'readonly');
    const store = transaction.objectStore('conflicts');
    return this.getAllFromStore(store);
  }
}

// Singleton instance
export const dataSyncManager = new DataSyncManager();

// React hooks for data sync
export const useDataSync = () => {
  const [queueLength, setQueueLength] = React.useState(0);
  const [conflicts, setConflicts] = React.useState<any[]>([]);
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'error'>('idle');

  React.useEffect(() => {
    const updateStats = async () => {
      const length = await dataSyncManager.getQueueLength();
      const pendingConflicts = await dataSyncManager.getPendingConflicts();
      
      setQueueLength(length);
      setConflicts(pendingConflicts);
    };

    const handleSyncEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      switch (type) {
        case 'success':
          setSyncStatus('idle');
          break;
        case 'error':
        case 'failed':
          setSyncStatus('error');
          break;
        case 'conflict':
          setConflicts(prev => [...prev, data]);
          break;
      }
      
      updateStats();
    };

    updateStats();
    window.addEventListener('data-sync', handleSyncEvent as EventListener);
    
    // Periodic updates
    const interval = setInterval(updateStats, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('data-sync', handleSyncEvent as EventListener);
      clearInterval(interval);
    };
  }, []);

  return {
    queueLength,
    conflicts,
    syncStatus,
    syncNow: () => dataSyncManager.syncNow(),
    resolveConflict: dataSyncManager.resolveConflict.bind(dataSyncManager),
    clearCache: () => dataSyncManager.clearCache()
  };
};

export default dataSyncManager;