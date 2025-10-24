import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckSquare, DollarSign, TrendingUp, Sparkles, Mic, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/VoiceInput";
import { useToast } from "@/hooks/use-toast";

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
    const today = new Date().toDateString();
    const todayTasks = tasks.filter((task: any) => 
      new Date(task.createdAt).toDateString() === today
    );
    const completedTasks = todayTasks.filter((task: any) => task.completed);
    
    const totalExpenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const savings = totalIncome - totalExpenses;

    return [
      { 
        label: "Tasks Today", 
        value: `${completedTasks.length}/${todayTasks.length}`, 
        icon: CheckSquare, 
        color: "text-blue-500",
        progress: todayTasks.length > 0 ? (completedTasks.length / todayTasks.length) * 100 : 0
      },
      { 
        label: "Total Expenses", 
        value: `$${totalExpenses.toFixed(2)}`, 
        icon: DollarSign, 
        color: "text-red-500",
        progress: null
      },
      { 
        label: "Net Savings", 
        value: `$${savings.toFixed(2)}`, 
        icon: TrendingUp, 
        color: savings >= 0 ? "text-green-500" : "text-red-500",
        progress: null
      },
    ];
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.progress !== null && (
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
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
    </div>
  );
}
