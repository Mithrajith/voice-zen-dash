import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Circle, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface CalendarViewProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ tasks, onAddTask, onToggleTask, onDeleteTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Previous month's days
    const prevMonth = new Date(currentYear, currentMonth - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      days.push({
        date: prevMonthDays - i,
        isCurrentMonth: false,
        fullDate: new Date(currentYear, currentMonth - 1, prevMonthDays - i)
      });
    }
    
    // Current month's days
    for (let date = 1; date <= daysInMonth; date++) {
      days.push({
        date,
        isCurrentMonth: true,
        fullDate: new Date(currentYear, currentMonth, date)
      });
    }
    
    // Next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let date = 1; date <= remainingDays; date++) {
      days.push({
        date,
        isCurrentMonth: false,
        fullDate: new Date(currentYear, currentMonth + 1, date)
      });
    }
    
    return days;
  }, [currentYear, currentMonth, firstDayWeekday, daysInMonth]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const dateKey = new Date(task.dueDate).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasks]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getTasksForDate = (date: Date) => {
    const dateKey = date.toDateString();
    return tasksByDate[dateKey] || [];
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const task = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      dueDate: formData.get("dueDate") as string,
      priority: formData.get("priority") as Priority,
      completed: false,
    };

    onAddTask(task);
    toast({ title: "Task added successfully" });
    setIsAddDialogOpen(false);
    e.currentTarget.reset();
  };

  const todaysTasks = getTasksForDate(new Date()).filter(t => !t.completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="datetime-local"
                  defaultValue={
                    selectedDate ? 
                    new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) :
                    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium" required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayTasks = getTasksForDate(day.fullDate);
                const completedTasks = dayTasks.filter(t => t.completed).length;
                const pendingTasks = dayTasks.filter(t => !t.completed).length;
                const hasOverdueTasks = dayTasks.some(t => !t.completed && new Date(t.dueDate) < new Date());
                
                return (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className={`
                      relative p-2 rounded-lg border transition-all cursor-pointer min-h-[80px]
                      ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'}
                      ${isToday(day.fullDate) ? 'ring-2 ring-primary bg-primary/5' : ''}
                      ${isSelected(day.fullDate) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''}
                      hover:bg-accent/50
                    `}
                    onClick={() => setSelectedDate(day.fullDate)}
                  >
                    <div className="text-sm font-medium mb-1">{day.date}</div>
                    
                    {/* Task indicators */}
                    {dayTasks.length > 0 && (
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map(task => (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded truncate flex items-center gap-1 ${
                              task.completed ? 'bg-green-100 text-green-800 dark:bg-green-900/20' : 
                              hasOverdueTasks ? 'bg-red-100 text-red-800 dark:bg-red-900/20' : 
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/20'
                            }`}
                          >
                            {task.completed ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : hasOverdueTasks ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        ))}
                        
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Task count badges */}
                    {(pendingTasks > 0 || completedTasks > 0) && (
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        {pendingTasks > 0 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {pendingTasks}
                          </Badge>
                        )}
                        {completedTasks > 0 && (
                          <Badge variant="default" className="text-xs px-1 py-0 bg-green-500">
                            ✓{completedTasks}
                          </Badge>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Today's Tasks */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="h-4 w-4" />
              <h3 className="font-semibold">Today's Tasks</h3>
              <Badge variant="secondary">{todaysTasks.length}</Badge>
            </div>
            
            <div className="space-y-2">
              {todaysTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending tasks for today</p>
              ) : (
                todaysTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                        <span className="text-xs text-muted-foreground">{task.priority}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Selected Date Tasks */}
          {selectedDate && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </h3>
              
              <div className="space-y-2">
                {getTasksForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No tasks for this date</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(true)}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                  </div>
                ) : (
                  getTasksForDate(selectedDate).map(task => (
                    <div key={task.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 hover:scale-110 transition-transform"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                          <span className="text-xs text-muted-foreground">{task.priority}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.dueDate).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}