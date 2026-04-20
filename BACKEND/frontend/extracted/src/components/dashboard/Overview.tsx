import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  ShieldAlert, 
  Activity, 
  Zap, 
  Lock, 
  ArrowUpRight, 
  ArrowDownRight,
  Cpu,
  HardDrive,
  Wifi,
  Box,
  AlertTriangle,
  CheckCircle2,
  X,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { Threat, ActivityLog } from '@/types';
import { API_URL } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ScanTypes } from './ScanTypes';

interface SystemStats {
  cpu_percent: number;
  cpu_count: number;
  memory: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; percent: number };
  network: { bytes_sent: number; bytes_recv: number; packets_sent: number; packets_recv: number };
  boot_time: number;
  active_connections: number;
  process_count: number;
  timestamp: number;
}

interface InstalledApp {
  name: string;
  version: string;
  publisher: string;
  needs_update: boolean;
  risk: string;
}

interface OverviewProps {
  threats: Threat[];
  logs: ActivityLog[];
  onReset: () => void;
  onOpenNotifications: () => void;
  loggedInEmail?: string;
}

export const Overview: React.FC<OverviewProps> = ({ threats, logs, onReset, onOpenNotifications, loggedInEmail }) => {
  const activeThreatsCount = threats.filter(t => t.status === 'active').length;
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsHistory, setStatsHistory] = useState<{time: string; cpu: number; ram: number; net: number}[]>([]);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [appsTotal, setAppsTotal] = useState(0);
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [netSpeed, setNetSpeed] = useState<{up: string; down: string}>({up: '0 KB/s', down: '0 KB/s'});
  
  // Use refs to avoid re-triggering the effect
  const prevNetRef = useRef<{sent: number; recv: number; time: number} | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Fetch real system stats every 3 seconds — stable interval, no dependency churn
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/system/stats`);
        if (!res.ok) return;
        const data: SystemStats = await res.json();
        setStats(data);

        // Calculate network speed using ref (no re-render loop)
        const prev = prevNetRef.current;
        if (prev) {
          const elapsed = data.timestamp - prev.time;
          if (elapsed > 0) {
            const upBytes = (data.network.bytes_sent - prev.sent) / elapsed;
            const downBytes = (data.network.bytes_recv - prev.recv) / elapsed;
            setNetSpeed({
              up: formatBytes(Math.max(0, upBytes)) + '/s',
              down: formatBytes(Math.max(0, downBytes)) + '/s',
            });
          }
        }
        prevNetRef.current = { sent: data.network.bytes_sent, recv: data.network.bytes_recv, time: data.timestamp };

        // Track history for chart
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setStatsHistory(prev => {
          const next = [...prev, { time: timeStr, cpu: data.cpu_percent, ram: data.memory.percent, net: Math.round((data.network.bytes_recv % 100000) / 1000) }];
          return next.slice(-20);
        });
      } catch(err) { /* backend offline */ }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch installed apps once
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await fetch(`${API_URL}/system/apps`);
        if (!res.ok) return;
        const data = await res.json();
        setApps(data.apps || []);
        setAppsTotal(data.total || 0);
      } catch(err) { /* backend offline */ }
    };
    fetchApps();
  }, []);

  const getUptime = (): string => {
    if (!stats) return '--';
    const now = Date.now() / 1000;
    const diff = now - stats.boot_time;
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const severityData = [
    { name: 'Critical', value: threats.filter(t => t.severity === 'critical').length, color: '#ef4444' },
    { name: 'High', value: threats.filter(t => t.severity === 'high').length, color: '#f97316' },
    { name: 'Medium', value: threats.filter(t => t.severity === 'medium').length, color: '#eab308' },
    { name: 'Low', value: threats.filter(t => t.severity === 'low').length, color: '#06b6d4' },
  ];

  const outdatedApps = apps.filter(a => a.needs_update);

  // PDF Report Generator
  const generatePDFReport = () => {
    const now = new Date();
    const activeT = threats.filter(t => t.status === 'active');
    const resolvedT = threats.filter(t => t.status === 'resolved');
    
    const html = `
<!DOCTYPE html>
<html><head><title>AURIX — Security Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0b; color: #e0e0e0; padding: 40px; }
  .header { text-align: center; padding: 30px 0; border-bottom: 2px solid #1a1a2e; margin-bottom: 30px; }
  .header h1 { font-size: 28px; color: #4D8AF0; letter-spacing: 6px; text-transform: uppercase; }
  .header p { color: #666; font-size: 12px; margin-top: 8px; }
  .section { margin-bottom: 30px; }
  .section h2 { font-size: 16px; color: #4D8AF0; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #1a1a2e; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px; }
  .stat-card { background: #111; border: 1px solid #222; border-radius: 8px; padding: 18px; }
  .stat-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .stat-card .value { font-size: 24px; font-weight: bold; margin-top: 5px; }
  .safe { color: #10b981; } .warning { color: #f59e0b; } .danger { color: #ef4444; } .info { color: #06b6d4; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #1a1a2e; font-size: 12px; }
  th { color: #4D8AF0; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; }
  tr:hover { background: #111; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
  .badge-safe { background: #10b98120; color: #10b981; } .badge-danger { background: #ef444420; color: #ef4444; } .badge-warning { background: #f59e0b20; color: #f59e0b; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a2e; color: #444; font-size: 10px; }
  @media print { body { background: #fff; color: #222; } .stat-card { border-color: #ddd; background: #f9f9f9; } th { color: #333; } .header h1 { color: #333; } }
</style></head><body>
  <div class="header">
    <h1>AURIX</h1>
    <p>SECURITY ASSESSMENT REPORT — Generated ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
    <p>Operator: ${loggedInEmail || 'Unknown'}</p>
  </div>

  <div class="section">
    <h2>System Overview</h2>
    <div class="grid">
      <div class="stat-card"><div class="label">Active Threats</div><div class="value ${activeT.length > 0 ? 'danger' : 'safe'}">${activeT.length}</div></div>
      <div class="stat-card"><div class="label">CPU Usage</div><div class="value info">${stats?.cpu_percent || 0}%</div></div>
      <div class="stat-card"><div class="label">RAM Usage</div><div class="value info">${stats?.memory.percent || 0}%</div></div>
      <div class="stat-card"><div class="label">Disk Usage</div><div class="value warning">${stats?.disk.percent || 0}%</div></div>
    </div>
    <div class="grid">
      <div class="stat-card"><div class="label">CPU Cores</div><div class="value">${stats?.cpu_count || '--'}</div></div>
      <div class="stat-card"><div class="label">RAM Total</div><div class="value">${stats?.memory.total_gb || '--'} GB</div></div>
      <div class="stat-card"><div class="label">Active Connections</div><div class="value">${stats?.active_connections || 0}</div></div>
      <div class="stat-card"><div class="label">Running Processes</div><div class="value">${stats?.process_count || 0}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Threat Summary (${threats.length} total)</h2>
    <table>
      <thead><tr><th>Type</th><th>Severity</th><th>Source</th><th>Status</th><th>Time</th></tr></thead>
      <tbody>
        ${threats.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#666;">No threats detected — system is clean.</td></tr>' : 
          threats.slice(0, 30).map(t => `<tr>
            <td>${t.type}</td>
            <td><span class="badge badge-${t.severity === 'critical' || t.severity === 'high' ? 'danger' : t.severity === 'medium' ? 'warning' : 'safe'}">${t.severity}</span></td>
            <td style="font-family:monospace;">${t.source}</td>
            <td><span class="badge badge-${t.status === 'active' ? 'danger' : 'safe'}">${t.status}</span></td>
            <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Activity Logs (${logs.length} entries)</h2>
    <table>
      <thead><tr><th>Event</th><th>Type</th><th>Details</th><th>Time</th></tr></thead>
      <tbody>
        ${logs.slice(0, 30).map(l => `<tr>
          <td>${l.event}</td>
          <td><span class="badge badge-${l.type === 'security' ? 'danger' : l.type === 'system' ? 'safe' : 'warning'}">${l.type}</span></td>
          <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.details}</td>
          <td>${new Date(l.timestamp).toLocaleTimeString()}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Installed Applications (${apps.length} detected, ${outdatedApps.length} need updates)</h2>
    <table>
      <thead><tr><th>Application</th><th>Version</th><th>Publisher</th><th>Status</th></tr></thead>
      <tbody>
        ${outdatedApps.map(a => `<tr style="background:#f59e0b08;"><td>${a.name}</td><td style="font-family:monospace;">${a.version}</td><td>${a.publisher || 'Unknown'}</td><td><span class="badge badge-warning">UPDATE</span></td></tr>`).join('')}
        ${apps.filter(a => !a.needs_update).slice(0, 40).map(a => `<tr><td>${a.name}</td><td style="font-family:monospace;">${a.version || 'N/A'}</td><td>${a.publisher || 'Unknown'}</td><td><span class="badge badge-safe">OK</span></td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>© ${now.getFullYear()} AURIX — AI Cyber Defense. All rights reserved.</p>
    <p>This report was auto-generated by the AURIX Security Platform.</p>
  </div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const statCards = [
    { 
      id: 'threats',
      label: 'Active Threats', 
      value: activeThreatsCount.toString(), 
      icon: ShieldAlert, 
      color: 'text-red-500', 
      trend: activeThreatsCount > 0 ? `${activeThreatsCount}` : '0', 
      up: activeThreatsCount > 0,
      onClick: onOpenNotifications
    },
    { 
      id: 'cpu',
      label: 'CPU Usage', 
      value: stats ? `${stats.cpu_percent}%` : '--',
      icon: Cpu, 
      color: 'text-emerald-500', 
      trend: stats ? `${stats.cpu_count} cores` : '--', 
      up: (stats?.cpu_percent || 0) < 80,
    },
    { 
      id: 'network',
      label: 'Network', 
      value: netSpeed.down,
      icon: Wifi, 
      color: 'text-primary', 
      trend: `↑ ${netSpeed.up}`, 
      up: true,
    },
    { 
      id: 'memory',
      label: 'RAM Usage', 
      value: stats ? `${stats.memory.percent}%` : '--',
      icon: Activity, 
      color: 'text-purple-500', 
      trend: stats ? `${stats.memory.used_gb}/${stats.memory.total_gb} GB` : '--', 
      up: (stats?.memory.percent || 0) < 80,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Scanning Operations Section */}
      <div className="w-full">
        <ScanTypes />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Security Overview</h2>
          <p className="text-muted-foreground">Real-time monitoring and system health metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Uptime: {getUptime()}</span>
          <button 
            onClick={generatePDFReport}
            className="flex items-center gap-2 px-4 py-2 glass border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/20 rounded-lg text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 glass border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 rounded-lg text-sm font-medium transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Stats Grid — all clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => stat.onClick ? stat.onClick() : setDetailModal(stat.id)}
            className="cursor-pointer"
          >
            <Card className="glass border-white/5 hover:border-primary/20 transition-all group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={cn(
                    "flex items-center text-[10px] font-bold px-2 py-1 rounded-full bg-white/5",
                    stat.up ? "text-emerald-500" : "text-red-500"
                  )}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {stat.trend}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Live System Telemetry</CardTitle>
            <Badge variant="outline" className="font-mono text-[10px]">REAL-TIME FEED</Badge>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statsHistory}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-neon-cyan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-neon-cyan)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-neon-purple)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-neon-purple)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="var(--color-neon-cyan)" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                <Area type="monotone" dataKey="ram" name="RAM %" stroke="var(--color-neon-purple)" fillOpacity={1} fill="url(#colorRam)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Threat Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6 space-y-3">
              {severityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border-white/5 cursor-pointer hover:border-primary/20 transition-all" onClick={() => setDetailModal('disk')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/5 text-amber-500"><HardDrive className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Disk Usage</p>
                  <h3 className="text-xl font-bold">{stats.disk.percent}%</h3>
                </div>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${stats.disk.percent}%` }} />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-2">{stats.disk.used_gb} / {stats.disk.total_gb} GB</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5 cursor-pointer hover:border-primary/20 transition-all" onClick={() => setDetailModal('connections')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/5 text-cyan-500"><Wifi className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                  <h3 className="text-xl font-bold">{stats.active_connections}</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-muted-foreground mt-2">
                <div>Packets Sent: <span className="text-foreground">{stats.network.packets_sent.toLocaleString()}</span></div>
                <div>Packets Recv: <span className="text-foreground">{stats.network.packets_recv.toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-white/5 cursor-pointer hover:border-primary/20 transition-all" onClick={() => setDetailModal('processes')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/5 text-green-500"><Box className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Running Processes</p>
                  <h3 className="text-xl font-bold">{stats.process_count}</h3>
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-2">
                <div>Total Bandwidth: <span className="text-foreground">↑ {formatBytes(stats.network.bytes_sent)} ↓ {formatBytes(stats.network.bytes_recv)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Installed Apps Section */}
      <Card className="glass border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Installed Applications ({appsTotal})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {outdatedApps.length > 0 
                ? <span className="text-amber-500 font-bold">{outdatedApps.length} app(s) may need updates</span> 
                : 'All detected applications are up to date.'
              }
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">REGISTRY SCAN</Badge>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
            {/* Show outdated apps first */}
            {outdatedApps.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <h4 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Potential Update Required
                </h4>
                <div className="space-y-2">
                  {outdatedApps.map((app, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-amber-500/5 border border-amber-500/10">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium truncate">{app.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{app.publisher || 'Unknown Publisher'} — v{app.version}</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-mono text-[9px] shrink-0">UPDATE</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* All apps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {apps.filter(a => !a.needs_update).slice(0, 50).map((app, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded glass border-white/5">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-xs font-medium truncate">{app.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{app.publisher || 'Unknown'} — v{app.version || 'N/A'}</p>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="sm:max-w-2xl glass border-white/10 bg-black/80 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-mono flex items-center gap-2">
              {detailModal === 'cpu' && <><Cpu className="w-5 h-5 text-emerald-500" /> CPU Details</>}
              {detailModal === 'memory' && <><Activity className="w-5 h-5 text-purple-500" /> Memory Details</>}
              {detailModal === 'network' && <><Wifi className="w-5 h-5 text-primary" /> Network Details</>}
              {detailModal === 'disk' && <><HardDrive className="w-5 h-5 text-amber-500" /> Disk Details</>}
              {detailModal === 'connections' && <><Wifi className="w-5 h-5 text-cyan-500" /> Connection Details</>}
              {detailModal === 'processes' && <><Box className="w-5 h-5 text-green-500" /> Process Details</>}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">Live system telemetry data.</DialogDescription>
          </DialogHeader>
          {stats && (
            <div className="space-y-6 mt-4">
              {detailModal === 'cpu' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Current Load</p><h3 className="text-3xl font-bold text-emerald-500">{stats.cpu_percent}%</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">CPU Cores</p><h3 className="text-3xl font-bold">{stats.cpu_count}</h3></div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={statsHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" fontSize={9} stroke="rgba(255,255,255,0.3)" tickLine={false} />
                        <YAxis domain={[0, 100]} fontSize={9} stroke="rgba(255,255,255,0.3)" tickLine={false} />
                        <Area type="monotone" dataKey="cpu" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {detailModal === 'memory' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Used</p><h3 className="text-2xl font-bold text-purple-500">{stats.memory.used_gb} GB</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Total</p><h3 className="text-2xl font-bold">{stats.memory.total_gb} GB</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Usage</p><h3 className="text-2xl font-bold text-purple-500">{stats.memory.percent}%</h3></div>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${stats.memory.percent}%` }} /></div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={statsHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" fontSize={9} stroke="rgba(255,255,255,0.3)" tickLine={false} />
                        <YAxis domain={[0, 100]} fontSize={9} stroke="rgba(255,255,255,0.3)" tickLine={false} />
                        <Area type="monotone" dataKey="ram" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {detailModal === 'network' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Upload Speed</p><h3 className="text-2xl font-bold text-primary">{netSpeed.up}</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Download Speed</p><h3 className="text-2xl font-bold text-cyan-500">{netSpeed.down}</h3></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Total Sent</p><h3 className="text-lg font-bold font-mono">{formatBytes(stats.network.bytes_sent)}</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Total Received</p><h3 className="text-lg font-bold font-mono">{formatBytes(stats.network.bytes_recv)}</h3></div>
                  </div>
                  <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Active Connections</p><h3 className="text-2xl font-bold">{stats.active_connections}</h3></div>
                </div>
              )}
              {detailModal === 'disk' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Used</p><h3 className="text-2xl font-bold text-amber-500">{stats.disk.used_gb} GB</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Total</p><h3 className="text-2xl font-bold">{stats.disk.total_gb} GB</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Free</p><h3 className="text-2xl font-bold text-emerald-500">{(stats.disk.total_gb - stats.disk.used_gb).toFixed(1)} GB</h3></div>
                  </div>
                  <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${stats.disk.percent}%` }} /></div>
                </div>
              )}
              {(detailModal === 'connections' || detailModal === 'processes') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Active Connections</p><h3 className="text-2xl font-bold">{stats.active_connections}</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Running Processes</p><h3 className="text-2xl font-bold">{stats.process_count}</h3></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Packets Sent</p><h3 className="text-lg font-bold font-mono">{stats.network.packets_sent.toLocaleString()}</h3></div>
                    <div className="p-4 rounded-lg glass border-white/5"><p className="text-xs text-muted-foreground">Packets Received</p><h3 className="text-lg font-bold font-mono">{stats.network.packets_recv.toLocaleString()}</h3></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
