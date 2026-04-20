import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Monitor, Wifi, WifiOff, Cpu, HardDrive, Box, ChevronRight,
  X, RefreshCw, Shield, AlertTriangle, CheckCircle2, Download,
  Users, Activity, Globe, Clock, Package, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface DeviceInfo {
  device_id: string;
  hostname: string;
  ip: string;
  os: string;
  os_version?: string;
  username?: string;
  architecture?: string;
}

interface DeviceTelemetry {
  cpu?: { percent: number; cores: number; freq_mhz: number };
  memory?: { total_gb: number; used_gb: number; percent: number };
  disk?: { total_gb: number; used_gb: number; percent: number };
  network?: { bytes_sent: number; bytes_recv: number };
  process_count?: number;
  active_connections?: { local: string; remote: string; status: string }[];
  processes?: { pid: number; name: string; cpu: number; ram: number; status: string }[];
}

interface AgentDevice {
  device_id: string;
  info: DeviceInfo;
  status: 'online' | 'offline';
  last_seen: number;
  last_seen_ago: number;
  telemetry: DeviceTelemetry;
  apps_count: number;
}

interface DeviceDetail extends AgentDevice {
  apps: { name: string; version: string; publisher: string }[];
  remote_threats?: { name: string; file_path: string; severity: string; description: string }[];
}


// ─── Device Card ──────────────────────────────────────────────────────────────
const DeviceCard: React.FC<{ device: AgentDevice; onClick: () => void }> = ({ device, onClick }) => {
  const cpu = device.telemetry?.cpu?.percent ?? 0;
  const ram = device.telemetry?.memory?.percent ?? 0;
  const disk = device.telemetry?.disk?.percent ?? 0;
  const isOnline = device.status === 'online';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={cn(
        "glass border transition-all duration-300 hover:border-primary/30",
        isOnline ? "border-emerald-500/20" : "border-white/5"
      )}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isOnline ? "bg-emerald-500/10" : "bg-white/5"
              )}>
                <Monitor className={cn("w-5 h-5", isOnline ? "text-emerald-500" : "text-muted-foreground")} />
              </div>
              <div>
                <h3 className="font-bold text-sm">{device.info.hostname}</h3>
                <p className="text-[10px] font-mono text-muted-foreground">{device.info.ip}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500/50")} />
              <span className={cn("text-[10px] font-mono uppercase font-bold", isOnline ? "text-emerald-500" : "text-red-500/70")}>
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* OS / User */}
          <div className="text-[10px] font-mono text-muted-foreground mb-4 space-y-0.5">
            <div>{device.info.os}</div>
            <div>User: {device.info.username || 'unknown'}</div>
            <div>
              {isOnline
                ? `Last heartbeat: ${device.last_seen_ago}s ago`
                : `Offline · Last seen: ${Math.round(device.last_seen_ago / 60)}m ago`}
            </div>
          </div>

          {/* Mini Metrics */}
          {isOnline && (
            <div className="space-y-2">
              <MetricBar label="CPU" value={cpu} color="bg-cyan-500" />
              <MetricBar label="RAM" value={ram} color="bg-purple-500" />
              <MetricBar label="Disk" value={disk} color="bg-amber-500" />
            </div>
          )}

          {/* Footer Stats & Behavior */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
              <span><Package className="w-3 h-3 inline mr-1" />{device.apps_count} apps</span>
              <span><Activity className="w-3 h-3 inline mr-1" />
                {device.telemetry?.inputs?.anomalous 
                  ? <span className="text-red-400 font-bold uppercase tracking-wider animate-pulse">Suspicious</span>
                  : <span className="text-emerald-400 uppercase">Normal</span>}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-mono text-muted-foreground w-8">{label}</span>
    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
    <span className="text-[10px] font-mono text-foreground w-8 text-right">{value}%</span>
  </div>
);

// ─── Device Detail Panel ──────────────────────────────────────────────────────
const DeviceDetailPanel: React.FC<{ deviceId: string; onClose: () => void }> = ({ deviceId, onClose }) => {
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [tab, setTab] = useState<'overview' | 'processes' | 'connections' | 'apps'>('overview');
  const [appSearch, setAppSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const triggerScan = async () => {
    setIsScanning(true);
    try {
      await fetch(`${API_URL}/admin/device/${deviceId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'scan' })
      });
      // Simulate scan duration for UI effect
      setTimeout(() => setIsScanning(false), 5000);
    } catch {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/device/${deviceId}`);
        if (res.ok) setDetail(await res.json());
      } catch {}
    };
    fetch_();
    const interval = setInterval(fetch_, 4000);
    return () => clearInterval(interval);
  }, [deviceId]);

  if (!detail) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading device...
    </div>
  );

  const t = detail.telemetry;
  const isOnline = detail.status === 'online';
  const filteredApps = detail.apps.filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="p-2 rounded-lg glass border-white/10 hover:border-primary/30 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{detail.info.hostname}</h2>
            <Badge className={cn("font-mono text-[10px]", isOnline ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/10 text-red-500 border-red-500/30")}>
              {isOnline ? "● ONLINE" : "○ OFFLINE"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{detail.info.ip} · {detail.info.os} · {detail.info.username}</p>
        </div>
        <button
          onClick={triggerScan}
          disabled={!isOnline || isScanning}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
            isScanning ? "bg-primary/20 text-primary animate-pulse" : "bg-primary text-primary-foreground hover:bg-primary/90",
            !isOnline && "opacity-50 cursor-not-allowed"
          )}
        >
          {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {isScanning ? 'SCANNING REMOTE SYSTEM...' : 'TRIGGER REMOTE SCAN'}
        </button>
      </div>

      {/* Behavioral Analytics */}
      {t?.inputs && (
        <Card className={cn("border-t-4", t.inputs.anomalous ? "border-t-red-500 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-t-primary bg-primary/5")}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between text-muted-foreground uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Behavioral Analytics (Live)
              </span>
              {t.inputs.anomalous && (
                <Badge className="bg-red-500 text-white font-bold animate-pulse uppercase tracking-wider">
                  ⚠️ BOT / SCRIPT DETECTED
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pb-4">
            <div className="flex flex-col items-center justify-center p-4 glass rounded bg-black/20">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-2">Typing Speed</span>
              <div className="flex items-end gap-2">
                <span className={cn("text-3xl font-bold font-mono", t.inputs.kpm > 600 ? "text-red-400" : "text-emerald-400")}>
                  {t.inputs.kpm}
                </span>
                <span className="text-xs text-muted-foreground mb-1">KPM</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-4 glass rounded bg-black/20">
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-2">Cursor Activity</span>
              <div className="flex items-end gap-2">
                <span className={cn("text-3xl font-bold font-mono", t.inputs.cpm > 8000 ? "text-red-400" : "text-emerald-400")}>
                  {t.inputs.cpm}
                </span>
                <span className="text-xs text-muted-foreground mb-1">CPM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {detail.remote_threats && detail.remote_threats.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5 mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-red-500 text-sm flex items-center gap-2 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4" /> Malware History on Device
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.remote_threats.map((threat: any, idx) => (
              <div key={idx} className={cn(
                "flex justify-between items-center p-3 glass rounded-lg border",
                threat.status === 'deleted' ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/20"
              )}>
                <div>
                  <h4 className={cn("font-bold font-mono text-sm", threat.status === 'deleted' ? 'text-emerald-400' : 'text-red-400')}>{threat.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{threat.description}</p>
                </div>
                <div className="text-right">
                  <Badge className={cn(
                    "hover:bg-opacity-20",
                    threat.status === 'deleted' ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50" : "bg-red-500/20 text-red-500"
                  )}>
                    {threat.status === 'deleted' ? 'DELETED' : threat.severity}
                  </Badge>
                  <p className={cn(
                    "text-[10px] font-mono mt-2 truncate w-48",
                    threat.status === 'deleted' ? "text-emerald-500/80 line-through" : "text-muted-foreground"
                  )} title={threat.file_path}>
                    {threat.file_path}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-3">
        {(['overview', 'processes', 'connections', 'apps'] as const).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all",
              tab === tabId ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tabId}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'CPU', value: `${t?.cpu?.percent ?? 0}%`, sub: `${t?.cpu?.cores ?? '--'} cores`, color: 'text-cyan-500' },
              { label: 'RAM', value: `${t?.memory?.percent ?? 0}%`, sub: `${t?.memory?.used_gb ?? 0} / ${t?.memory?.total_gb ?? 0} GB`, color: 'text-purple-500' },
              { label: 'Disk', value: `${t?.disk?.percent ?? 0}%`, sub: `${t?.disk?.used_gb ?? 0} / ${t?.disk?.total_gb ?? 0} GB`, color: 'text-amber-500' },
              { label: 'Processes', value: `${t?.process_count ?? 0}`, sub: `${t?.active_connections?.length ?? 0} connections`, color: 'text-emerald-500' },
            ].map(m => (
              <Card key={m.label} className="glass border-white/5">
                <CardContent className="p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <h3 className={cn("text-2xl font-bold mt-1", m.color)}>{m.value}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{m.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="glass border-white/5">
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Device Info</h4>
              {[
                ['Architecture', detail.info.architecture],
                ['Python Version', detail.info.python_version],
                ['OS Version', detail.info.os_version],
                ['Registered At', detail.info.registered_at],
                ['Apps Detected', detail.apps_count],
              ].map(([key, val]) => val ? (
                <div key={String(key)} className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-mono text-xs">{String(val)}</span>
                </div>
              ) : null)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processes Tab */}
      {tab === 'processes' && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            <span>PID</span><span>Name</span><span>CPU%</span><span>RAM%</span><span>Status</span>
          </div>
          {(t?.processes ?? []).map((p, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 px-3 py-2 glass rounded-lg border-white/5 text-xs font-mono hover:border-primary/20 transition-all">
              <span className="text-muted-foreground">{p.pid}</span>
              <span className="truncate">{p.name}</span>
              <span className={p.cpu > 50 ? 'text-red-400' : p.cpu > 20 ? 'text-amber-400' : 'text-emerald-400'}>{p.cpu}%</span>
              <span className="text-purple-400">{p.ram}%</span>
              <span className="text-muted-foreground">{p.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Connections Tab */}
      {tab === 'connections' && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 px-3 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            <span>Local</span><span>Remote</span><span>Status</span>
          </div>
          {(t?.active_connections ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No active connections</div>
          ) : (
            (t?.active_connections ?? []).map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2 glass rounded-lg border-white/5 text-xs font-mono">
                <span className="text-cyan-400 truncate">{c.local}</span>
                <span className="truncate">{c.remote}</span>
                <span className="text-emerald-400">{c.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Apps Tab */}
      {tab === 'apps' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search apps..."
            value={appSearch}
            onChange={e => setAppSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all font-mono"
          />
          <div className="max-h-[450px] overflow-y-auto space-y-1">
            {filteredApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {detail.apps.length === 0 ? 'Apps not yet loaded from device...' : 'No apps match search'}
              </div>
            ) : (
              filteredApps.map((app, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 glass rounded-lg border-white/5 hover:border-primary/20 transition-all">
                  <div>
                    <p className="text-xs font-medium">{app.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{app.publisher || 'Unknown'}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{app.version || 'N/A'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export const AdminPanel: React.FC = () => {
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [online, setOnline] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'observing'>('all');

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/devices`);
        if (!res.ok) return;
        const data = await res.json();
        setDevices(data.devices || []);
        setTotal(data.total || 0);
        setOnline(data.online || 0);
        setLastUpdated(new Date());
      } catch {}
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  if (selectedDevice) {
    return (
      <div className="space-y-6">
        <DeviceDetailPanel deviceId={selectedDevice} onClose={() => setSelectedDevice(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-7 h-7 text-primary" />
            Admin Panel
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Centralized monitoring of all connected devices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] font-mono text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono">
            {online} ONLINE
          </Badge>
          <Badge className="bg-white/5 text-muted-foreground border-white/10 font-mono">
            {total} TOTAL
          </Badge>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Connected Devices', value: online, icon: Monitor, color: 'text-emerald-500' },
          { label: 'Total Registered', value: total, icon: Globe, color: 'text-primary' },
          { label: 'Offline', value: total - online, icon: WifiOff, color: 'text-red-500' },
        ].map(s => (
          <Card key={s.label} className="glass border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("p-2 rounded-lg bg-white/5", s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <h3 className="text-2xl font-bold">{s.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Setup Instructions */}
      <Card className="glass border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> How to Add a Device
          </h4>
          <div className="space-y-2 text-xs font-mono text-muted-foreground">
            <p>1. Copy <span className="text-foreground">agent.py</span> to the target device</p>
            <p>2. Install dependencies: <span className="text-cyan-400">pip install psutil httpx</span></p>
            <p>3. Run the agent pointing to this server:</p>
            <div className="bg-black/50 rounded-lg p-3 mt-2 border border-white/10">
              <span className="text-emerald-400">python agent.py --server {API_URL}</span>
            </div>
            <p className="mt-2 text-emerald-400">↑ The device will appear here automatically within 10 seconds.</p>
          </div>
        </CardContent>
      </Card>

      {/* Device View Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-3 pt-2">
        {(['all', 'normal', 'observing'] as const).map(tabId => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all",
              activeTab === tabId 
                ? (tabId === 'observing' ? "bg-red-500/10 text-red-500 border border-red-500/30" : "bg-primary/10 text-primary border border-primary/20")
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            {tabId === 'observing' ? 'Suspicious (Observing)' : tabId}
          </button>
        ))}
      </div>

      {/* Device Grid */}
      {devices.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
          <Monitor className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-mono text-sm">No devices connected yet.</p>
          <p className="text-muted-foreground/50 font-mono text-xs mt-2">Run agent.py on any device to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {devices.filter(d => {
              if (activeTab === 'all') return true;
              const isAnomalous = d.telemetry?.inputs?.anomalous === true;
              if (activeTab === 'normal') return !isAnomalous;
              if (activeTab === 'observing') return isAnomalous;
              return true;
            }).map(device => (
              <DeviceCard
                key={device.device_id}
                device={device}
                onClick={() => setSelectedDevice(device.device_id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
