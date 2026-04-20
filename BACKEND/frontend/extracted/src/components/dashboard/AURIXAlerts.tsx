import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, X } from 'lucide-react';
import { AURIXAlert } from '@/types';

interface AURIXAlertsProps {
  alerts: AURIXAlert[];
  onDismiss: (id: string) => void;
}

export const AURIXAlerts: React.FC<AURIXAlertsProps> = ({ alerts, onDismiss }) => {
  return (
    <div className="fixed top-24 right-6 z-[90] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 40, y: 0, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto overflow-hidden rounded-xl border border-red-500/40 bg-black/80 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%)]" />
            <div className="relative flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                <ShieldAlert className="w-4 h-4 text-red-500/90" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold tracking-tight text-white/95">{alert.title}</p>
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="mt-0.5 text-[11px] text-white/60 truncate">{alert.description}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.15em] text-red-500/60">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40"></span>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500/80"></span>
                  </span>
                  <span>System Anomaly Flagged</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
