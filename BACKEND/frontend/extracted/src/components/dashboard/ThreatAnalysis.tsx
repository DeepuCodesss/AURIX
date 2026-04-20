import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ExternalLink, 
  ShieldCheck, 
  ShieldX, 
  Filter, 
  X, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  MoreVertical,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Severity, Threat } from '@/types';
import { cn } from '@/lib/utils';
import { Trash2, Upload, FileSearch, Globe } from 'lucide-react';
import { FileScanner } from './FileScanner';
import { LinkScanner } from './LinkScanner';

const severityColors: Record<Severity, string> = {
  low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20 neon-glow-red',
};

type SortOrder = 'desc' | 'asc';

interface ThreatAnalysisProps {
  threats: Threat[];
  setThreats: React.Dispatch<React.SetStateAction<Threat[]>>;
  onDelete: (threat: Threat) => void;
}

export const ThreatAnalysis: React.FC<ThreatAnalysisProps> = ({ threats, setThreats, onDelete }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);

  const threatTypes = useMemo(() => {
    const types = new Set(threats.map(t => t.type));
    return Array.from(types).sort();
  }, [threats]);

  const filteredThreats = useMemo(() => {
    let result = threats.filter((threat) => {
      const severityMatch = severityFilter === 'all' || threat.severity === severityFilter;
      const typeMatch = typeFilter === 'all' || threat.type === typeFilter;
      const statusMatch = statusFilter === 'all' || threat.status === statusFilter;
      const searchMatch = 
        threat.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        threat.description.toLowerCase().includes(searchQuery.toLowerCase());
      return severityMatch && typeMatch && statusMatch && searchMatch;
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [threats, severityFilter, statusFilter, searchQuery, sortOrder]);

  const clearFilters = () => {
    setSeverityFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const updateThreatStatus = (id: string, newStatus: Threat['status']) => {
    setThreats(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FileScanner />
          <LinkScanner />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Threat Analysis</h2>
            <p className="text-muted-foreground">Detailed view of all detected security anomalies.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[200px] lg:max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by type or description..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass border-white/10 focus:ring-primary/20 h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">Type:</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-9 glass border-white/10 focus:ring-primary/20">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">All Types</SelectItem>
                  {threatTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">Severity:</span>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[120px] h-9 glass border-white/10 focus:ring-primary/20">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-9 glass border-white/10 focus:ring-primary/20">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass border-white/10">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button 
              onClick={toggleSortOrder}
              className="flex items-center gap-2 h-9 px-3 glass border-white/10 hover:bg-white/5 rounded-md text-xs font-medium transition-all"
              title={`Sort by Time (${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})`}
            >
              {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              <span className="hidden sm:inline">Time</span>
            </button>

            {(severityFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '') && (
              <button 
                onClick={clearFilters}
                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredThreats.length > 0 ? (
            filteredThreats.map((threat) => (
              <Card 
                key={threat.id} 
                className="glass border-white/5 hover:border-primary/20 transition-all group overflow-hidden cursor-pointer"
                onClick={() => setSelectedThreat(threat)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className={cn(
                      "w-2 md:w-1.5",
                      threat.severity === 'critical' ? "bg-red-500" : 
                      threat.severity === 'high' ? "bg-orange-500" : 
                      threat.severity === 'medium' ? "bg-yellow-500" : "bg-emerald-500"
                    )} />
                    
                    <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg">{threat.type}</h3>
                          <Badge className={cn("uppercase text-[10px] px-2", severityColors[threat.severity])}>
                            {threat.severity}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-white/5 text-muted-foreground">
                            {threat.id}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{threat.description}</p>
                        <div className="flex items-center gap-4 pt-2 text-xs font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="opacity-50">Source:</span> {threat.source}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="opacity-50">Detected:</span> {new Date(threat.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                          <Tooltip>
                            <TooltipTrigger 
                              onClick={() => updateThreatStatus(threat.id, 'active')}
                              className={cn(
                                "p-1.5 rounded-md transition-all outline-none cursor-pointer",
                                threat.status === 'active' ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-muted-foreground hover:text-red-500"
                              )}
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent>Mark as Active</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger 
                              onClick={() => updateThreatStatus(threat.id, 'mitigated')}
                              className={cn(
                                "p-1.5 rounded-md transition-all outline-none cursor-pointer",
                                threat.status === 'mitigated' ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "text-muted-foreground hover:text-emerald-500"
                              )}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent>Mark as Mitigated</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger 
                              onClick={() => updateThreatStatus(threat.id, 'ignored')}
                              className={cn(
                                "p-1.5 rounded-md transition-all outline-none cursor-pointer",
                                threat.status === 'ignored' ? "bg-white/20 text-white" : "text-muted-foreground hover:text-white"
                              )}
                            >
                              <ShieldX className="w-4 h-4" />
                            </TooltipTrigger>
                            <TooltipContent>Mark as Ignored</TooltipContent>
                          </Tooltip>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground outline-none cursor-pointer bg-transparent border-0">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10">
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setSelectedThreat(threat)}>
                              <Info className="w-4 h-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                              <ExternalLink className="w-4 h-4" /> Export Report
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(threat);
                              }}
                            >
                              <Trash2 className="w-4 h-4" /> Delete Threat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center glass rounded-2xl border-dashed border-white/10">
              <Filter className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-xl font-bold">No threats match your criteria</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                Try adjusting your search query or filters.
              </p>
              <button 
                onClick={clearFilters}
                className="mt-6 text-primary hover:underline text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Threat Detail Modal */}
        <Dialog open={!!selectedThreat} onOpenChange={(open) => !open && setSelectedThreat(null)}>
          <DialogContent className="glass border-white/10 max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={cn("uppercase text-[10px]", selectedThreat && severityColors[selectedThreat.severity])}>
                  {selectedThreat?.severity}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">{selectedThreat?.id}</span>
              </div>
              <DialogTitle className="text-2xl font-bold">{selectedThreat?.type}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Detailed analysis of the detected security incident.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">Status</span>
                  <div className="flex items-center gap-2 font-medium">
                    {selectedThreat?.status === 'active' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                    {selectedThreat?.status === 'mitigated' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    {selectedThreat?.status === 'ignored' && <ShieldX className="w-4 h-4 text-muted-foreground" />}
                    <span className="capitalize">{selectedThreat?.status}</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">Source IP</span>
                  <div className="font-mono font-medium">{selectedThreat?.source}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">Detection Time</span>
                  <div className="font-medium">{selectedThreat && new Date(selectedThreat.timestamp).toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">Severity Score</span>
                  <div className="font-medium">
                    {selectedThreat?.severity === 'critical' ? '9.8/10' : 
                     selectedThreat?.severity === 'high' ? '7.5/10' : 
                     selectedThreat?.severity === 'medium' ? '4.2/10' : '1.5/10'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase text-muted-foreground">Description</h4>
                <p className="text-foreground leading-relaxed p-4 rounded-xl bg-white/5 border border-white/5">
                  {selectedThreat?.description}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase text-muted-foreground">Recommended Actions</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    <p className="text-sm">Isolate the source IP {selectedThreat?.source} from the internal network.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                    <p className="text-sm">Initiate a deep system scan on all affected endpoints.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setSelectedThreat(null)}
                className="px-4 py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                Generate Full Report
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
