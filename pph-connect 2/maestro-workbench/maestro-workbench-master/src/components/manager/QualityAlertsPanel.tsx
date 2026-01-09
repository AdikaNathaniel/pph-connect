import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchQualityAlerts, type QualityAlert } from '@/services/qualityAlertService';

interface QualityAlertsPanelProps {
  projectId?: string;
}

export const QualityAlertsPanel: React.FC<QualityAlertsPanelProps> = () => {
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const results = await fetchQualityAlerts();
    setAlerts(results);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <Card data-testid="manager-quality-alerts">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Quality alerts</CardTitle>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? 'Syncing…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent data-testid="manager-quality-alerts-list" className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts 🎉</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold capitalize">{alert.alertType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <Badge variant="secondary">{new Date(alert.createdAt).toLocaleDateString()}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default QualityAlertsPanel;
