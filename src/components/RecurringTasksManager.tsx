import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Repeat, Clock, Calendar, Trash2, Play, Pause, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRecurringTasks, RecurringTask, RecurringType } from "@/hooks/useRecurringTasks";

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RecurringTasksManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const { toast } = useToast();
  
  const {
    recurringTasks,
    addRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    toggleRecurringTask,
    getRecurringTaskStats,
  } = useRecurringTasks();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    recurringType: 'daily' as RecurringType,
    time: '',
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
  });

  const stats = getRecurringTaskStats();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Task title is required" });
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      recurringType: formData.recurringType,
      startDate: new Date().toISOString(),
      time: formData.time || undefined,
      daysOfWeek: formData.recurringType === 'weekly' && formData.daysOfWeek.length > 0 
        ? formData.daysOfWeek 
        : undefined,
      dayOfMonth: formData.recurringType === 'monthly' 
        ? formData.dayOfMonth 
        : undefined,
    };

    if (editingTask) {
      updateRecurringTask(editingTask.id, taskData);
      toast({ title: "Recurring task updated successfully" });
    } else {
      addRecurringTask(taskData);
      toast({ title: "Recurring task created successfully" });
    }

    resetForm();
    setIsAddDialogOpen(false);
    setEditingTask(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      recurringType: 'daily',
      time: '',
      daysOfWeek: [],
      dayOfMonth: 1,
    });
  };

  const handleEdit = (task: RecurringTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      recurringType: task.recurringType,
      time: task.time || '',
      daysOfWeek: task.daysOfWeek || [],
      dayOfMonth: task.dayOfMonth || 1,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteRecurringTask(id);
    toast({ title: "Recurring task deleted" });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRecurringDescription = (task: RecurringTask) => {
    switch (task.recurringType) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        if (task.daysOfWeek && task.daysOfWeek.length > 0) {
          return `Every ${task.daysOfWeek.map(d => dayNames[d]).join(', ')}`;
        }
        return 'Weekly';
      case 'monthly':
        if (task.dayOfMonth) {
          return `On the ${task.dayOfMonth}${getOrdinalSuffix(task.dayOfMonth)} of each month`;
        }
        return 'Monthly';
      default:
        return 'No recurrence';
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" />
            Recurring Tasks
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Automate your routine tasks with smart recurring schedules
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Recurring Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Recurring Task' : 'Create Recurring Task'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Take vitamins"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                >
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
              
              <div>
                <Label>Recurrence</Label>
                <Select 
                  value={formData.recurringType} 
                  onValueChange={(value: RecurringType) => setFormData(prev => ({ ...prev, recurringType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="time">Time (optional)</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              
              {/* Weekly specific options */}
              {formData.recurringType === 'weekly' && (
                <div>
                  <Label>Days of the week</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {dayNames.map((day, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={formData.daysOfWeek.includes(index)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              daysOfWeek: checked
                                ? [...prev.daysOfWeek, index]
                                : prev.daysOfWeek.filter(d => d !== index)
                            }));
                          }}
                        />
                        <Label htmlFor={`day-${index}`} className="text-xs">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Monthly specific options */}
              {formData.recurringType === 'monthly' && (
                <div>
                  <Label htmlFor="dayOfMonth">Day of the month</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full">
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.typeBreakdown.daily || 0}</p>
            <p className="text-sm text-muted-foreground">Daily</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.typeBreakdown.weekly || 0}</p>
            <p className="text-sm text-muted-foreground">Weekly</p>
          </div>
        </Card>
      </div>

      {/* Recurring Tasks List */}
      <div className="space-y-4">
        <AnimatePresence>
          {recurringTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className={`p-4 ${task.isActive ? 'border-l-4 border-l-primary' : 'opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                      <h3 className="font-semibold">{task.title}</h3>
                      <Badge variant={task.isActive ? 'default' : 'secondary'}>
                        {task.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        <span>{getRecurringDescription(task)}</span>
                      </div>
                      {task.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRecurringTask(task.id)}
                      className="h-8 w-8 p-0"
                    >
                      {task.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      className="h-8 w-8 p-0 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {recurringTasks.length === 0 && (
          <Card className="p-8 text-center">
            <div className="mb-4">
              <Repeat className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No recurring tasks yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first recurring task to automate routine activities
              </p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Recurring Task
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}