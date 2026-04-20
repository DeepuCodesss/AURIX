import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ScanSearch,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { API_URL } from '@/lib/api';
import { ScanTypes } from './ScanTypes';

interface InstalledApp {
  name: string;
  version: string;
  publisher: string;
  needs_update: boolean;
  risk: string;
}

export const SystemScanApps: React.FC = () => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [appsTotal, setAppsTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch installed apps once
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await fetch(`${API_URL}/system/apps`);
        if (!res.ok) return;
        const data = await res.json();
        setApps(data.apps || []);
        setAppsTotal(data.total || 0);
      } catch (err) {
        /* backend offline */
      }
    };
    fetchApps();
  }, []);

  const outdatedApps = apps.filter((a) => a.needs_update);

  const filteredApps = apps.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.publisher || '').toLowerCase().includes(q)
    );
  });

  const filteredUpToDate = filteredApps.filter((a) => !a.needs_update);
  const filteredOutdated = filteredApps.filter((a) => a.needs_update);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] tracking-[0.22em] uppercase">
            AURIX SECURITY
          </Badge>
        </div>
        <h2 className="text-3xl font-black tracking-tight">
          System Scan & Applications
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Run specialized security scans across your infrastructure and review
          all installed applications for potential vulnerabilities.
        </p>
      </motion.div>

      {/* Scan Types Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <ScanTypes />
      </motion.div>

      {/* Installed Apps Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Card className="glass border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Installed Applications ({appsTotal})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {outdatedApps.length > 0 ? (
                  <span className="text-amber-500 font-bold">
                    {outdatedApps.length} app(s) may need updates
                  </span>
                ) : (
                  'All detected applications are up to date.'
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search bar */}
              <div className="relative">
                <ScanSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30 focus:bg-white/[0.08] transition-all w-56"
                />
              </div>
              <Badge
                variant="outline"
                className="font-mono text-[10px]"
              >
                REGISTRY SCAN
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar space-y-2">
              {/* Show outdated apps first */}
              {filteredOutdated.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <h4 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Potential Update
                    Required
                  </h4>
                  <div className="space-y-2">
                    {filteredOutdated.map((app, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded bg-amber-500/5 border border-amber-500/10"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="text-sm font-medium truncate">
                            {app.name}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {app.publisher || 'Unknown Publisher'} — v
                            {app.version}
                          </p>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-mono text-[9px] shrink-0">
                          UPDATE
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All apps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredUpToDate.slice(0, 80).map((app, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded glass border-white/5"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-xs font-medium truncate">
                        {app.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                        {app.publisher || 'Unknown'} — v{app.version || 'N/A'}
                      </p>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>

              {filteredApps.length === 0 && searchQuery && (
                <div className="py-10 text-center">
                  <ScanSearch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No applications matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
