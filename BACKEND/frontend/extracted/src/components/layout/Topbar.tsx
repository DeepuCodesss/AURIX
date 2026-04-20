import React from 'react';
import { Bell, Search, ShieldCheck, Wifi, Cpu, Sun, Moon, User, LogOut, Settings, ShieldAlert, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  notifications: any[];
  onClearNotification: (notification: any) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  notifications, 
  onClearNotification, 
  onLogout,
  isOpen,
  onOpenChange
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-8 z-40">
      <div className="flex items-center gap-6 flex-1">
        <div className="relative w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search threats, logs, or settings..." 
            className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>Network: <span className="text-foreground">Secure</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3 text-primary" />
            <span>AI Engine: <span className="text-foreground">Active</span></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          )}
        </button>

        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger className="relative p-2 rounded-lg hover:bg-white/5 transition-colors group outline-none">
            <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full neon-glow-cyan" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 glass border-white/10 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-bold">Live Alerts</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-primary/20">
                  {notifications.length} New
                </Badge>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => notifications.forEach(n => onClearNotification(n))}
                    className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            <div className="space-y-1 py-1 max-h-[300px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-white/5 rounded-lg group border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        n.type === 'error' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                        n.type === 'success' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                        "bg-primary shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      )} />
                      <span className="text-sm font-bold">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearNotification(n);
                      }}
                      className="mt-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                    >
                      Dismiss
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="justify-center text-xs text-primary font-bold cursor-pointer hover:bg-white/5 py-2">
              Alert Queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="h-8 w-[1px] bg-white/10 mx-2" />
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 pl-2 hover:opacity-80 transition-opacity outline-none bg-transparent border-0 cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold tracking-tight">Runtime Rebels</p>
              <p className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" />
                Security Lead
              </p>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 flex items-center justify-center overflow-hidden p-0.5">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Runtime%20Rebels&backgroundColor=b6e3f4" 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 glass border-white/10 p-2">
            <div className="px-2 py-2 mb-1">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-bold truncate">runtimerebel@gmail.com</p>
            </div>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem className="gap-3 cursor-pointer hover:bg-white/5 py-2.5">
              <User className="w-4 h-4 text-primary" /> 
              <div className="flex flex-col">
                <span className="text-sm font-medium">My Profile</span>
                <span className="text-[10px] text-muted-foreground">View your security stats</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 cursor-pointer hover:bg-white/5 py-2.5">
              <Settings className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Settings</span>
                <span className="text-[10px] text-muted-foreground">Account preferences</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 cursor-pointer hover:bg-white/5 py-2.5">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Security Audit</span>
                <span className="text-[10px] text-muted-foreground">Last check: 2h ago</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 cursor-pointer hover:bg-white/5 py-2.5">
              <History className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Activity Log</span>
                <span className="text-[10px] text-muted-foreground">Recent actions</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem 
              onClick={onLogout}
              className="gap-3 cursor-pointer text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-500 py-2.5"
            >
              <LogOut className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Logout</span>
                <span className="text-[10px] opacity-70">End current session</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
