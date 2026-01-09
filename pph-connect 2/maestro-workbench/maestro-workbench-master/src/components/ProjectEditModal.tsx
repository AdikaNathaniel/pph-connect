import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  onSaved?: () => void;
}

const ProjectEditModal: React.FC<Props> = ({ open, onClose, project, onSaved }) => {
  const [instructions, setInstructions] = useState('');
  const [locale, setLocale] = useState('');
  const [language, setLanguage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setInstructions(project.instructions || '');
      setLocale(project.locale || 'en_us');
      setLanguage(project.language || '');
      try {
        setDueDate(project.due_date ? new Date(project.due_date).toISOString().split('T')[0] : '');
      } catch (error) {
        console.error('Error parsing due date:', error);
        setDueDate('');
      }
    }
  }, [project]);

  const handleSave = async () => {
    if (!project) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('projects')
        .update({ 
          instructions, 
          locale, 
          language,
          due_date: dueDate ? (() => {
            try {
              return new Date(dueDate).toISOString();
            } catch (error) {
              console.error('Error parsing due date for save:', error);
              return null;
            }
          })() : null
        })
        .eq('id', project.id);
      if (error) throw error;
      toast.success('Project settings updated.');
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Instructions</Label>
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Locale</Label>
              <Input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en_us" />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English" />
            </div>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)} 
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectEditModal;
