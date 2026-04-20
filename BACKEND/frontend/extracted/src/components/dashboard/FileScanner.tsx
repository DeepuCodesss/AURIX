import React, { useState, useCallback } from 'react';
import { Upload, FileSearch, FileText, Image, X, ShieldAlert, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FileScannerProps {
  onScanComplete?: (results: any) => void;
}

export const FileScanner: React.FC<FileScannerProps> = ({ onScanComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<{ fileName: string; status: 'clean' | 'threat'; type: string; reason?: string | null }[]>([]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles: File[] = Array.from(e.dataTransfer.files);
      setFiles(prev => {
        // Prevent duplicate append if onChange also fired
        const newFiles = droppedFiles.filter(df => !prev.some(pf => pf.name === df.name && pf.size === df.size));
        return [...prev, ...newFiles];
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles: File[] = Array.from(e.target.files);
      setFiles(prev => {
        const newFiles = selectedFiles.filter(df => !prev.some(pf => pf.name === df.name && pf.size === df.size));
        return [...prev, ...newFiles];
      });
    }
    // reset input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startScan = async () => {
    if (files.length === 0) return;

    setScanning(true);
    setResults([]);

    const scanResults = await Promise.all(files.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/scan/file`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Scan failed');
        const data = await response.json();

        const isThreat = data.risk_score >= 35; // SUSPICIOUS or DANGEROUS

        return {
          fileName: file.name,
          status: isThreat ? 'threat' : 'clean' as 'clean' | 'threat',
          type: data.heuristic_flags?.length > 0 ? data.heuristic_flags.join(', ') : (file.type || 'Standard File'),
          reason: isThreat ? `Risk: ${data.risk_score}/100 - ${data.verdict}` : null
        };
      } catch (err) {
        console.error("File scan error", err);
        return {
          fileName: file.name,
          status: 'threat' as 'clean' | 'threat',
          type: 'Upload Error',
          reason: '🚨 SERVER OFFLINE OR ERROR'
        };
      }
    }));

    setResults(scanResults);
    setScanning(false);
    if (onScanComplete) onScanComplete(scanResults);
  };

  return (
    <Card className="glass border-white/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-primary" />
              Deep File Scanner
            </h3>
            <p className="text-xs text-muted-foreground">Upload files or images to detect hidden threats and malware signatures.</p>
          </div>
          {files.length > 0 && !scanning && (
            <button
              onClick={startScan}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-all neon-glow-cyan flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Scan {files.length} Files
            </button>
          )}
        </div>

        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden",
            isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/5",
            scanning && "border-primary/50"
          )}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            title=""
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
            disabled={scanning}
          />

          <AnimatePresence>
            {scanning && (
              <motion.div
                initial={{ top: '-100%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 z-0 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
              {scanning ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Upload className={cn("w-8 h-8 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
              )}
            </div>

            <h4 className="text-lg font-medium mb-1">
              {scanning ? "Analyzing File Signatures..." : "Drag & drop files here"}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {scanning ? "Cross-referencing with global threat database" : "or click to browse from your computer"}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1"><Image className="w-3 h-3" /> Images</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Documents</span>
              <span className="flex items-center gap-1"><FileSearch className="w-3 h-3" /> Executables</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider px-2">
                <span>Queue ({files.length} files)</span>
                <button onClick={() => { setFiles([]); setResults([]); }} className="hover:text-red-500 transition-colors">Clear All</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {files.map((file, i) => {
                  const result = results.find(r => r.fileName === file.name);
                  return (
                    <motion.div
                      key={`${file.name}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-white/5">
                          {file.type.startsWith('image/') ? <Image className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            {result && (
                              <p className="text-[10px] text-primary/70 font-mono truncate max-w-[120px]">
                                {result.type}
                              </p>
                            )}
                          </div>
                          {result?.reason && (
                            <p className="text-[9px] text-red-400 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-2 h-2" /> {result.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                          {scanning ? (
                            <motion.div
                              key="scanning"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10"
                            >
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter animate-pulse">Scanning</span>
                            </motion.div>
                          ) : result ? (
                            <motion.div
                              key="result"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={cn(
                                "flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 rounded-full border shadow-sm",
                                result.status === 'clean'
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20 neon-glow-red"
                              )}
                            >
                              {result.status === 'clean' ? (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              )}
                              {result.status}
                            </motion.div>
                          ) : (
                            <motion.button
                              key="remove"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              onClick={() => removeFile(i)}
                              className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
