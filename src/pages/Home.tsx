import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckSquare, DollarSign, TrendingUp, Sparkles, Mic, Plus, Clock, Target, AlertCircle, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VoiceInput } from "@/components/VoiceInput";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks');
    const savedTransactions = localStorage.getItem('transactions');
    
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  const getStats = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Task analytics
    const todayTasks = tasks.filter((task: any) => 
      new Date(task.dueDate).toDateString() === todayStr
    );
    const completedToday = todayTasks.filter((task: any) => task.completed);
    const overdueTasks = tasks.filter((task: any) => 
      !task.completed && new Date(task.dueDate) < today
    );
    const thisWeekTasks = tasks.filter((task: any) => 
      new Date(task.createdAt) >= thisWeek
    );
    const completedThisWeek = thisWeekTasks.filter((task: any) => task.completed);
    
    // Budget analytics
    const thisMonthTransactions = transactions.filter((t: any) => 
      new Date(t.date) >= thisMonth
    );
    const totalExpenses = thisMonthTransactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalIncome = thisMonthTransactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    // Category breakdown
    const categorySpending = thisMonthTransactions
      .filter((t: any) => t.type === 'expense')
      .reduce((acc: any, t: any) => {
        const category = t.category || 'other';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {});

    const topCategory = Object.entries(categorySpending)
      .sort(([,a]: any, [,b]: any) => b - a)[0];

    return {
      tasks: {
        todayCompleted: completedToday.length,
        todayTotal: todayTasks.length,
        overdue: overdueTasks.length,
        weeklyCompletion: thisWeekTasks.length > 0 ? (completedThisWeek.length / thisWeekTasks.length) * 100 : 0,
        weeklyTotal: thisWeekTasks.length
      },
      budget: {
        income: totalIncome,
        expenses: totalExpenses,
        savings: totalIncome - totalExpenses,
        topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
        categoryBreakdown: Object.entries(categorySpending).map(([name, amount]: any) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: amount,
          color: getCategoryColor(name)
        }))
      }
    };
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
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
    return colors[category] || '#AEB6BF';
  };

  const stats = getStats();

  const handleVoiceInput = ({ text, category, extractedData }: any) => {
    if (category === 'todo') {
      navigate('/todo', { state: { newTask: { text, extractedData } } });
    } else if (category === 'budget') {
      navigate('/budget', { state: { newTransaction: { text, extractedData } } });
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Welcome to VoiceZen
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your AI-powered personal assistant for managing tasks and budget with voice input
          </p>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Tasks</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{stats.tasks.todayCompleted}/{stats.tasks.todayTotal}</span>
                  {stats.tasks.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.tasks.overdue} overdue
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekly Progress</p>
                <p className="text-lg font-bold">{stats.tasks.weeklyCompletion.toFixed(0)}%</p>
                <Progress value={stats.tasks.weeklyCompletion} className="h-1 mt-1" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-lg font-bold">${stats.budget.expenses.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">expenses</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.budget.savings >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                <TrendingUp className={`h-5 w-5 ${stats.budget.savings >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Savings</p>
                <p className={`text-lg font-bold ${stats.budget.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${stats.budget.savings.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      {/* Voice Assistant Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="p-8 relative overflow-hidden border-border/50">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">AI Voice Assistant</h2>
            </div>
            
            <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-3xl">
              Simply speak or type to add tasks, track expenses, or get insights. Our AI understands natural language and categorizes your requests automatically.
            </p>
            
            {/* Voice Input */}
            <div className="mb-8">
              <VoiceInput 
                onSubmit={handleVoiceInput}
                placeholder="Try: 'Add meeting tomorrow at 2pm' or 'I spent $25 on coffee'"
                className="max-w-2xl"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => navigate('/todo')}
                className="rounded-full"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              <Button 
                onClick={() => navigate('/budget')}
                variant="outline"
                className="rounded-full"
                size="lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
              <Button 
                onClick={() => navigate('/insights')}
                variant="ghost"
                className="rounded-full"
                size="lg"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Insights
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>



      
      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Analytics */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Task Insights</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Today's Completion Rate</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={stats.tasks.todayTotal > 0 ? (stats.tasks.todayCompleted / stats.tasks.todayTotal) * 100 : 0} 
                    className="w-20 h-2" 
                  />
                  <span className="text-sm font-medium">
                    {stats.tasks.todayTotal > 0 ? Math.round((stats.tasks.todayCompleted / stats.tasks.todayTotal) * 100) : 0}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Weekly Tasks Created</span>
                <Badge variant="secondary">{stats.tasks.weeklyTotal}</Badge>
              </div>
              
              {stats.tasks.overdue > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">You have {stats.tasks.overdue} overdue task{stats.tasks.overdue > 1 ? 's' : ''}</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/todo')}
              >
                View All Tasks
              </Button>
            </div>
          </Card>
        </motion.div>


        

        {/* Budget Analytics */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Spending Overview</h3>
            </div>
            
            <div className="space-y-4">
              {stats.budget.topCategory && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Top Spending Category</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-medium capitalize">{stats.budget.topCategory.name}</span>
                    <span className="font-bold">${(stats.budget.topCategory.amount as number).toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly Income</span>
                  <span className="font-medium text-green-600">${stats.budget.income.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly Expenses</span>
                  <span className="font-medium text-red-600">${stats.budget.expenses.toFixed(2)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Net Balance</span>
                  <span className={stats.budget.savings >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${stats.budget.savings.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {stats.budget.categoryBreakdown.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Spending by Category</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={stats.budget.categoryBreakdown.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.budget.categoryBreakdown.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/budget')}
              >
                View Budget Details
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>


    </div>
  );
}
