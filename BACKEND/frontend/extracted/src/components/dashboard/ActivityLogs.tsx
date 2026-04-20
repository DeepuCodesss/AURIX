import React from 'react';
import { History, Shield, User, Settings, Info, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityLog } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityLogsProps {
  logs: ActivityLog[];
  onDelete: (log: ActivityLog) => void;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs, onDelete }) => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold">Activity Logs</h2>
        <p className="text-muted-foreground">Chronological record of all system and security events.</p>
      </div>

      <Card className="glass border-white/5 flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-6 space-y-8 relative">
              {/* Timeline Line */}
              <div className="absolute left-[39px] top-8 bottom-8 w-[1px] bg-white/10" />

              {logs.map((log, i) => (
                <div key={log.id} className="relative flex gap-6 group">
                  <div className={cn(
                    "z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-background transition-all duration-300",
                    log.type === 'security' ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                    log.type === 'system' ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,242,255,0.5)]" :
                    "bg-purple-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                  )}>
                    {log.type === 'security' ? <Shield className="w-4 h-4" /> :
                     log.type === 'system' ? <Settings className="w-4 h-4" /> :
                     <User className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 space-y-1 pb-8 border-b border-white/5 group-last:border-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-lg">{log.event}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <button 
                          onClick={() => onDelete(log)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                    {log.user && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">Initiated by <span className="text-foreground font-medium">{log.user}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {logs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-mono">Waiting for system telemetry...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
