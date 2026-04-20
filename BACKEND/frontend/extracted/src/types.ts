export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Threat {
  id: string;
  type: string;
  severity: Severity;
  timestamp: string;
  status: 'active' | 'mitigated' | 'ignored' | 'resolved';
  description: string;
  source: string;
}

export interface ActivityLog {
  id: string;
  event: string;
  timestamp: string;
  user?: string;
  details: string;
  type: 'security' | 'system' | 'user';
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  network: number;
  uptime: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface IncidentLog {
  source_ip?: string;
  dest_ip?: string;
  process_name?: string;
  datetime?: string;
  action?: string;
  device?: string;
  filepath?: string;
  protocol?: string;
  port?: number;
  type?: string;
  cpu_usage?: number;
  memory_usage?: number;
  [key: string]: unknown;
}

export interface Incident {
  risk_score: number;
  severity?: string;
  action?: string;
  alert?: string;
  message?: string;
  log: IncidentLog;
  timestamp: number;
}

export interface IncidentSourceStat {
  source_ip: string;
  count: number;
  max_score: number;
  severity: 'high' | 'medium' | 'low';
}

export interface IncidentProcessStat {
  process_name: string;
  count: number;
}

export interface IncidentTimelinePoint {
  timestamp: string;
  score: number;
}

export interface IncidentStatsResponse {
  total: number;
  high: number;
  medium: number;
  low: number;
  top_ips: IncidentSourceStat[];
  top_processes: IncidentProcessStat[];
  score_timeline: IncidentTimelinePoint[];
}

export interface AURIXAlert {
  id: string;
  title: string;
  description: string;
  sourceIP: string;
  processName: string;
  createdAt: number;
  type: 'error';
}

export type RecycleBinItem = 
  | { type: 'threat'; data: Threat; deletedAt: string }
  | { type: 'log'; data: ActivityLog; deletedAt: string }
  | { type: 'notification'; data: any; deletedAt: string };
