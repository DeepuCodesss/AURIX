import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCcw, AlertTriangle, History, Bell, ShieldAlert } from 'lucide-react';
import { RecycleBinItem } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecycleBinProps {
  items: RecycleBinItem[];
  onRestore: (item: RecycleBinItem) => void;
  onPermanentDelete: (id: string) => void;
  onEmpty: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ items, onRestore, onPermanentDelete, onEmpty }) => {
  const getIcon = (type: RecycleBinItem['type']) => {
    switch (type) {
      case 'threat': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'log': return <History className="w-4 h-4 text-blue-500" />;
      case 'notification': return <Bell className="w-4 h-4 text-purple-500" />;
      default: return <Trash2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getItemTitle = (item: RecycleBinItem) => {
    if (item.type === 'threat') return item.data.type;
    if (item.type === 'log') return item.data.event;
    if (item.type === 'notification') return item.data.title || 'Notification';
    return 'Unknown Item';
  };

  const getItemId = (item: RecycleBinItem) => {
    if (item.type === 'threat') return item.data.id;
    if (item.type === 'log') return item.data.id;
    if (item.type === 'notification') return item.data.id;
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recycle Bin</h2>
          <p className="text-muted-foreground">Manage deleted threats, logs, and notifications.</p>
        </div>
        {items.length > 0 && (
          <Button 
            variant="destructive" 
            onClick={onEmpty}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Empty Bin
          </Button>
        )}
      </div>

      <Card className="glass border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-muted-foreground" />
            Deleted Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <AnimatePresence mode="popLayout">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Trash2 className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium">Bin is empty</h3>
                  <p className="text-sm text-muted-foreground">Deleted items will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <motion.div
                      key={`${item.type}-${getItemId(item)}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl glass border-white/5 hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-white/5">
                          {getIcon(item.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getItemTitle(item)}</span>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Deleted on: {new Date(item.deletedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onRestore(item)}
                          className="h-8 gap-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          Restore
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onPermanentDelete(getItemId(item))}
                          className="h-8 gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
