import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Binary,
  Cpu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  HardDrive,
  Box,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_URL } from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { Incident, IncidentSourceStat, IncidentStatsResponse } from '@/types';
import { cn } from '@/lib/utils';

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

interface AURIXDashboardProps {
  incidents: Incident[];
  refreshIncidents: () => Promise<unknown>;
  onOpenNotifications: () => void;
}

const emptyStats: IncidentStatsResponse = {
  total: 0,
  high: 0,
  medium: 0,
  low: 0,
  top_ips: [],
  top_processes: [],
  score_timeline: [],
};

const normalizeIncidentStats = (value: unknown): IncidentStatsResponse => {
  if (!value || typeof value !== 'object') return emptyStats;
  const input = value as Partial<IncidentStatsResponse>;
  return {
    total: typeof input.total === 'number' ? input.total : 0,
    high: typeof input.high === 'number' ? input.high : 0,
    medium: typeof input.medium === 'number' ? input.medium : 0,
    low: typeof input.low === 'number' ? input.low : 0,
    top_ips: Array.isArray(input.top_ips) ? input.top_ips : [],
    top_processes: Array.isArray(input.top_processes) ? input.top_processes : [],
    score_timeline: Array.isArray(input.score_timeline) ? input.score_timeline : [],
  };
};

const getScoreBand = (score: number) => {
  if (score > 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const getIncidentDate = (incident: Incident) => {
  if (incident.log?.datetime) {
    const raw = incident.log.datetime;
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(raw);
    return new Date(hasTimezone ? raw : `${raw}Z`);
  }

  return new Date(incident.timestamp * 1000);
};

const getSourceIP = (incident: Incident) =>
  String(incident.log?.source_ip || incident.log?.device || incident.log?.dest_ip || 'unknown');

const getProcessName = (incident: Incident) =>
  String(
    incident.log?.process_name ||
      incident.log?.filepath ||
      incident.alert ||
      incident.log?.action ||
      'system'
  );

const getActionTaken = (incident: Incident) => {
  const rawAction = String(incident.action || incident.log?.action || '').toLowerCase();
  if (incident.risk_score > 70 || rawAction.includes('block')) return 'block_ip';
  if (incident.risk_score >= 40 || rawAction.includes('warn') || rawAction.includes('flag')) return 'flag_session';
  return 'monitor';
};

const getRelativeTime = (timestamp: Date) => {
  const diffMs = Date.now() - timestamp.getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const formatChartTime = (timestamp: string) =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const getUptime = (bootTime?: number) => {
  if (!bootTime) return '--';
  const totalSeconds = Math.max(0, Math.floor(Date.now() / 1000 - bootTime));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const AURIXDashboard: React.FC<AURIXDashboardProps> = ({
  incidents,
  refreshIncidents,
  onOpenNotifications,
}) => {
  const { data: systemStats, lastUpdated: systemLastUpdated, refresh: refreshSystemStats } = usePolling<SystemStats>(
    async () => {
      const res = await fetch(`${API_URL}/system/stats`);
      if (!res.ok) throw new Error('Failed to load system stats');
      return res.json();
    },
    3000
  );

  const { data: incidentStats = emptyStats, refresh: refreshIncidentStats } = usePolling<IncidentStatsResponse>(
    async () => {
      const res = await fetch(`${API_URL}/incidents/stats`);
      if (!res.ok) throw new Error('Failed to load incident stats');
      return res.json();
    },
    5000,
    { initialData: emptyStats }
  );

  const { data: sourceStats = emptyStats } = usePolling<IncidentStatsResponse>(
    async () => {
      const res = await fetch(`${API_URL}/incidents/stats`);
      if (!res.ok) throw new Error('Failed to load source stats');
      return res.json();
    },
    10000,
    { initialData: emptyStats }
  );

  const safeIncidentStats = normalizeIncidentStats(incidentStats);
  const safeSourceStats = normalizeIncidentStats(sourceStats);

  const feedItems = useMemo(() => incidents.slice(0, 20), [incidents]);

  const logsAnalyzedToday = useMemo(() => {
    const today = new Date().toDateString();
    return incidents.filter((incident) => getIncidentDate(incident).toDateString() === today).length;
  }, [incidents]);

  const timelineData = useMemo(
    () =>
      safeIncidentStats.score_timeline.map((point) => ({
        label: formatChartTime(point.timestamp),
        score: point.score,
      })),
    [safeIncidentStats.score_timeline]
  );

  const distributionData = useMemo(
    () => [
      { name: 'HIGH', value: safeIncidentStats.high, color: '#ef4444' },
      { name: 'MEDIUM', value: safeIncidentStats.medium, color: '#eab308' },
      { name: 'LOW', value: safeIncidentStats.low, color: '#10b981' },
    ],
    [safeIncidentStats.high, safeIncidentStats.low, safeIncidentStats.medium]
  );

  const topIpData = useMemo(() => safeSourceStats.top_ips ?? [], [safeSourceStats.top_ips]);
  const maxProcessCount = useMemo(
    () => Math.max(...safeIncidentStats.top_processes.map((process) => process.count), 1),
    [safeIncidentStats.top_processes]
  );

  const lastSyncLabel = systemLastUpdated
    ? new Date(systemLastUpdated).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  const handleRefresh = async () => {
    await Promise.all([refreshIncidents(), refreshIncidentStats(), refreshSystemStats()]);
  };

  const statsCards = [
    {
      title: 'Active Threats',
      value: safeIncidentStats.high,
      icon: ShieldAlert,
      accent: 'text-red-500',
      note: systemStats ? `${systemStats.active_connections} live connections monitored` : 'Awaiting telemetry',
      onClick: onOpenNotifications,
    },
    {
      title: 'Warnings',
      value: safeIncidentStats.medium,
      icon: TriangleAlert,
      accent: 'text-yellow-500',
      note: systemStats ? `${systemStats.cpu_percent.toFixed(0)}% CPU on host sensor` : 'Threshold watch active',
    },
    {
      title: 'Systems Normal',
      value: safeIncidentStats.low,
      icon: ShieldCheck,
      accent: 'text-emerald-500',
      note: systemStats ? `${systemStats.process_count} processes under watch` : 'Behavior baseline steady',
    },
    {
      title: 'Logs Analyzed Today',
      value: logsAnalyzedToday,
      icon: Activity,
      accent: 'text-primary',
      note: `SOC sync ${lastSyncLabel}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="glass border-white/5 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] tracking-[0.22em] uppercase">
                    AURIX SOC
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.22em] border-emerald-500/20 text-emerald-400">
                    Live Attack Detection
                  </Badge>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Live Threat Monitor</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Real-time anomaly intelligence across endpoint, network, and API activity streams.
                    AURIX continuously scores suspicious behavior and surfaces the highest-risk events first.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Host Sensor
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span>{systemStats ? `${systemStats.cpu_percent.toFixed(0)}% CPU` : '--'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Memory
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>{systemStats ? `${systemStats.memory.percent.toFixed(0)}% RAM` : '--'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    Last Sync
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>{lastSyncLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="lg"
                  className="rounded-2xl border-white/10 bg-white/[0.03] px-5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Live Data</span>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Dashboard is showing only live backend telemetry and stored incidents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="w-4 h-4 text-primary" />
              Real Host Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/5 p-2 text-primary">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">CPU Usage</p>
                  <p className="text-[11px] text-muted-foreground">Real-time host load</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-black">{systemStats ? `${systemStats.cpu_percent.toFixed(0)}%` : '--'}</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/5 p-2 text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Memory</p>
                  <p className="text-[11px] text-muted-foreground">Used vs total RAM</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-black">
                {systemStats ? `${systemStats.memory.used_gb.toFixed(1)} / ${systemStats.memory.total_gb.toFixed(1)} GB` : '--'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/5 p-2 text-yellow-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Disk Usage</p>
                  <p className="text-[11px] text-muted-foreground">Primary drive pressure</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-black">{systemStats ? `${systemStats.disk.percent.toFixed(0)}%` : '--'}</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/5 p-2 text-primary">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Processes</p>
                  <p className="text-[11px] text-muted-foreground">Running on this host</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-black">{systemStats ? systemStats.process_count : '--'}</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Connections + Uptime</p>
                  <p className="text-[11px] text-muted-foreground">Directly from `/system/stats`</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black">{systemStats ? systemStats.active_connections : '--'} live connections</p>
                  <p className="text-xs text-muted-foreground">Uptime {getUptime(systemStats?.boot_time)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card
              className={cn(
                'glass border-white/5 transition-all hover:border-primary/20',
                card.onClick && 'cursor-pointer'
              )}
              onClick={card.onClick}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                      {card.title}
                    </p>
                    <h3 className="mt-3 text-4xl font-black tracking-tight">{card.value}</h3>
                  </div>
                  <div className={cn('rounded-2xl bg-white/5 p-3', card.accent)}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-5 border-t border-white/5 pt-4 text-xs text-muted-foreground">
                  {card.note}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="glass border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Live Threat Feed</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last 20 incidents with anomaly scoring and automated action hints.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Polling 5s
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[560px] overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {feedItems.map((incident) => {
                  const scoreBand = getScoreBand(incident.risk_score);
                  const incidentDate = getIncidentDate(incident);
                  const actionTaken = getActionTaken(incident);

                  return (
                    <motion.div
                      key={`${incident.timestamp}-${incident.risk_score}-${getSourceIP(incident)}`}
                      layout
                      initial={{ opacity: 0, y: -18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'rounded-2xl border p-4',
                        scoreBand === 'high'
                          ? 'border-red-500/25 bg-red-500/[0.08] shadow-[0_0_32px_rgba(239,68,68,0.14)] animate-pulse'
                          : scoreBand === 'medium'
                            ? 'border-yellow-500/20 bg-yellow-500/[0.05]'
                            : 'border-emerald-500/15 bg-emerald-500/[0.04]'
                      )}
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={cn(
                                  'font-mono text-[10px] uppercase tracking-[0.22em]',
                                  scoreBand === 'high'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : scoreBand === 'medium'
                                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                )}
                              >
                                {scoreBand}
                              </Badge>
                              <span className="text-sm font-semibold">{incident.alert || 'Threat telemetry event'}</span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {incident.message || 'Behavioral anomaly correlated with live telemetry.'}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                              {getRelativeTime(incidentDate)}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {incidentDate.toLocaleTimeString('en-US', {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl bg-black/20 px-3 py-3">
                            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                              Source IP
                            </p>
                            <p className="mt-2 break-all font-mono text-sm text-foreground">{getSourceIP(incident)}</p>
                          </div>

                          <div className="rounded-xl bg-black/20 px-3 py-3">
                            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                              Process
                            </p>
                            <p className="mt-2 break-words text-sm text-foreground">{getProcessName(incident)}</p>
                          </div>

                          <div className="rounded-xl bg-black/20 px-3 py-3">
                            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                              Action Taken
                            </p>
                            <p className="mt-2 font-mono text-sm text-foreground">{actionTaken}</p>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                            <span>AI anomaly score</span>
                            <span>{incident.risk_score}/100</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                scoreBand === 'high'
                                  ? 'bg-red-500'
                                  : scoreBand === 'medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-emerald-500'
                              )}
                              style={{ width: `${incident.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {feedItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                  <ShieldCheck className="mx-auto mb-4 w-10 h-10 text-emerald-400/70" />
                  <p className="text-base font-semibold">No incidents yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Waiting for real incidents from the backend telemetry pipeline.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Threat Score Timeline</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Live anomaly curve across the latest 20 analyzed events.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Polling 5s
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[560px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="threatScoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.55} />
                    <stop offset="45%" stopColor="#f59e0b" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={18}
                  stroke="rgba(255,255,255,0.35)"
                  fontSize={10}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  stroke="rgba(255,255,255,0.35)"
                  fontSize={10}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: 'rgba(7,7,11,0.95)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                  }}
                />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="6 6" label={{ value: 'Danger', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="6 6" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#00f2ff"
                  strokeWidth={2.5}
                  fill="url(#threatScoreGradient)"
                  dot={{ r: 2, fill: '#00f2ff', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#fff', stroke: '#00f2ff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Attack Sources</CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Polling 10s
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[340px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIpData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="source_ip" tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.35)" fontSize={10} />
                <YAxis tickLine={false} axisLine={false} stroke="rgba(255,255,255,0.35)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7,7,11,0.95)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                  }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {topIpData.map((entry: IncidentSourceStat, index: number) => (
                    <Cell
                      key={`${entry.source_ip}-${index}`}
                      fill={entry.max_score > 70 ? '#ef4444' : entry.max_score >= 40 ? '#f59e0b' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Threat Distribution</CardTitle>
          </CardHeader>
          <CardContent className="relative h-[340px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={76}
                  outerRadius={112}
                  paddingAngle={3}
                  stroke="rgba(10,10,10,0.6)"
                  strokeWidth={3}
                >
                  {distributionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7,7,11,0.95)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                Total Incidents
              </p>
              <p className="mt-2 text-4xl font-black">{safeIncidentStats.total}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {distributionData.map((entry) => (
                <div key={entry.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    {entry.name}
                  </p>
                  <p className="mt-2 text-xl font-bold" style={{ color: entry.color }}>
                    {entry.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Top Suspicious Processes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {safeIncidentStats.top_processes.length > 0 ? (
              safeIncidentStats.top_processes.map((process, index) => (
                <div key={`${process.process_name}-${index}`} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-xl bg-white/5 p-2 text-primary">
                        <Binary className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{process.process_name}</p>
                        <p className="text-[11px] text-muted-foreground">{process.count} time(s) observed</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-red-500"
                      style={{ width: `${(process.count / maxProcessCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                <AlertTriangle className="mx-auto mb-4 w-10 h-10 text-yellow-400/60" />
                <p className="text-base font-semibold">No suspicious processes ranked yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Process frequency will appear here as incidents accumulate.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
