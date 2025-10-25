import React from 'react';
import { dataSyncManager, useDataSync } from '../services/dataSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Download,
  Upload,
  Zap
} from 'lucide-react';

interface ConflictResolutionProps {
  conflict: {
    id: string;
    entity: string;
    localData: any;
    serverData: any;
    conflicts: Array<{
      field: string;
      localValue: any;
      serverValue: any;
    }>;
  };
  onResolve: (resolution: 'local' | 'server' | 'merge', mergedData?: any) => void;
}

const ConflictResolution: React.FC<ConflictResolutionProps> = ({ conflict, onResolve }) => {
  const [selectedResolution, setSelectedResolution] = React.useState<'local' | 'server' | 'merge'>('local');
  const [mergedData, setMergedData] = React.useState(conflict.localData);

  const handleResolve = () => {
    onResolve(selectedResolution, selectedResolution === 'merge' ? mergedData : undefined);
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Data Conflict - {conflict.entity}
        </CardTitle>
        <CardDescription>
          There are conflicting changes between your local data and server data. 
          Please choose how to resolve this conflict.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedResolution} onValueChange={(value: any) => setSelectedResolution(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="local">Keep Local</TabsTrigger>
            <TabsTrigger value="server">Use Server</TabsTrigger>
            <TabsTrigger value="merge">Merge Changes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="local" className="space-y-4">
            <Alert>
              <AlertDescription>
                Keep your local changes and overwrite the server data.
              </AlertDescription>
            </Alert>
            <div className="bg-blue-50 p-3 rounded border">
              <h4 className="font-medium text-blue-900">Your Local Data:</h4>
              <pre className="text-sm text-blue-700 mt-1 overflow-auto">
                {JSON.stringify(conflict.localData, null, 2)}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="server" className="space-y-4">
            <Alert>
              <AlertDescription>
                Use the server data and discard your local changes.
              </AlertDescription>
            </Alert>
            <div className="bg-green-50 p-3 rounded border">
              <h4 className="font-medium text-green-900">Server Data:</h4>
              <pre className="text-sm text-green-700 mt-1 overflow-auto">
                {JSON.stringify(conflict.serverData, null, 2)}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="merge" className="space-y-4">
            <Alert>
              <AlertDescription>
                Review and manually merge the conflicting fields.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              {conflict.conflicts.map((fieldConflict, index) => (
                <div key={index} className="p-3 border rounded">
                  <h5 className="font-medium mb-2">Field: {fieldConflict.field}</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-blue-600">Local:</span>
                      <div className="bg-blue-50 p-2 rounded mt-1">
                        {JSON.stringify(fieldConflict.localValue)}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">Server:</span>
                      <div className="bg-green-50 p-2 rounded mt-1">
                        {JSON.stringify(fieldConflict.serverValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2 mt-4">
          <Button onClick={handleResolve} className="flex-1">
            Resolve Conflict
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const SyncStatus: React.FC = () => {
  const { queueLength, conflicts, syncStatus, syncNow } = useDataSync();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const handleSync = (event: CustomEvent) => {
      if (event.detail.type === 'success') {
        setLastSync(new Date());
      }
    };

    window.addEventListener('data-sync', handleSync as EventListener);
    return () => window.removeEventListener('data-sync', handleSync as EventListener);
  }, []);

  const handleSyncNow = async () => {
    try {
      await syncNow();
      setLastSync(new Date());
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-600" />
          )}
          Sync Status
        </CardTitle>
        <CardDescription>
          {isOnline ? 'Connected - Data syncs automatically' : 'Offline - Changes saved locally'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? 'default' : 'secondary'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          {syncStatus === 'syncing' && (
            <Badge variant="outline" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing...
            </Badge>
          )}
        </div>

        {/* Queue Status */}
        {queueLength > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pending Changes</span>
              <Badge variant="outline">{queueLength}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              {queueLength} item{queueLength !== 1 ? 's' : ''} waiting to sync
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} need{conflicts.length === 1 ? 's' : ''} your attention
            </AlertDescription>
          </Alert>
        )}

        {/* Last Sync */}
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            Last synced: {lastSync.toLocaleTimeString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncNow} 
            disabled={!isOnline || syncStatus === 'syncing'}
            size="sm"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const { queueLength } = useDataSync();

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-700" />
          <span className="text-sm font-medium text-amber-800">
            You're offline
          </span>
          <span className="text-sm text-amber-700">
            - Changes are saved locally
          </span>
        </div>
        {queueLength > 0 && (
          <Badge variant="outline" className="bg-amber-200 text-amber-800 border-amber-300">
            {queueLength} pending
          </Badge>
        )}
      </div>
    </div>
  );
};

export const ConflictManager: React.FC = () => {
  const { conflicts, resolveConflict } = useDataSync();

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ) => {
    try {
      await resolveConflict(conflictId, resolution, mergedData);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        Resolve Data Conflicts
      </h3>
      {conflicts.map((conflict) => (
        <ConflictResolution
          key={conflict.id}
          conflict={conflict}
          onResolve={(resolution, mergedData) => 
            handleResolveConflict(conflict.id, resolution, mergedData)
          }
        />
      ))}
    </div>
  );
};

export const DataSyncIndicator: React.FC = () => {
  const { queueLength, syncStatus } = useDataSync();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && queueLength === 0 && syncStatus === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border rounded-lg shadow-lg p-3 flex items-center gap-2 min-w-[200px]">
        {!isOnline && (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Offline Mode</span>
          </>
        )}
        
        {syncStatus === 'syncing' && (
          <>
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-sm">Syncing...</span>
          </>
        )}
        
        {queueLength > 0 && isOnline && syncStatus !== 'syncing' && (
          <>
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm">{queueLength} pending</span>
          </>
        )}
        
        {queueLength > 0 && !isOnline && (
          <>
            <Download className="h-4 w-4 text-amber-500" />
            <span className="text-sm">{queueLength} saved locally</span>
          </>
        )}
      </div>
    </div>
  );
};

// Performance monitoring component
export const SyncPerformance: React.FC = () => {
  const [stats, setStats] = React.useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    lastSyncDuration: 0
  });

  React.useEffect(() => {
    const handleSyncEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      setStats(prev => {
        const newStats = { ...prev };
        
        switch (type) {
          case 'success':
            newStats.totalSyncs++;
            newStats.successfulSyncs++;
            if (data.duration) {
              newStats.lastSyncDuration = data.duration;
              newStats.averageSyncTime = 
                (newStats.averageSyncTime * (newStats.successfulSyncs - 1) + data.duration) / 
                newStats.successfulSyncs;
            }
            break;
          case 'error':
          case 'failed':
            newStats.totalSyncs++;
            newStats.failedSyncs++;
            break;
        }
        
        return newStats;
      });
    };

    window.addEventListener('data-sync', handleSyncEvent as EventListener);
    return () => window.removeEventListener('data-sync', handleSyncEvent as EventListener);
  }, []);

  const successRate = stats.totalSyncs > 0 ? (stats.successfulSyncs / stats.totalSyncs) * 100 : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Sync Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Syncs</div>
            <div className="text-xl font-semibold">{stats.totalSyncs}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Success Rate</div>
            <div className="text-xl font-semibold text-green-600">
              {successRate.toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Success Rate</span>
            <span>{successRate.toFixed(1)}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>
        
        {stats.averageSyncTime > 0 && (
          <div className="text-sm text-muted-foreground">
            Average sync time: {stats.averageSyncTime.toFixed(0)}ms
          </div>
        )}
      </CardContent>
    </Card>
  );
};