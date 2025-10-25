import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  Transaction, 
  BudgetLimit, 
  TransactionCreateData, 
  TransactionUpdateData,
  BudgetLimitCreateData,
  BudgetLimitUpdateData,
  TransactionsQueryParams,
  createBudgetCache 
} from '../services/budget';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/use-toast';

interface BudgetContextType {
  transactions: Transaction[];
  budgetLimits: BudgetLimit[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  
  // Transaction actions
  loadTransactions: (params?: TransactionsQueryParams) => Promise<void>;
  createTransaction: (data: TransactionCreateData) => Promise<Transaction>;
  updateTransaction: (id: string, data: TransactionUpdateData) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addExpense: (amount: number, category: string, description: string) => Promise<Transaction>;
  addIncome: (amount: number, category: string, description: string) => Promise<Transaction>;
  
  // Budget limit actions
  loadBudgetLimits: () => Promise<void>;
  createBudgetLimit: (data: BudgetLimitCreateData) => Promise<BudgetLimit>;
  updateBudgetLimit: (id: string, data: BudgetLimitUpdateData) => Promise<BudgetLimit>;
  deleteBudgetLimit: (id: string) => Promise<void>;
  
  // Utility actions
  refresh: () => Promise<void>;
  clearCache: () => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getCurrentUser, isInitialized } = useAuth();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  // Create budget cache instance
  const budgetCache = React.useMemo(() => createBudgetCache(), []);

  // Load transactions
  const loadTransactions = useCallback(async (params?: TransactionsQueryParams) => {
    if (!getCurrentUser()) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await budgetCache.getTransactions(params);
      setTransactions(response.transactions);
      setPagination(response.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(message);
      console.error('Load transactions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentUser, budgetCache]);

  // Load budget limits
  const loadBudgetLimits = useCallback(async () => {
    if (!getCurrentUser()) return;

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      const limits = await budgetService.getBudgetLimits();
      setBudgetLimits(limits);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load budget limits';
      setError(message);
      console.error('Load budget limits error:', err);
    }
  }, [getCurrentUser]);

  // Create transaction
  const createTransaction = useCallback(async (data: TransactionCreateData): Promise<Transaction> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      const newTransaction = await budgetService.createTransaction(data);
      
      // Add to current list if we're on first page
      setTransactions(prev => [newTransaction, ...prev]);
      
      toast({
        title: `${data.type === 'income' ? 'Income' : 'Expense'} added`,
        description: `${data.type === 'income' ? '+' : '-'}$${data.amount.toFixed(2)} - ${data.description}`,
      });
      
      return newTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transaction';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to add transaction',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Update transaction
  const updateTransaction = useCallback(async (id: string, data: TransactionUpdateData): Promise<Transaction> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      const updatedTransaction = await budgetService.updateTransaction(id, data);
      
      // Update in current list
      setTransactions(prev => prev.map(transaction => 
        transaction.id === id ? updatedTransaction : transaction
      ));
      
      toast({
        title: 'Transaction updated',
        description: `${updatedTransaction.description} has been updated.`,
      });
      
      return updatedTransaction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to update transaction',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      await budgetService.deleteTransaction(id);
      
      // Remove from current list
      const transactionToDelete = transactions.find(t => t.id === id);
      setTransactions(prev => prev.filter(transaction => transaction.id !== id));
      
      toast({
        title: 'Transaction deleted',
        description: transactionToDelete ? `${transactionToDelete.description} has been deleted.` : 'Transaction has been deleted.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to delete transaction',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, transactions, toast]);

  // Quick expense addition
  const addExpense = useCallback(async (amount: number, category: string, description: string): Promise<Transaction> => {
    return createTransaction({ amount, category, description, type: 'expense' });
  }, [createTransaction]);

  // Quick income addition
  const addIncome = useCallback(async (amount: number, category: string, description: string): Promise<Transaction> => {
    return createTransaction({ amount, category, description, type: 'income' });
  }, [createTransaction]);

  // Create budget limit
  const createBudgetLimit = useCallback(async (data: BudgetLimitCreateData): Promise<BudgetLimit> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      const newLimit = await budgetService.createBudgetLimit(data);
      
      setBudgetLimits(prev => [...prev, newLimit]);
      
      toast({
        title: 'Budget limit set',
        description: `$${data.limit} ${data.period} limit set for ${data.category}.`,
      });
      
      return newLimit;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create budget limit';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to set budget limit',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Update budget limit
  const updateBudgetLimit = useCallback(async (id: string, data: BudgetLimitUpdateData): Promise<BudgetLimit> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      const updatedLimit = await budgetService.updateBudgetLimit(id, data);
      
      setBudgetLimits(prev => prev.map(limit => 
        limit.id === id ? updatedLimit : limit
      ));
      
      toast({
        title: 'Budget limit updated',
        description: `${updatedLimit.category} budget limit has been updated.`,
      });
      
      return updatedLimit;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update budget limit';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to update budget limit',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, toast]);

  // Delete budget limit
  const deleteBudgetLimit = useCallback(async (id: string): Promise<void> => {
    if (!getCurrentUser()) {
      throw new Error('Authentication required');
    }

    try {
      setError(null);
      const { budgetService } = await import('../services/budget');
      await budgetService.deleteBudgetLimit(id);
      
      const limitToDelete = budgetLimits.find(l => l.id === id);
      setBudgetLimits(prev => prev.filter(limit => limit.id !== id));
      
      toast({
        title: 'Budget limit removed',
        description: limitToDelete ? `${limitToDelete.category} budget limit has been removed.` : 'Budget limit has been removed.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete budget limit';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Failed to remove budget limit',
        description: message,
      });
      throw err;
    }
  }, [getCurrentUser, budgetLimits, toast]);

  // Refresh current view
  const refresh = useCallback(async () => {
    await Promise.all([
      loadTransactions(pagination ? {
        page: pagination.page,
        limit: pagination.limit
      } : undefined),
      loadBudgetLimits()
    ]);
  }, [loadTransactions, loadBudgetLimits, pagination]);

  // Clear cache
  const clearCache = useCallback(() => {
    budgetCache.clearCache();
  }, [budgetCache]);

  // Load initial data when authenticated
  useEffect(() => {
    if (isInitialized && getCurrentUser()) {
      Promise.all([
        loadTransactions(),
        loadBudgetLimits()
      ]);
    } else if (isInitialized && !getCurrentUser()) {
      // Clear data when not authenticated
      setTransactions([]);
      setBudgetLimits([]);
      setPagination(null);
      setError(null);
    }
  }, [isInitialized, getCurrentUser, loadTransactions, loadBudgetLimits]);

  // Listen for auth logout to clear data
  useEffect(() => {
    const handleLogout = () => {
      setTransactions([]);
      setBudgetLimits([]);
      setPagination(null);
      setError(null);
      clearCache();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [clearCache]);

  const contextValue: BudgetContextType = {
    transactions,
    budgetLimits,
    isLoading,
    error,
    pagination,
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    addExpense,
    addIncome,
    loadBudgetLimits,
    createBudgetLimit,
    updateBudgetLimit,
    deleteBudgetLimit,
    refresh,
    clearCache
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

// Custom hooks for specific budget operations
export const useTransactionActions = () => {
  const { createTransaction, updateTransaction, deleteTransaction, addExpense, addIncome } = useBudget();
  return { createTransaction, updateTransaction, deleteTransaction, addExpense, addIncome };
};

export const useBudgetLimitActions = () => {
  const { createBudgetLimit, updateBudgetLimit, deleteBudgetLimit } = useBudget();
  return { createBudgetLimit, updateBudgetLimit, deleteBudgetLimit };
};

export const useBudgetFilters = () => {
  const { loadTransactions } = useBudget();
  
  const filterByType = useCallback((type: 'income' | 'expense') => {
    return loadTransactions({ type, page: 1 });
  }, [loadTransactions]);
  
  const filterByCategory = useCallback((category: string) => {
    return loadTransactions({ category, page: 1 });
  }, [loadTransactions]);
  
  const filterByDateRange = useCallback((startDate: string, endDate: string) => {
    return loadTransactions({ startDate, endDate, page: 1 });
  }, [loadTransactions]);
  
  const search = useCallback((query: string) => {
    return loadTransactions({ search: query, page: 1 });
  }, [loadTransactions]);
  
  return { filterByType, filterByCategory, filterByDateRange, search };
};