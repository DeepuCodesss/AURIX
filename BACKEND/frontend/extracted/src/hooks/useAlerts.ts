import { useEffect, useRef, useState } from 'react';
import { AURIXAlert, Incident } from '@/types';

const DEFAULT_TITLE = 'AURIX Dashboard';

const buildIncidentKey = (incident: Incident) => {
  const sourceIP = String(incident.log?.source_ip || incident.log?.device || 'unknown');
  const processName = String(
    incident.log?.process_name ||
      incident.log?.filepath ||
      incident.alert ||
      incident.log?.action ||
      'system'
  );

  return `${incident.timestamp}-${sourceIP}-${processName}-${incident.risk_score}`;
};

export function useAlerts(incidents: Incident[]) {
  const [alerts, setAlerts] = useState<AURIXAlert[]>([]);
  const seenThreatsRef = useRef<Set<string>>(new Set());
  const timeoutIdsRef = useRef<Map<string, number>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  const dismissAlert = (id: string) => {
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }

    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  useEffect(() => {
    const hasHighThreat = incidents.some((incident) => incident.risk_score > 70);
    document.title = hasHighThreat ? '🚨 ALERT — AURIX' : DEFAULT_TITLE;

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [incidents]);

  useEffect(() => {
    const playBeep = async () => {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const startAt = audioContextRef.current.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, startAt);
      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.3);
    };

    const highThreats = incidents.filter((incident) => incident.risk_score > 70);
    if (highThreats.length === 0) return;

    highThreats.forEach((incident) => {
      const incidentKey = buildIncidentKey(incident);
      if (seenThreatsRef.current.has(incidentKey)) {
        return;
      }

      seenThreatsRef.current.add(incidentKey);

      const sourceIP = String(incident.log?.source_ip || incident.log?.device || 'unknown');
      const processName = String(
        incident.log?.process_name ||
          incident.log?.filepath ||
          incident.alert ||
          incident.log?.action ||
          'system'
      );
      const alert: AURIXAlert = {
        id: incidentKey,
        title: 'HIGH THREAT DETECTED',
        description: `${sourceIP} • ${processName}`,
        sourceIP,
        processName,
        createdAt: Date.now(),
        type: 'error',
      };

      setAlerts((current) => [alert, ...current].slice(0, 8));
      void playBeep();

      const timeoutId = window.setTimeout(() => {
        dismissAlert(alert.id);
      }, 5000);

      timeoutIdsRef.current.set(alert.id, timeoutId);
    });
  }, [incidents]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
      void audioContextRef.current?.close();
    };
  }, []);

  return {
    alerts,
    dismissAlert,
  };
}
