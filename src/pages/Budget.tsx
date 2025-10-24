import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  reason: string;
}

type TimeFilter = "day" | "week" | "month";

export default function Budget() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<TimeFilter>("week");
  const location = useLocation();
  const { toast } = useToast();
  const { checkBudgetAlerts } = useNotifications();

  useEffect(() => {
    const saved = localStorage.getItem("transactions");
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    checkBudgetAlerts(transactions);
  }, [transactions, checkBudgetAlerts]);

  // Handle voice input from navigation state
  useEffect(() => {
    if (location.state?.newTransaction) {
      const { text, extractedData } = location.state.newTransaction;
      const transaction: Transaction = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        amount: extractedData?.amount || 0,
        type: extractedData?.type || 'expense',
        reason: extractedData?.description || text,
      };
      
      setTransactions(prev => [transaction, ...prev]);
      toast({ title: `${transaction.type === 'income' ? 'Income' : 'Expense'} added from voice input!` });
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: formData.get("date") as string,
      amount: parseFloat(formData.get("amount") as string),
      type: formData.get("type") as "income" | "expense",
      reason: formData.get("reason") as string,
    };

    setTransactions([transaction, ...transactions]);
    toast({ title: `${transaction.type === "income" ? "Income" : "Expense"} added successfully` });
    setIsDialogOpen(false);
    e.currentTarget.reset();
  };

  const filterTransactions = () => {
    const now = new Date();
    const filtered = transactions.filter((t) => {
      const transDate = new Date(t.date);
      const diffTime = Math.abs(now.getTime() - transDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (filter) {
        case "day": return diffDays <= 1;
        case "week": return diffDays <= 7;
        case "month": return diffDays <= 30;
      }
    });
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getChartData = () => {
    const filtered = filterTransactions();
    const grouped = filtered.reduce((acc, t) => {
      const date = new Date(t.date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      if (t.type === "income") {
        acc[date].income += t.amount;
      } else {
        acc[date].expense += t.amount;
      }
      return acc;
    }, {} as Record<string, { date: string; income: number; expense: number }>);

    return Object.values(grouped);
  };

  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">Your financial overview</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl">
              <Plus className="h-4 w-4 mr-2" />
              Add transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue="expense" required>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  name="reason"
                  required
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                  className="bg-muted/50"
                />
              </div>
              <Button type="submit" className="w-full rounded-full">
                Add Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800/30 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Income</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">${totalIncome.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200 dark:border-red-800/30 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">Expenses</p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-300">${totalExpense.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={`p-6 bg-gradient-to-br ${netBalance >= 0 ? 'from-primary/10 to-primary/5 border-primary/20' : 'from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800/30'} hover:shadow-lg transition-all`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${netBalance >= 0 ? 'from-primary to-primary/80' : 'from-orange-500 to-orange-600'} flex items-center justify-center shadow-lg`}>
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className={`text-xs font-medium ${netBalance >= 0 ? 'text-primary' : 'text-orange-700 dark:text-orange-400'} uppercase tracking-wide`}>Balance</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-primary" : "text-orange-800 dark:text-orange-300"}`}>
                  ${netBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Financial Overview</h2>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as TimeFilter)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={getChartData()}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="hsl(142 71% 45%)"
              strokeWidth={2}
              dot={{ fill: "hsl(142 71% 45%)" }}
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="hsl(0 84% 60%)"
              strokeWidth={2}
              dot={{ fill: "hsl(0 84% 60%)" }}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
