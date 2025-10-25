import React, { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { Layout } from "@/components/Layout";
import { AuthComponent } from "@/components/AuthComponent";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundaryWrapper } from "@/components/ErrorBoundary";
import { LoadingProvider, FullPageLoading } from "@/components/LoadingSystem";
import { ErrorProvider, ErrorList } from "@/components/ErrorSystem";
import { OfflineBanner, DataSyncIndicator, ConflictManager } from "@/components/SyncComponents";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { BudgetProvider } from "@/contexts/BudgetContext";
import { initializePWA, getNetworkStatus, triggerBackgroundSync } from "@/services/pwa";
import Home from "./pages/Home";
import Todo from "./pages/Todo";
import Budget from "./pages/Budget";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { getCurrentUser, isInitialized } = useAuth();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    initializePWA();
  }, []);

  // Listen for network status changes
  useEffect(() => {
    const handleNetworkChange = (event: CustomEvent) => {
      setIsOffline(!event.detail.isOnline);
    };

    window.addEventListener('network-status-changed', handleNetworkChange as EventListener);
    return () => window.removeEventListener('network-status-changed', handleNetworkChange as EventListener);
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    
    try {
      // Check if we're actually online
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (response.ok) {
        // Trigger background sync if we're back online
        await triggerBackgroundSync();
        setIsOffline(false);
      }
    } catch (error) {
      console.log('Still offline:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Show loading while auth is initializing
  if (!isInitialized) {
    return <FullPageLoading text="Initializing Voice Zen Dashboard..." />;
  }

  // Show auth component if not authenticated
  if (!getCurrentUser()) {
    return <AuthComponent />;
  }

  // Show main app if authenticated
  return (
    <>
            <OfflineBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="todo" element={<Todo />} />
            <Route path="budget" element={<Budget />} />
            <Route path="insights" element={<Insights />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <ErrorBoundaryWrapper>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorProvider>
              <LoadingProvider>
                <AuthProvider>
                  <TaskProvider>
                    <BudgetProvider>
                      <Sonner />
                      <Toaster />
                      <ErrorList />
                      <AppContent />
                      <ConflictManager />
                      <DataSyncIndicator />
                    </BudgetProvider>
                  </TaskProvider>
                </AuthProvider>
              </LoadingProvider>
            </ErrorProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundaryWrapper>
  );
};

export default App;
