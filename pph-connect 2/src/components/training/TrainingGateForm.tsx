import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { toast } from 'sonner';

type Option = { id: string; label: string };

type TrainingGateFormProps = {
  workers: Option[];
  projects: Option[];
  onSuccess?: () => void;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' }
];

const TrainingGateForm: React.FC<TrainingGateFormProps> = ({ workers, projects, onSuccess }) => {
  const [workerId, setWorkerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [gateName, setGateName] = useState('');
  const [status, setStatus] = useState('pending');
  const [score, setScore] = useState('');
  const [attemptCount, setAttemptCount] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setWorkerId('');
    setProjectId('');
    setGateName('');
    setStatus('pending');
    setScore('');
    setAttemptCount('0');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workerId || !projectId || !gateName.trim()) {
      toast.error('Worker, project, and gate name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('training_gates').insert({
        worker_id: workerId,
        project_id: projectId,
        gate_name: gateName.trim(),
        status,
        score: score ? Number(score) : null,
        attempt_count: Number(attemptCount) || 0
      });

      if (error) throw error;

      toast.success('Training gate created');
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating training gate:', error);
      toast.error('Failed to create training gate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="worker">Worker *</Label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger id="worker">
              <SelectValue placeholder="Select worker" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="project">Project *</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="project">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gateName">Gate Name *</Label>
        <Input
          id="gateName"
          value={gateName}
          onChange={(event) => setGateName(event.target.value)}
          placeholder="e.g., Quality Certification Gate"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="score">Score</Label>
          <Input
            id="score"
            type="number"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            placeholder="0 - 100"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="attempts">Attempt Count</Label>
          <Input
            id="attempts"
            type="number"
            value={attemptCount}
            onChange={(event) => setAttemptCount(event.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={reset} disabled={isSubmitting}>
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Gate'}
        </Button>
      </div>
    </form>
  );
};

export default TrainingGateForm;
