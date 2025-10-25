import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  RefreshCw, 
  WifiOff,
  Bug
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Error types and interfaces
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: number;
  context?: Record<string, any>;
  retryable?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export const useErrors = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrors must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((errorData: Omit<AppError, 'id' | 'timestamp'>) => {
    const error: AppError = {
      ...errorData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    setErrors(prev => [...prev, error]);
    
    // Auto-remove non-critical errors after 10 seconds
    if (error.type !== ErrorType.SERVER && error.type !== ErrorType.NETWORK) {
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== error.id));
      }, 10000);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const hasErrors = errors.length > 0;

  return (
    <ErrorContext.Provider value={{
      errors,
      addError,
      removeError,
      clearErrors,
      hasErrors
    }}>
      {children}
    </ErrorContext.Provider>
  );
};

// Error display components
interface ErrorDisplayProps {
  error: AppError;
  onDismiss?: (id: string) => void;
  onRetry?: (id: string) => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onDismiss, 
  onRetry 
}) => {
  const getIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return <WifiOff className="h-4 w-4" />;
      case ErrorType.SERVER:
        return <AlertTriangle className="h-4 w-4" />;
      case ErrorType.VALIDATION:
        return <AlertCircle className="h-4 w-4" />;
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  const getVariant = (type: ErrorType) => {
    switch (type) {
      case ErrorType.SERVER:
      case ErrorType.NETWORK:
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert variant={getVariant(error.type)} className="mb-2">
      {getIcon(error.type)}
      <div className="flex-1">
        <AlertTitle className="flex items-center gap-2">
          {error.message}
          <Badge variant="outline" className="text-xs">
            {error.type}
          </Badge>
        </AlertTitle>
        {error.details && (
          <AlertDescription className="mt-1">
            {error.details}
          </AlertDescription>
        )}
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        {error.retryable && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetry(error.id)}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        
        {error.action && (
          <Button
            size="sm"
            variant="outline"
            onClick={error.action.handler}
            className="h-6 px-2 text-xs"
          >
            {error.action.label}
          </Button>
        )}
        
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(error.id)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Alert>
  );
};

// Error list component
export const ErrorList: React.FC = () => {
  const { errors, removeError, clearErrors } = useErrors();

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-16 right-4 max-w-md z-50 space-y-2">
      {errors.length > 2 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={clearErrors}
            className="text-xs"
          >
            Clear All ({errors.length})
          </Button>
        </div>
      )}
      
      {errors.slice(-3).map(error => (
        <ErrorDisplay
          key={error.id}
          error={error}
          onDismiss={removeError}
        />
      ))}
    </div>
  );
};

// Utility functions for common error scenarios
export const createNetworkError = (message: string, details?: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: ErrorType.NETWORK,
  message,
  details,
  retryable: true
});

export const createValidationError = (message: string, details?: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: ErrorType.VALIDATION,
  message,
  details,
  retryable: false
});

export const createServerError = (message: string, details?: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: ErrorType.SERVER,
  message,
  details,
  retryable: true
});

export const createAuthError = (message: string, details?: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: ErrorType.AUTHENTICATION,
  message,
  details,
  retryable: false,
  action: {
    label: 'Sign In',
    handler: () => {
      // This would trigger a sign-in flow
      window.location.reload();
    }
  }
});

// Custom hooks for error handling
export const useErrorHandler = () => {
  const { addError } = useErrors();
  const { toast } = useToast();

  const handleError = useCallback((error: Error | string, context?: Record<string, any>) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorDetails = error instanceof Error ? error.stack : undefined;

    // Determine error type based on error message or context
    let errorType = ErrorType.UNKNOWN;
    
    if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
      errorType = ErrorType.NETWORK;
    } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('authentication')) {
      errorType = ErrorType.AUTHENTICATION;
    } else if (errorMessage.toLowerCase().includes('forbidden')) {
      errorType = ErrorType.AUTHORIZATION;
    } else if (errorMessage.toLowerCase().includes('validation') || errorMessage.toLowerCase().includes('invalid')) {
      errorType = ErrorType.VALIDATION;
    } else if (errorMessage.toLowerCase().includes('server') || errorMessage.toLowerCase().includes('internal')) {
      errorType = ErrorType.SERVER;
    }

    addError({
      type: errorType,
      message: errorMessage,
      details: errorDetails,
      context,
      retryable: [ErrorType.NETWORK, ErrorType.SERVER].includes(errorType)
    });

    // Also show as toast for immediate feedback
    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage
    });
  }, [addError, toast]);

  const handleAsyncError = useCallback(async <T,>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  }, [handleError]);

  return { handleError, handleAsyncError };
};

// Retry mechanism
export const useRetry = () => {
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const { handleAsyncError } = useErrorHandler();

  const retry = useCallback(async <T,>(
    key: string,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T | null> => {
    const currentRetries = retryCount[key] || 0;
    
    if (currentRetries >= maxRetries) {
      console.error(`Max retries (${maxRetries}) exceeded for operation: ${key}`);
      return null;
    }

    try {
      const result = await operation();
      // Reset retry count on success
      setRetryCount(prev => ({ ...prev, [key]: 0 }));
      return result;
    } catch (error) {
      const newRetryCount = currentRetries + 1;
      setRetryCount(prev => ({ ...prev, [key]: newRetryCount }));

      console.warn(`Operation '${key}' failed, retry ${newRetryCount}/${maxRetries}:`, error);

      if (newRetryCount < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * newRetryCount));
        return retry(key, operation, maxRetries, delay);
      } else {
        // Final failure
        handleAsyncError(operation, { retryCount: newRetryCount, maxRetries });
        return null;
      }
    }
  }, [retryCount, handleAsyncError]);

  return { retry, retryCount };
};