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
            initial={{ opacity: 0, x: 72, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 72, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/90 text-white shadow-[0_20px_60px_rgba(239,68,68,0.32)] backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_42%)]" />
            <div className="relative flex items-start gap-3 p-4">
              <div className="mt-0.5 rounded-xl bg-white/12 p-2">
                <ShieldAlert className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black tracking-wide">🚨 {alert.title}</p>
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="mt-2 text-sm text-white/90">{alert.description}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-white/75">
                  <span>Live Alert</span>
                  <span className="h-1 w-1 rounded-full bg-white/75" />
                  <span>AI Response Armed</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
