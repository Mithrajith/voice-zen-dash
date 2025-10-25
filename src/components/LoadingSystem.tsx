import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  loading: LoadingState;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key?: string) => boolean;
  isAnyLoading: () => boolean;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loading, setLoadingState] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const isLoading = useCallback((key?: string) => {
    if (key) {
      return loading[key] || false;
    }
    return Object.values(loading).some(Boolean);
  }, [loading]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loading).some(Boolean);
  }, [loading]);

  return (
    <LoadingContext.Provider value={{ loading, setLoading, isLoading, isAnyLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

// Loading Spinner Components
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  text = 'Loading...', 
  children 
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
};

// Full page loading component
interface FullPageLoadingProps {
  text?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({ 
  text = 'Loading...' 
}) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background p-8 rounded-lg shadow-lg border">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
};

// Skeleton loaders
export const SkeletonCard: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-muted h-4 rounded w-3/4 mb-2"></div>
    <div className="bg-muted h-3 rounded w-1/2 mb-4"></div>
    <div className="bg-muted h-20 rounded"></div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="bg-muted h-10 w-10 rounded-full"></div>
          <div className="flex-1">
            <div className="bg-muted h-4 rounded w-3/4 mb-2"></div>
            <div className="bg-muted h-3 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="animate-pulse">
    {/* Header */}
    <div className="flex space-x-4 mb-4">
      {Array.from({ length: cols }, (_, i) => (
        <div key={i} className="bg-muted h-4 rounded flex-1"></div>
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex space-x-4 mb-3">
        {Array.from({ length: cols }, (_, j) => (
          <div key={j} className="bg-muted h-3 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);

// Custom hooks for specific loading states
export const useAsyncOperation = () => {
  const { setLoading } = useLoading();
  
  const execute = useCallback(async <T,>(
    key: string,
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      setLoading(key, true);
      const result = await operation();
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        console.error(`Operation '${key}' failed:`, error);
      }
      return null;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);
  
  return execute;
};

// Higher-order component for loading states
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingKey: string
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const { isLoading } = useLoading();
    
    return (
      <LoadingOverlay isLoading={isLoading(loadingKey)}>
        <Component {...(props as P)} />
      </LoadingOverlay>
    );
  });
  
  WrappedComponent.displayName = `withLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
};