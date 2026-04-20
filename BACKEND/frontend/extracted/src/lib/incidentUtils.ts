import { Incident, IncidentStatsResponse, Severity } from '@/types';

export const isSystemMetricIncident = (incident: Incident) => incident.log?.action === 'system_metric';
export const isRemoteScanIncident = (incident: Incident) => incident.log?.type === 'remote_scan';

export const getDisplaySeverity = (incident: Incident): Severity => {
  if (isRemoteScanIncident(incident)) {
    return incident.risk_score >= 90 ? 'critical' : 'high';
  }

  if (isSystemMetricIncident(incident)) {
    if (incident.risk_score >= 95) return 'critical';
    return 'low';
  }

  if (incident.risk_score >= 90) return 'critical';
  if (incident.risk_score > 70) return 'high';
  if (incident.risk_score >= 40) return 'medium';
  return 'low';
};

export const getDisplayScore = (incident: Incident) => {
  if (isRemoteScanIncident(incident)) {
    return Math.max(incident.risk_score, 75);
  }

  if (isSystemMetricIncident(incident) && incident.risk_score < 95) {
    return Math.min(incident.risk_score, 25);
  }

  return incident.risk_score;
};

export const isHighPriorityIncident = (incident: Incident) => {
  const severity = getDisplaySeverity(incident);
  return severity === 'high' || severity === 'critical';
};

export const getIncidentTimestamp = (incident: Incident) =>
  incident.log?.datetime || new Date(incident.timestamp * 1000).toISOString();

export const getIncidentSource = (incident: Incident) =>
  String(incident.log?.source_ip || incident.log?.device || incident.log?.dest_ip || 'unknown');

export const getIncidentProcess = (incident: Incident) =>
  String(
    incident.log?.process_name ||
      incident.log?.filepath ||
      incident.alert ||
      incident.log?.action ||
      'system'
  );

export const getIncidentAction = (incident: Incident) => {
  if (isSystemMetricIncident(incident) && !isRemoteScanIncident(incident)) {
    return 'monitor';
  }

  const rawAction = String(incident.action || incident.log?.action || '').toLowerCase();
  if (rawAction.includes('block')) return 'block_ip';
  if (rawAction.includes('warn') || rawAction.includes('flag')) return 'flag_session';

  return isHighPriorityIncident(incident) ? 'block_ip' : 'monitor';
};

export const buildIncidentStatsFromList = (incidents: Incident[]): IncidentStatsResponse => {
  const recentIncidents = incidents.slice(0, 50);
  const ipCounts = new Map<string, { count: number; maxScore: number }>();
  const processCounts = new Map<string, number>();

  let high = 0;
  let medium = 0;
  let low = 0;

  recentIncidents.forEach((incident) => {
    const severity = getDisplaySeverity(incident);
    if (severity === 'critical' || severity === 'high') {
      high += 1;
    } else if (severity === 'medium') {
      medium += 1;
    } else {
      low += 1;
    }

    const source = getIncidentSource(incident);
    const score = getDisplayScore(incident);
    const existingSource = ipCounts.get(source) || { count: 0, maxScore: 0 };
    ipCounts.set(source, {
      count: existingSource.count + 1,
      maxScore: Math.max(existingSource.maxScore, score),
    });

    const process = getIncidentProcess(incident);
    processCounts.set(process, (processCounts.get(process) || 0) + 1);
  });

  const top_ips = [...ipCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([source_ip, info]) => ({
      source_ip,
      count: info.count,
      max_score: info.maxScore,
      severity:
        info.maxScore > 70 ? 'high' : info.maxScore >= 40 ? 'medium' : 'low',
    }));

  const top_processes = [...processCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([process_name, count]) => ({
      process_name,
      count,
    }));

  const score_timeline = [...recentIncidents]
    .reverse()
    .slice(-20)
    .map((incident) => ({
      timestamp: getIncidentTimestamp(incident),
      score: getDisplayScore(incident),
    }));

  return {
    total: recentIncidents.length,
    high,
    medium,
    low,
    top_ips,
    top_processes,
    score_timeline,
  };
};
