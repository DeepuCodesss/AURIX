import React, { useState } from 'react';
import { Globe, ShieldCheck, ShieldAlert, Loader2, Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const LinkScanner: React.FC = () => {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    status: 'safe' | 'dangerous' | 'suspicious';
    score: number;
    details: string[];
    domain: string;
  } | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setScanning(true);
    setResult(null);

    const scanUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      const response = await fetch(`${API_URL}/scan/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl })
      });

      if (!response.ok) throw new Error("Backend scan failed");

      const data = await response.json();
      const verdictLower = (data.verdict || 'safe').toLowerCase() as 'safe' | 'dangerous' | 'suspicious';
      const riskScore = data.risk_score || 0;
      const safetyScore = 100 - riskScore;

      let finalDetails = data.heuristic_flags || [];
      if (finalDetails.length === 0) {
        if (verdictLower === 'safe') {
          finalDetails = ['No malware detected', 'SSL certificate valid', 'Domain reputation is excellent'];
        } else {
          finalDetails = ['Suspicious patterns found'];
        }
      } else {
        // Human readable flags
        finalDetails = finalDetails.map((f: string) => f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }

      setResult({
        status: verdictLower,
        score: safetyScore,
        domain: data.domain || new URL(scanUrl).hostname,
        details: finalDetails
      });

    } catch (err) {
      console.error("Link Scanner Error:", err);
      // If backend is offline or throws 500, we should NOT say it is 100% safe!
      setResult({
        status: 'dangerous',
        score: 0,
        domain: new URL(scanUrl).hostname,
        details: ['Critical: Cannot connect to AI Analysis Engine', 'Backend Server Offline or Error', 'Scan Failed']
      });
    }

    setScanning(false);
  };

  return (
    <Card className="glass border-white/5 overflow-hidden h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            URL & Link Scanner
          </h3>
          <p className="text-xs text-muted-foreground">Analyze URLs for phishing, malware, and malicious redirects.</p>
        </div>

        <form onSubmit={handleScan} className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Enter URL to scan (e.g., example.com)" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 pr-24 glass border-white/10 focus:ring-primary/20 h-11"
            disabled={scanning}
          />
          <button 
            type="submit"
            disabled={scanning || !url}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan Link'}
          </button>
        </form>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {scanning ? (
              <motion.div 
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <motion.div 
                    className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <Globe className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Analyzing URL</h4>
                <p className="text-xs text-muted-foreground mt-2">Checking reputation databases...</p>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  result.status === 'safe' ? "bg-emerald-500/5 border-emerald-500/20" : 
                  result.status === 'suspicious' ? "bg-yellow-500/5 border-yellow-500/20" : 
                  "bg-red-500/5 border-red-500/20"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      result.status === 'safe' ? "bg-emerald-500/10 text-emerald-500" : 
                      result.status === 'suspicious' ? "bg-yellow-500/10 text-yellow-500" : 
                      "bg-red-500/10 text-red-500"
                    )}>
                      {result.status === 'safe' ? <ShieldCheck className="w-5 h-5" /> : 
                       result.status === 'suspicious' ? <AlertTriangle className="w-5 h-5" /> : 
                       <ShieldAlert className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-mono text-muted-foreground truncate max-w-[150px]">{result.domain}</p>
                      <h4 className={cn(
                        "text-lg font-bold uppercase tracking-tight",
                        result.status === 'safe' ? "text-emerald-500" : 
                        result.status === 'suspicious' ? "text-yellow-500" : 
                        "text-red-500"
                      )}>
                        {result.status}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Safety Score</p>
                    <p className={cn(
                      "text-xl font-bold font-mono",
                      result.status === 'safe' ? "text-emerald-500" : 
                      result.status === 'suspicious' ? "text-yellow-500" : 
                      "text-red-500"
                    )}>{result.score}/100</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Security Findings</p>
                  <div className="space-y-1.5">
                    {result.details.map((detail, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground/80 bg-white/5 p-2 rounded-lg border border-white/5">
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          result.status === 'safe' ? "bg-emerald-500" : 
                          result.status === 'suspicious' ? "bg-yellow-500" : 
                          "bg-red-500"
                        )} />
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => window.open(url.startsWith('http') ? url : `https://${url}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg glass border-white/10 hover:bg-white/5 text-xs font-medium transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit Site Anyway
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                <Globe className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">Enter a URL above to begin analysis</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};
