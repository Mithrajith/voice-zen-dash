import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Wifi, WifiOff, Download, RefreshCw, Bell, BellOff } from 'lucide-react';
import { 
  getNetworkStatus, 
  updateServiceWorker, 
  installApp, 
  requestNotificationPermission,
  subscribeToNotifications,
  clearCaches,
  getCacheSize
} from '../services/pwa';
import { useToast } from '../hooks/use-toast';

export const PWAManager: React.FC = () => {
  const [networkStatus, setNetworkStatus] = useState(getNetworkStatus());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification?.permission || 'default');
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Listen for network status changes
  useEffect(() => {
    const handleNetworkChange = (event: CustomEvent) => {
      setNetworkStatus(getNetworkStatus());
      
      if (event.detail.isOnline && event.detail.wasOffline) {
        toast({
          title: 'Back online!',
          description: 'Syncing your offline changes...',
        });
      } else if (!event.detail.isOnline) {
        toast({
          title: 'You\'re offline',
          description: 'Your changes will be synced when you\'re back online.',
          variant: 'destructive'
        });
      }
    };

    window.addEventListener('network-status-changed', handleNetworkChange as EventListener);
    return () => window.removeEventListener('network-status-changed', handleNetworkChange as EventListener);
  }, [toast]);

  // Listen for service worker update
  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', handleUpdateAvailable);
  }, []);

  // Listen for app install availability
  useEffect(() => {
    const handleInstallAvailable = () => {
      setInstallAvailable(true);
    };

    window.addEventListener('app-install-available', handleInstallAvailable);
    return () => window.removeEventListener('app-install-available', handleInstallAvailable);
  }, []);

  // Listen for offline sync events
  useEffect(() => {
    const handleOfflineSync = (event: CustomEvent) => {
      const { type, count } = event.detail;
      toast({
        title: 'Sync complete',
        description: `Synced ${count} ${type} from offline queue.`,
      });
    };

    window.addEventListener('offline-sync', handleOfflineSync as EventListener);
    return () => window.removeEventListener('offline-sync', handleOfflineSync as EventListener);
  }, [toast]);

  // Get cache size on mount
  useEffect(() => {
    getCacheSize().then(setCacheSize);
  }, []);

  const handleUpdate = async () => {
    try {
      await updateServiceWorker();
      toast({
        title: 'Update applied',
        description: 'The app has been updated to the latest version.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Failed to apply the update. Please refresh manually.',
      });
    }
  };

  const handleInstall = async () => {
    try {
      const installed = await installApp();
      if (installed) {
        setInstallAvailable(false);
        toast({
          title: 'App installed!',
          description: 'Voice Zen Dashboard has been installed to your device.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Installation failed',
        description: 'Failed to install the app. Please try again.',
      });
    }
  };

  const handleNotificationPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToNotifications();
        toast({
          title: 'Notifications enabled',
          description: 'You\'ll receive important updates and reminders.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Notifications blocked',
          description: 'Enable notifications in your browser settings for the best experience.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Notification setup failed',
        description: 'Failed to set up notifications.',
      });
    }
  };

  const handleClearCache = async () => {
    try {
      setIsRefreshing(true);
      await clearCaches();
      setCacheSize(0);
      
      toast({
        title: 'Cache cleared',
        description: 'App cache has been cleared. The page will reload.',
      });
      
      // Reload after clearing cache
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Clear cache failed',
        description: 'Failed to clear the app cache.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Network Status */}
      <Alert>
        <div className="flex items-center gap-2">
          {networkStatus.isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            {networkStatus.isOnline ? 'Online' : 'Offline'}
            {networkStatus.connection && (
              <Badge variant="outline" className="ml-2">
                {networkStatus.effectiveType}
              </Badge>
            )}
          </AlertDescription>
        </div>
      </Alert>

      {/* Update Available */}
      {updateAvailable && (
        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>A new version of the app is available.</span>
            <Button size="sm" onClick={handleUpdate}>
              Update Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Install Available */}
      {installAvailable && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Install Voice Zen Dashboard as an app for better experience.</span>
            <Button size="sm" onClick={handleInstall}>
              Install App
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* PWA Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>App Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notificationPermission === 'granted' ? (
                <Bell className="h-4 w-4 text-green-500" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-500" />
              )}
              <span>Notifications</span>
              <Badge variant={notificationPermission === 'granted' ? 'default' : 'secondary'}>
                {notificationPermission}
              </Badge>
            </div>
            {notificationPermission !== 'granted' && (
              <Button size="sm" variant="outline" onClick={handleNotificationPermission}>
                Enable
              </Button>
            )}
          </div>

          {/* Cache Management */}
          <div className="flex items-center justify-between">
            <div>
              <span>Cache Size: </span>
              <Badge variant="outline">{formatBytes(cacheSize)}</Badge>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleClearCache}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear Cache'
              )}
            </Button>
          </div>

          {/* Offline Status */}
          <div className="text-sm text-muted-foreground">
            {networkStatus.isOnline 
              ? 'All features available' 
              : 'Running in offline mode. Some features may be limited.'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};