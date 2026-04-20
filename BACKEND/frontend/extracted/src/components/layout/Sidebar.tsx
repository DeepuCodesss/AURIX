import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  History, 
  BrainCircuit, 
  Settings, 
  User,
  LogOut,
  ChevronRight,
  Trash2,
  Monitor,
  ScanSearch
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, isAdmin }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'threats', label: 'Threat Analysis', icon: AlertTriangle },
    { id: 'logs', label: 'Activity Logs', icon: History },
    { id: 'ai', label: 'AI Insights', icon: BrainCircuit },
    { id: 'system-scan', label: 'System Scan', icon: ScanSearch },
    { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Monitor }] : []),
  ];
  return (
    <aside className="w-64 h-screen glass border-r border-white/5 flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center neon-glow-cyan">
          <Shield className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">AURIX</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Neural Defense</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
              activeTab === item.id 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            {activeTab === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            )}
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-300",
              activeTab === item.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="font-medium">{item.label}</span>
            <ChevronRight className={cn(
              "w-4 h-4 ml-auto opacity-0 transition-all duration-300",
              activeTab === item.id ? "opacity-100 translate-x-0" : "group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0"
            )} />
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-muted-foreground hover:bg-white/5 hover:text-foreground",
            activeTab === 'settings' && "bg-primary/10 text-primary"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
