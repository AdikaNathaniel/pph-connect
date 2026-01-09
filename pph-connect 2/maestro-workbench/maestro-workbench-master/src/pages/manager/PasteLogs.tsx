import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PasteEvent {
  id: string;
  project_id: string;
  task_id: string;
  worker_id: string;
  event_type: string;
  field_id: string | null;
  field_name: string | null;
  details: {
    pastedLength?: number;
    timestamp?: string;
  };
  created_at: string;
}

const PasteLogs = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PasteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch paste events
      const { data: eventsData, error: eventsError } = await supabase
        .from('task_answer_events')
        .select('*')
        .eq('event_type', 'paste')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (eventsError) throw eventsError;
      
      // Fetch workers for names
      const { data: workersData } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      const workersMap: Record<string, string> = {};
      (workersData || []).forEach((w) => {
        workersMap[w.id] = w.full_name ?? w.id;
      });
      setWorkers(workersMap);
      
      // Fetch projects for names
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name');
      
      const projectsMap: Record<string, string> = {};
      (projectsData || []).forEach((p) => {
        projectsMap[p.id] = p.name;
      });
      setProjects(projectsMap);
      
      setEvents((eventsData || []) as PasteEvent[]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred while fetching paste logs';

      console.error('Error fetching paste logs:', error);
      toast.error(message.includes('authenticated')
        ? 'You are not authorized to view paste detection logs'
        : 'Failed to fetch paste detection logs'
      );

      if (message.includes('authenticated')) {
        navigate('/m/dashboard', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const exportToCSV = () => {
    const headers = ['Date/Time', 'Worker', 'Project', 'Field', 'Pasted Length'];
    const rows = events.map(event => [
      new Date(event.created_at).toLocaleString(),
      workers[event.worker_id] || event.worker_id,
      projects[event.project_id] || event.project_id,
      event.field_name || 'Unknown',
      event.details.pastedLength || 'N/A'
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paste-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Paste logs exported to CSV"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" aria-hidden="true"></div>
        <span className="sr-only">Loading paste logs</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/m/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <Button onClick={exportToCSV} disabled={events.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paste Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No paste events detected yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Pasted Length</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {workers[event.worker_id] || event.worker_id}
                    </TableCell>
                    <TableCell>
                      {projects[event.project_id] || event.project_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.field_name || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.details.pastedLength || 'N/A'} chars
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PasteLogs;
