import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export const CacheMonitor: React.FC = () => {
  const { getCacheStats, clearCaches, clearAllState } = useWorkflowStore();
  const [stats, setStats] = React.useState(getCacheStats());

  // Update stats periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats());
    }, 2000);

    return () => clearInterval(interval);
  }, [getCacheStats]);

  const handleClearCaches = () => {
    clearCaches();
    setStats(getCacheStats());
  };

  const handleClearAll = () => {
    clearAllState();
    setStats(getCacheStats());
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Performance Cache</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Image Cache</span>
            <Badge variant="secondary">
              {stats.imageCache.size}/{stats.imageCache.maxSize}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Result Cache</span>
            <Badge variant="secondary">
              {stats.resultCache.size}/{stats.resultCache.maxSize}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Connections</span>
            <Badge variant="secondary">
              {stats.connectionPool.size}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearCaches}
            className="flex-1"
          >
            Clear Caches
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            className="flex-1"
          >
            Clear All
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Caches improve performance by avoiding duplicate operations.
        </div>
      </CardContent>
    </Card>
  );
};