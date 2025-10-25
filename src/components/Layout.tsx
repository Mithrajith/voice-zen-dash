import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, Home, CheckSquare, DollarSign, BarChart3, Settings, Sun, Moon, Bell, Mic, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { VoiceInput } from "@/components/VoiceInput";
import { FloatingVoiceButton } from "@/components/FloatingVoiceButton";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/todo", icon: CheckSquare, label: "To-Do" },
  { path: "/budget", icon: DollarSign, label: "Budget" },
  { path: "/insights", icon: BarChart3, label: "Insights" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start with closed sidebar like YouTube mobile
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { getCurrentUser, logout } = useAuth();
  const { toast } = useToast();
  
  const currentUser = getCurrentUser();

  const handleVoiceInput = ({ text, category, extractedData }: any) => {
    if (category === 'todo') {
      navigate('/todo', { state: { newTask: { text, extractedData } } });
    } else if (category === 'budget') {
      navigate('/budget', { state: { newTransaction: { text, extractedData } } });
    } else {
      toast({
        title: "Unclear input",
        description: "I couldn't categorize your input. Please try being more specific.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* YouTube-style Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border/40 z-50">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-10 w-10 hover:bg-accent/80 rounded-full"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden sm:block">VoiceZen</span>
            </Link>
          </div>

          {/* Center section - Search */}
          <div className="flex-1 max-w-2xl mx-4">
            {/* <VoiceInput 
              placeholder="Search or ask me anything..."
              onSubmit={handleVoiceInput}
              className="w-full"
            /> */}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 hover:bg-accent/80 rounded-full"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 hover:bg-accent/80 rounded-full"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <div className="h-8 w-8 ml-2 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg" title={currentUser?.name || 'User'}>
              <span className="text-xs font-medium text-white">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* YouTube-style Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed left-0 top-14 bottom-0 w-60 bg-background/95 backdrop-blur-sm border-r border-border/40 z-50 overflow-y-auto"
            >
              <div className="p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                      <div className={`flex items-center gap-6 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-accent/80 text-accent-foreground font-medium"
                          : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                      }`}>
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              
              {/* Sidebar Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/40 bg-background/95">
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent/40 mb-3"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
                
                <div className="text-xs text-muted-foreground text-center">
                  <p>Signed in as {currentUser?.name}</p>
                  <p className="mt-1">VoiceZen Dashboard</p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={`pt-14 min-h-screen transition-all duration-200 ${
        sidebarOpen ? 'lg:pl-60' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      
      {/* Floating Voice Button */}
      <FloatingVoiceButton />
    </div>
  );
}
