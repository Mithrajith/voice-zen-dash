import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  WifiOff,
  Zap
} from 'lucide-react';

interface SuccessMessageProps {
  title: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  title,
  description,
  onAction,
  actionLabel
}) => (
  <Alert className="border-green-200 bg-green-50 text-green-800">
    <CheckCircle className="h-4 w-4" />
    <div className="flex-1">
      <AlertDescription className="font-medium">
        {title}
      </AlertDescription>
      {description && (
        <p className="text-sm mt-1 opacity-90">{description}</p>
      )}
    </div>
    {onAction && actionLabel && (
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onAction}
        className="ml-auto border-green-300 text-green-700 hover:bg-green-100"
      >
        {actionLabel}
      </Button>
    )}
  </Alert>
);

interface InfoMessageProps {
  title: string;
  description?: string;
  type?: 'info' | 'warning' | 'offline';
}

export const InfoMessage: React.FC<InfoMessageProps> = ({
  title,
  description,
  type = 'info'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'offline':
        return 'border-gray-200 bg-gray-50 text-gray-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <Alert className={getColor()}>
      {getIcon()}
      <AlertDescription className="font-medium">
        {title}
        {description && (
          <span className="block text-sm mt-1 opacity-90">{description}</span>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'syncing' | 'error' | 'success';
  text?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'sm'
}) => {
  const getVariant = () => {
    switch (status) {
      case 'online':
        return 'default';
      case 'offline':
        return 'secondary';
      case 'syncing':
        return 'outline';
      case 'error':
        return 'destructive';
      case 'success':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'online':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'offline':
        return <WifiOff className="h-3 w-3" />;
      case 'syncing':
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3" />;
      case 'success':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1';

  return (
    <Badge variant={getVariant()} className={`${sizeClass} flex items-center gap-1`}>
      {getIcon()}
      {text || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

interface ProgressIndicatorProps {
  progress: number;
  total?: number;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  total = 100,
  label,
  showPercentage = true
}) => {
  const percentage = Math.round((progress / total) * 100);
  
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          {showPercentage && (
            <span className="text-muted-foreground">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface ActionFeedbackProps {
  isLoading: boolean;
  success?: boolean;
  error?: string;
  successMessage?: string;
  children: React.ReactNode;
}

export const ActionFeedback: React.FC<ActionFeedbackProps> = ({
  isLoading,
  success,
  error,
  successMessage = 'Operation completed successfully',
  children
}) => {
  return (
    <div className="space-y-4">
      {children}
      
      {isLoading && (
        <InfoMessage title="Processing..." type="info" />
      )}
      
      {success && !isLoading && (
        <SuccessMessage title={successMessage} />
      )}
      
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

interface QuickStatsProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    color?: 'primary' | 'success' | 'warning' | 'destructive';
  }>;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-lg font-bold">
                {stat.value}
              </p>
            </div>
            {stat.icon && (
              <div className="text-muted-foreground">
                {stat.icon}
              </div>
            )}
          </div>
          {stat.trend && (
            <div className="flex items-center mt-2">
              <Zap className="h-3 w-3 mr-1" />
              <span className="text-xs text-muted-foreground">
                {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
              </span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

// Empty state component
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => (
  <Card className="text-center p-8">
    <CardContent className="space-y-4">
      {icon && (
        <div className="flex justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
);