import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isVisible: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isVisible,
  onRetry,
  isRetrying = false
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2">
      <Alert variant="destructive" className="mx-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>You're currently offline. Your changes will be synced when you reconnect.</span>
          {onRetry && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying}
              className="ml-4"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};