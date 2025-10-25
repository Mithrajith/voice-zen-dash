import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Moon, Trash2, Download, Mic, Volume2, Palette, Shield, Database, Upload, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PWAManager } from "@/components/PWAManager";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

interface SettingsState {
  notifications: {
    taskReminders: boolean;
    budgetAlerts: boolean;
    voiceFeedback: boolean;
    browserNotifications: boolean;
  };
  voice: {
    enabled: boolean;
    volume: number;
    language: string;
    autoListen: boolean;
  };
  privacy: {
    dataCollection: boolean;
    analyticsTracking: boolean;
  };
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      taskReminders: true,
      budgetAlerts: true,
      voiceFeedback: true,
      browserNotifications: true,
    },
    voice: {
      enabled: true,
      volume: 80,
      language: 'en-US',
      autoListen: false,
    },
    privacy: {
      dataCollection: false,
      analyticsTracking: false,
    },
  });

  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      setSettings({ ...settings, ...JSON.parse(saved) });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (section: keyof SettingsState, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      localStorage.removeItem("tasks");
      localStorage.removeItem("transactions");
      toast({ title: "All data cleared", description: "Your tasks and transactions have been deleted." });
    }
  };

  const handleExportData = () => {
    const data = {
      tasks: localStorage.getItem("tasks"),
      transactions: localStorage.getItem("transactions"),
      settings: localStorage.getItem("app-settings"),
      theme: localStorage.getItem("theme"),
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast({ title: "Data exported successfully" });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.tasks) localStorage.setItem("tasks", data.tasks);
        if (data.transactions) localStorage.setItem("transactions", data.transactions);
        if (data.settings) localStorage.setItem("app-settings", data.settings);
        toast({ title: "Data imported successfully", description: "Please refresh the page to see changes." });
      } catch {
        toast({ title: "Import failed", description: "Invalid file format", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast({ title: "Notifications enabled", description: "You'll now receive browser notifications." });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your AI assistant experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-reminders">Task Reminders</Label>
                <Switch 
                  id="task-reminders" 
                  checked={settings.notifications.taskReminders}
                  onCheckedChange={(checked) => updateSettings('notifications', 'taskReminders', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="budget-alerts">Budget Alerts</Label>
                <Switch 
                  id="budget-alerts"
                  checked={settings.notifications.budgetAlerts}
                  onCheckedChange={(checked) => updateSettings('notifications', 'budgetAlerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-feedback">Voice Feedback</Label>
                <Switch 
                  id="voice-feedback"
                  checked={settings.notifications.voiceFeedback}
                  onCheckedChange={(checked) => updateSettings('notifications', 'voiceFeedback', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="browser-notifications">Browser Notifications</Label>
                <Switch 
                  id="browser-notifications"
                  checked={settings.notifications.browserNotifications}
                  onCheckedChange={(checked) => {
                    updateSettings('notifications', 'browserNotifications', checked);
                    if (checked) requestNotificationPermission();
                  }}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Voice Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mic className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Voice Assistant</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-enabled">Enable Voice Input</Label>
                <Switch 
                  id="voice-enabled"
                  checked={settings.voice.enabled}
                  onCheckedChange={(checked) => updateSettings('voice', 'enabled', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice-volume">Voice Volume</Label>
                <div className="flex items-center gap-3">
                  <Volume2 className="h-4 w-4" />
                  <Slider
                    id="voice-volume"
                    value={[settings.voice.volume]}
                    onValueChange={([value]) => updateSettings('voice', 'volume', value)}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground min-w-[3rem]">
                    {settings.voice.volume}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice-language">Language</Label>
                <Select
                  value={settings.voice.language}
                  onValueChange={(value) => updateSettings('voice', 'language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Current Theme</Label>
                <span className="text-sm px-3 py-1 rounded-full bg-accent capitalize">
                  {theme} Mode
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Use the theme toggle in the header to switch between light and dark mode
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Privacy</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="data-collection">Anonymous Usage Data</Label>
                <Switch 
                  id="data-collection"
                  checked={settings.privacy.dataCollection}
                  onCheckedChange={(checked) => updateSettings('privacy', 'dataCollection', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics">Analytics Tracking</Label>
                <Switch 
                  id="analytics"
                  checked={settings.privacy.analyticsTracking}
                  onCheckedChange={(checked) => updateSettings('privacy', 'analyticsTracking', checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                All data is stored locally on your device. No personal information is sent to external servers.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* PWA Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">App Management</h2>
          </div>
          <PWAManager />
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Data Management</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
            <Button
              variant="outline"
              className="justify-start text-destructive hover:bg-destructive/10"
              onClick={handleClearData}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Export your data as a backup or import from a previous backup. Data is now synced to the cloud.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
