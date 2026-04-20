import { Threat, ActivityLog, SystemHealth } from './types';

export const mockThreats: Threat[] = [
  {
    id: 'T-1001',
    type: 'SQL Injection Attempt',
    severity: 'high',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'active',
    description: 'Multiple suspicious queries detected on endpoint /api/v1/users',
    source: '192.168.1.45',
  },
  {
    id: 'T-1002',
    type: 'Brute Force Attack',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'mitigated',
    description: 'Failed login attempts exceeded threshold (50+ attempts in 5 mins)',
    source: '45.12.34.89',
  },
  {
    id: 'T-1003',
    type: 'Anomalous Data Export',
    severity: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'ignored',
    description: 'Large data transfer detected from internal server to external IP',
    source: '10.0.0.12',
  },
  {
    id: 'T-1004',
    type: 'Malware Signature Detected',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    status: 'active',
    description: 'Known malware signature "Trojan.Generic" found in temp directory',
    source: 'System-Local',
  },
];

export const mockLogs: ActivityLog[] = [
  {
    id: 'L-001',
    event: 'System Scan Completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    details: 'Full system scan completed. 0 new threats found.',
    type: 'system',
  },
  {
    id: 'L-002',
    event: 'User Login',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    user: 'admin_user',
    details: 'Successful login from recognized device.',
    type: 'user',
  },
  {
    id: 'L-003',
    event: 'Firewall Rule Updated',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    user: 'system',
    details: 'Blocked IP 45.12.34.89 due to brute force detection.',
    type: 'security',
  },
];

export const mockHealth: SystemHealth = {
  cpu: 42,
  memory: 68,
  network: 15,
  uptime: '15d 4h 22m',
};
