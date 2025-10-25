import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, Filter } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  reason: string;
  category?: string;
}

interface BudgetHistoryProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS = {
  food: '#FF6B6B',
  groceries: '#4ECDC4',
  snack: '#45B7D1',
  rent: '#96CEB4',
  fees: '#FFEAA7',
  stationary: '#DDA0DD',
  transport: '#98D8C8',
  utilities: '#F7DC6F',
  entertainment: '#BB8FCE',
  health: '#85C1E9',
  shopping: '#F8C471',
  other: '#AEB6BF'
};

export default function BudgetHistory({ transactions }: BudgetHistoryProps) {
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "year">("month");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let filtered = transactions.filter((t) => {
      const transDate = new Date(t.date);
      const diffTime = Math.abs(now.getTime() - transDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (timeFilter) {
        case "week": return diffDays <= 7;
        case "month": return diffDays <= 30;
        case "year": return diffDays <= 365;
        default: return true;
      }
    });

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, timeFilter, categoryFilter]);

  const categoryStats = useMemo(() => {
    const stats = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((acc, t) => {
        const category = t.category || 'other';
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0, transactions: [] };
        }
        acc[category].total += t.amount;
        acc[category].count += 1;
        acc[category].transactions.push(t);
        return acc;
      }, {} as Record<string, { total: number; count: number; transactions: Transaction[] }>);

    return Object.entries(stats)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        average: data.total / data.count,
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#AEB6BF'
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => {
    const monthlyStats = filteredTransactions.reduce((acc, t) => {
      const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        acc[month].income += t.amount;
      } else {
        acc[month].expense += t.amount;
      }
      return acc;
    }, {} as Record<string, { month: string; income: number; expense: number }>);

    return Object.values(monthlyStats).sort((a, b) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  }, [filteredTransactions]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const categories = [...new Set(transactions.map(t => t.category || 'other'))];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold text-green-600">${totalIncome.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">${totalExpense.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Balance</p>
              <p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(totalIncome - totalExpense).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="income" fill="#10B981" name="Income" />
                <Bar dataKey="expense" fill="#EF4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="category"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {categoryStats.map((stat) => {
                  const percentage = totalExpense > 0 ? (stat.total / totalExpense) * 100 : 0;
                  return (
                    <div key={stat.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stat.color }}
                          />
                          <span className="capitalize font-medium">{stat.category}</span>
                          <Badge variant="secondary">{stat.count}</Badge>
                        </div>
                        <span className="font-semibold">${stat.total.toFixed(2)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage.toFixed(1)}% of total</span>
                        <span>Avg: ${stat.average.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: CATEGORY_COLORS[transaction.category as keyof typeof CATEGORY_COLORS] || '#AEB6BF' }}
                    >
                      {(transaction.category || 'other').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.reason}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{transaction.category || 'other'}</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-xs">
                      {transaction.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}