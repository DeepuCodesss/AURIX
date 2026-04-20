import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { AURIXDashboard } from './components/dashboard/AURIXDashboard';
import { AURIXAlerts } from './components/dashboard/AURIXAlerts';
import { ThreatAnalysis } from './components/dashboard/ThreatAnalysis';
import { ActivityLogs } from './components/dashboard/ActivityLogs';
import { ChatBot } from './components/dashboard/ChatBot';
import { Settings } from './components/dashboard/Settings';
import { RecycleBin } from './components/dashboard/RecycleBin';
import { AdminPanel } from './components/dashboard/AdminPanel';
import { SystemScanApps } from './components/dashboard/SystemScanApps';
import { Hero } from './components/landing/Hero';
import { Login } from './components/landing/Login';
import { SignUp } from './components/landing/SignUp';
import { API_URL } from '@/lib/api';
import { useAlerts } from '@/hooks/useAlerts';
import { usePolling } from '@/hooks/usePolling';
import { ActivityLog, Incident, RecycleBinItem, Severity, Threat } from './types';

const getIncidentTimestamp = (incident: Incident) =>
  incident.log?.datetime || new Date(incident.timestamp * 1000).toISOString();

const getIncidentSeverity = (incident: Incident): Severity => {
  if (incident.risk_score >= 90) return 'critical';
  if (incident.risk_score > 70) return 'high';
  if (incident.risk_score >= 40) return 'medium';
  return 'low';
};

const getIncidentSource = (incident: Incident) =>
  String(incident.log?.source_ip || incident.log?.device || incident.log?.dest_ip || 'unknown');

const getIncidentProcess = (incident: Incident) =>
  String(
    incident.log?.process_name ||
      incident.log?.filepath ||
      incident.alert ||
      incident.log?.action ||
      'system'
  );

const mapIncidentToThreat = (incident: Incident, index: number): Threat => {
  const severity = getIncidentSeverity(incident);
  const isHighThreat = incident.risk_score > 70;

  return {
    id: `threat-${incident.timestamp}-${index}`,
    type:
      (typeof incident.alert === 'string' ? incident.alert : null) ||
      (isHighThreat ? 'AI Detected Threat' : severity === 'medium' ? 'Warning Event' : 'Normal Activity'),
    severity,
    source: getIncidentSource(incident),
    status: isHighThreat ? 'active' : 'mitigated',
    timestamp: getIncidentTimestamp(incident),
    description:
      incident.message ||
      `Source ${getIncidentSource(incident)} triggered ${getIncidentProcess(incident)} with anomaly score ${incident.risk_score}.`,
  };
};

const mapIncidentToLog = (incident: Incident, index: number): ActivityLog => {
  const severity = getIncidentSeverity(incident);
  const isSystemMetric = incident.log?.action === 'system_metric';

  return {
    id: `log-${incident.timestamp}-${index}`,
    event:
      (typeof incident.alert === 'string' ? incident.alert : null) ||
      (isSystemMetric
        ? `System Telemetry — CPU ${incident.log?.cpu_usage ?? 0}% / RAM ${incident.log?.memory_usage ?? 0}%`
        : severity === 'high' || severity === 'critical'
          ? 'Security Incident Detected'
          : 'Telemetry Observation'),
    timestamp: getIncidentTimestamp(incident),
    details:
      incident.message ||
      `Source ${getIncidentSource(incident)} • Process ${getIncidentProcess(incident)} • Action ${incident.action || 'monitor'}`,
    type:
      severity === 'high' || severity === 'critical'
        ? 'security'
        : isSystemMetric
          ? 'system'
          : 'user',
    user: typeof incident.log?.user_id === 'string' ? incident.log.user_id : undefined,
  };
};

export default function App() {
  const [view, setView] = useState<'hero' | 'login' | 'signup' | 'dashboard'>('hero');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<{ email: string; password: string }[]>([
    { email: 'runtimerebel@gmail.com', password: '1234' },
  ]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>([]);

  const {
    data: liveIncidents = [],
    refresh: refreshIncidents,
  } = usePolling<Incident[]>(
    async () => {
      const res = await fetch(`${API_URL}/incidents`);
      if (!res.ok) throw new Error('Failed to fetch incidents');
      return res.json();
    },
    5000,
    {
      enabled: view === 'dashboard',
      initialData: [],
    }
  );

  useEffect(() => {
    setThreats(liveIncidents.map(mapIncidentToThreat));
    setLogs(liveIncidents.map(mapIncidentToLog));
  }, [liveIncidents]);

  const { alerts, dismissAlert } = useAlerts(view === 'dashboard' ? liveIncidents : []);

  const notifications = useMemo(
    () =>
      alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        description: `${alert.sourceIP} • ${alert.processName}`,
        type: alert.type,
        time: 'now',
      })),
    [alerts]
  );

  const handleLogout = () => {
    setView('hero');
    setActiveTab('dashboard');
    setIsNotificationsOpen(false);
  };

  const moveToBin = (type: 'threat' | 'log', data: Threat | ActivityLog) => {
    const newItem: RecycleBinItem = {
      type,
      data,
      deletedAt: new Date().toISOString(),
    };
    setRecycleBin((prev) => [newItem, ...prev]);

    if (type === 'threat') {
      setThreats((prev) => prev.filter((threat) => threat.id !== (data as Threat).id));
      return;
    }

    setLogs((prev) => prev.filter((log) => log.id !== (data as ActivityLog).id));
  };

  const restoreFromBin = (item: RecycleBinItem) => {
    if (item.type === 'threat') {
      setThreats((prev) => [item.data, ...prev]);
    } else if (item.type === 'log') {
      setLogs((prev) => [item.data, ...prev]);
    }

    setRecycleBin((prev) => prev.filter((entry) => entry !== item));
  };

  const permanentDelete = (id: string) => {
    setRecycleBin((prev) =>
      prev.filter((item) => {
        if (item.type === 'threat' || item.type === 'log') {
          return item.data.id !== id;
        }

        return true;
      })
    );
  };

  const emptyBin = () => setRecycleBin([]);

  const clearAllData = () => {
    const threatItems: RecycleBinItem[] = threats.map((threat) => ({
      type: 'threat',
      data: threat,
      deletedAt: new Date().toISOString(),
    }));
    const logItems: RecycleBinItem[] = logs.map((log) => ({
      type: 'log',
      data: log,
      deletedAt: new Date().toISOString(),
    }));

    setRecycleBin((prev) => [...threatItems, ...logItems, ...prev]);
    setThreats([]);
    setLogs([]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AURIXDashboard
            incidents={liveIncidents}
            refreshIncidents={refreshIncidents}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        );
      case 'threats':
        return <ThreatAnalysis threats={threats} setThreats={setThreats} onDelete={(threat) => moveToBin('threat', threat)} />;
      case 'logs':
        return <ActivityLogs logs={logs} onDelete={(log) => moveToBin('log', log)} />;
      case 'ai':
        return <ChatBot />;
      case 'settings':
        return <Settings onClearAll={clearAllData} />;
      case 'recycle':
        return (
          <RecycleBin
            items={recycleBin}
            onRestore={restoreFromBin}
            onPermanentDelete={permanentDelete}
            onEmpty={emptyBin}
          />
        );
      case 'admin':
        return <AdminPanel />;
      case 'system-scan':
        return <SystemScanApps />;
      default:
        return (
          <AURIXDashboard
            incidents={liveIncidents}
            refreshIncidents={refreshIncidents}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <AnimatePresence mode="wait">
        {view === 'hero' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Hero onEnter={() => setView('login')} />
          </motion.div>
        ) : view === 'login' ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Login
              onLogin={(email: string) => {
                setLoggedInEmail(email);
                setView('dashboard');
              }}
              onSignUp={() => setView('signup')}
              registeredUsers={registeredUsers}
            />
          </motion.div>
        ) : view === 'signup' ? (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SignUp
              onSignIn={() => setView('login')}
              onSignUpComplete={(user) => {
                setRegisteredUsers((prev) => [...prev, user]);
                setView('login');
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex h-screen overflow-hidden"
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={handleLogout}
              isAdmin={loggedInEmail === 'runtimerebel@gmail.com'}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Topbar
                notifications={notifications}
                onClearNotification={(notification) => dismissAlert(notification.id)}
                onLogout={handleLogout}
                isOpen={isNotificationsOpen}
                onOpenChange={setIsNotificationsOpen}
              />

              <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="mx-auto w-full max-w-[1600px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {renderContent()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'dashboard' && <AURIXAlerts alerts={alerts} onDismiss={dismissAlert} />}
    </div>
  );
}
