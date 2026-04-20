import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Shield, Lock, Bell, Eye, Database, Cpu, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SettingsProps {
  onClearAll: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClearAll }) => {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    setIsResetting(true);
    // Simulate reset
    setTimeout(() => {
      onClearAll();
      setIsResetting(false);
      // We don't want to reload the whole page if we're managing state globally
      // but the user might expect a "fresh" feel. 
      // For now, let's just let the state update reflect.
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-2xl font-bold">System Settings</h2>
        <p className="text-muted-foreground">Manage your security preferences and system configuration.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ... existing cards ... */}
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Protection Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Heuristic Sensitivity</span>
                <span className="text-primary font-mono">Aggressive (85%)</span>
              </div>
              <Slider defaultValue={[85]} max={100} step={1} className="[&_[role=slider]]:bg-primary" />
              <p className="text-xs text-muted-foreground">
                Higher sensitivity increases threat detection but may lead to more false positives.
              </p>
            </div>
            
            <Separator className="bg-white/5" />
            
            <div className="space-y-4">
              {[
                { id: 'realtime', label: 'Real-time Scanning', desc: 'Monitor all system events as they happen.', icon: Cpu },
                { id: 'auto-mitigate', label: 'Auto-Mitigation', desc: 'Automatically block IPs and isolate processes on high-severity threats.', icon: Lock },
                { id: 'deep-packet', label: 'Deep Packet Inspection', desc: 'Analyze encrypted traffic for hidden malware signatures.', icon: Database },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-white/5">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor={item.id} className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch id={item.id} defaultChecked />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-purple-500" />
              Notifications & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: 'critical-alerts', label: 'Critical Threat Alerts', desc: 'Immediate notification for severity level 4+ threats.', checked: true },
              { id: 'daily-report', label: 'Daily Security Report', desc: 'Receive a summary of all activity every 24 hours.', checked: true },
              { id: 'login-notify', label: 'Login Notifications', desc: 'Notify on every successful or failed login attempt.', checked: false },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={item.id} className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch id={item.id} defaultChecked={item.checked} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5 text-blue-500" />
              Privacy & Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="stealth-mode" className="text-sm font-medium">Stealth Mode</Label>
                <p className="text-xs text-muted-foreground">Hide system fingerprints from external network scans.</p>
              </div>
              <Switch id="stealth-mode" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="data-sharing" className="text-sm font-medium">Anonymous Threat Sharing</Label>
                <p className="text-xs text-muted-foreground">Share anonymized threat data to improve global AI models.</p>
              </div>
              <Switch id="data-sharing" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-500">
              <Trash2 className="w-5 h-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium">Reset System Data</h4>
                <p className="text-xs text-muted-foreground">Clear all threat logs, activity history, and custom settings.</p>
              </div>
              
              <Dialog>
                <DialogTrigger className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold transition-all outline-none cursor-pointer">
                  Reset Data
                </DialogTrigger>
                <DialogContent className="glass border-white/10">
                  <DialogHeader>
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                      <AlertTriangle className="text-red-500 w-6 h-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold">Are you absolutely sure?</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      This action cannot be undone. This will permanently delete all threat logs, activity history, and reset your security preferences to default.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-3 mt-6">
                    <button className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors">
                      Cancel
                    </button>
                    <button 
                      onClick={handleReset}
                      disabled={isResetting}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      {isResetting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        'Confirm Reset'
                      )}
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
