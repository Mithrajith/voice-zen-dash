import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, CheckCircle2, Circle, Calendar, AlertCircle, CheckSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Priority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

export default function Todo() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    if (saved) {
      setTasks(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    checkReminders();
  }, [tasks]);

  const checkReminders = () => {
    const now = new Date();
    tasks.forEach((task) => {
      if (!task.completed) {
        const dueDate = new Date(task.dueDate);
        const hoursDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 0 && hoursDiff < 24) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Task Reminder", {
              body: `"${task.title}" is due soon!`,
              icon: "/favicon.ico",
            });
          }
        }
      }
    });
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Handle voice input from navigation state
  useEffect(() => {
    const locationWithState = location as any;
    if (locationWithState?.state?.newTask) {
      const { text, extractedData } = locationWithState.state.newTask;
      const task: Task = {
        id: Date.now().toString(),
        title: extractedData?.title || text,
        description: extractedData?.description || '',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default to tomorrow
        priority: extractedData?.priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
      };
      
      setTasks(prev => [task, ...prev]);
      toast({ title: "✅ Task added from voice input!" });
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location, toast]);

  // Handle voice input from navigation state
  useEffect(() => {
    const locationWithState = location as any;
    if (locationWithState?.state?.newTask) {
      const { text, extractedData } = locationWithState.state.newTask;
      const task: Task = {
        id: Date.now().toString(),
        title: extractedData?.title || text,
        description: extractedData?.description || '',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default to tomorrow
        priority: extractedData?.priority || 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
      };
      
      setTasks(prev => [task, ...prev]);
      toast({ title: "Task added from voice input!" });
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location, toast]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const task: Task = {
      id: editingTask?.id || Date.now().toString(),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      dueDate: formData.get("dueDate") as string,
      priority: formData.get("priority") as Priority,
      completed: editingTask?.completed || false,
      createdAt: editingTask?.createdAt || new Date().toISOString(),
    };

    if (editingTask) {
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
      toast({ title: "Task updated successfully" });
    } else {
      setTasks([task, ...tasks]);
      toast({ title: "Task added successfully" });
    }

    setIsDialogOpen(false);
    setEditingTask(null);
    e.currentTarget.reset();
  };

  const toggleComplete = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
    toast({ title: "Task deleted" });
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high": return "text-red-500 bg-red-500/10";
      case "medium": return "text-yellow-500 bg-yellow-500/10";
      case "low": return "text-green-500 bg-green-500/10";
    }
  };

  return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Organize your life, one task at a time</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditingTask(null)} className="rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl">
              <Plus className="h-4 w-4 mr-2" />
              New task
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingTask?.title}
                  required
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingTask?.description}
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  defaultValue={editingTask?.dueDate}
                  required
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue={editingTask?.priority || "medium"} required>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-full">
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Google Keep style masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        <AnimatePresence>
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className="break-inside-avoid mb-4"
            >
              <Card className={`p-4 hover:shadow-lg transition-all duration-200 border-l-4 cursor-pointer group ${
                task.completed 
                  ? "opacity-70 border-l-green-400 bg-green-50/30 dark:bg-green-950/20" 
                  : task.priority === 'high' 
                    ? "border-l-red-400 bg-red-50/20 dark:bg-red-950/10"
                    : task.priority === 'medium'
                      ? "border-l-yellow-400 bg-yellow-50/20 dark:bg-yellow-950/10"
                      : "border-l-primary bg-primary/5 dark:bg-primary/5"
              } hover:scale-[1.02] hover:rotate-1`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleComplete(task.id)}
                    className="mt-1 hover:scale-110 transition-transform"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm leading-relaxed ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                      {!task.completed && new Date(task.dueDate) < new Date() && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTask(task);
                        setIsDialogOpen(true);
                      }}
                      className="h-7 w-7 hover:bg-accent/50"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 col-span-full"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground text-sm">Create your first task to get started!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
