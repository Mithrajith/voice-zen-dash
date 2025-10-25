import api, { ApiResponse, handleApiError, retryRequest } from './api';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLimit {
  id: string;
  category: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  alertThreshold: number; // percentage (0-100)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCreateData {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date?: string;
}

export interface TransactionUpdateData {
  amount?: number;
  description?: string;
  category?: string;
  type?: 'income' | 'expense';
  date?: string;
}

export interface BudgetLimitCreateData {
  category: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  alertThreshold?: number;
}

export interface BudgetLimitUpdateData {
  limit?: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  alertThreshold?: number;
  isActive?: boolean;
}

export interface TransactionsQueryParams {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BudgetOverview {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  expensesByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
  budgetLimits: BudgetLimit[];
  budgetAlerts: Array<{
    category: string;
    spent: number;
    limit: number;
    percentage: number;
    period: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

export const budgetService = {
  // Transaction operations
  async getTransactions(params?: TransactionsQueryParams): Promise<TransactionsResponse> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<TransactionsResponse>>('/budget/transactions', { params })
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to get transactions');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async getTransaction(id: string): Promise<Transaction> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<{ transaction: Transaction }>>(`/budget/transactions/${id}`)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.transaction;
      }
      
      throw new Error(response.data.message || 'Transaction not found');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async createTransaction(data: TransactionCreateData): Promise<Transaction> {
    try {
      const response = await retryRequest(() =>
        api.post<ApiResponse<{ transaction: Transaction }>>('/budget/transactions', data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.transaction;
      }
      
      throw new Error(response.data.message || 'Failed to create transaction');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async updateTransaction(id: string, data: TransactionUpdateData): Promise<Transaction> {
    try {
      const response = await retryRequest(() =>
        api.patch<ApiResponse<{ transaction: Transaction }>>(`/budget/transactions/${id}`, data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.transaction;
      }
      
      throw new Error(response.data.message || 'Failed to update transaction');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      const response = await retryRequest(() =>
        api.delete<ApiResponse<null>>(`/budget/transactions/${id}`)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete transaction');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Budget limit operations
  async getBudgetLimits(): Promise<BudgetLimit[]> {
    try {
      const response = await retryRequest(() =>
        api.get<ApiResponse<{ budgetLimits: BudgetLimit[] }>>('/budget/limits')
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.budgetLimits;
      }
      
      throw new Error(response.data.message || 'Failed to get budget limits');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async createBudgetLimit(data: BudgetLimitCreateData): Promise<BudgetLimit> {
    try {
      const response = await retryRequest(() =>
        api.post<ApiResponse<{ budgetLimit: BudgetLimit }>>('/budget/limits', data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.budgetLimit;
      }
      
      throw new Error(response.data.message || 'Failed to create budget limit');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async updateBudgetLimit(id: string, data: BudgetLimitUpdateData): Promise<BudgetLimit> {
    try {
      const response = await retryRequest(() =>
        api.patch<ApiResponse<{ budgetLimit: BudgetLimit }>>(`/budget/limits/${id}`, data)
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data.budgetLimit;
      }
      
      throw new Error(response.data.message || 'Failed to update budget limit');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  async deleteBudgetLimit(id: string): Promise<void> {
    try {
      const response = await retryRequest(() =>
        api.delete<ApiResponse<null>>(`/budget/limits/${id}`)
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete budget limit');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Analytics and overview
  async getOverview(startDate?: string, endDate?: string): Promise<BudgetOverview> {
    try {
      const params = startDate && endDate ? { startDate, endDate } : undefined;
      
      const response = await retryRequest(() =>
        api.get<ApiResponse<BudgetOverview>>('/budget/overview', { params })
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to get budget overview');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Quick expense/income addition
  async addExpense(amount: number, category: string, description: string): Promise<Transaction> {
    return this.createTransaction({
      amount,
      category,
      description,
      type: 'expense'
    });
  },

  async addIncome(amount: number, category: string, description: string): Promise<Transaction> {
    return this.createTransaction({
      amount,
      category,
      description,
      type: 'income'
    });
  },

  // Get transactions by category
  async getTransactionsByCategory(category: string, params?: Omit<TransactionsQueryParams, 'category'>): Promise<TransactionsResponse> {
    return this.getTransactions({ ...params, category });
  },

  // Get recent transactions
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    const response = await this.getTransactions({
      limit,
      sortBy: 'date',
      sortOrder: 'desc'
    });
    return response.transactions;
  },

  // Get spending for current month
  async getCurrentMonthSpending(): Promise<{ total: number; byCategory: Record<string, number> }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const response = await this.getTransactions({
      type: 'expense',
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString(),
      limit: 1000
    });
    
    const byCategory: Record<string, number> = {};
    let total = 0;
    
    response.transactions.forEach(transaction => {
      total += transaction.amount;
      byCategory[transaction.category] = (byCategory[transaction.category] || 0) + transaction.amount;
    });
    
    return { total, byCategory };
  }
};

// Budget cache helper for offline functionality
export const createBudgetCache = () => {
  const CACHE_KEY = 'budget_cache';
  const CACHE_TIMESTAMP_KEY = 'budget_cache_timestamp';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const isOnline = () => navigator.onLine;

  const getCachedData = (): { transactions: TransactionsResponse; overview: BudgetOverview } | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (!cached || !timestamp) return null;
      
      const age = Date.now() - parseInt(timestamp);
      if (age > CACHE_DURATION) return null;
      
      return JSON.parse(cached);
    } catch {
      return null;
    }
  };

  const setCachedData = (data: { transactions: TransactionsResponse; overview: BudgetOverview }) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache budget data:', error);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  };

  return {
    async getTransactions(params?: TransactionsQueryParams): Promise<TransactionsResponse> {
      if (isOnline()) {
        try {
          const data = await budgetService.getTransactions(params);
          
          // Cache only the first page without filters
          if (!params || (!params.page && !params.search && !params.category)) {
            const overview = await budgetService.getOverview();
            setCachedData({ transactions: data, overview });
          }
          
          return data;
        } catch (error) {
          const cached = getCachedData();
          if (cached) {
            console.warn('Using cached budget data due to error:', error);
            return cached.transactions;
          }
          throw error;
        }
      } else {
        const cached = getCachedData();
        if (cached) {
          return cached.transactions;
        }
        throw new Error('No cached budget data available offline');
      }
    },

    async getOverview(): Promise<BudgetOverview> {
      if (isOnline()) {
        try {
          return await budgetService.getOverview();
        } catch (error) {
          const cached = getCachedData();
          if (cached) {
            console.warn('Using cached budget overview due to error:', error);
            return cached.overview;
          }
          throw error;
        }
      } else {
        const cached = getCachedData();
        if (cached) {
          return cached.overview;
        }
        throw new Error('No cached budget overview available offline');
      }
    },

    clearCache
  };
};

export type BudgetCache = ReturnType<typeof createBudgetCache>;