import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Project, Task, TaskTemplate, ColumnConfig } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import TaskForm from './TaskForm';
import { Badge } from '@/components/ui/badge';
import { toast } from "sonner";

interface ProjectPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  viewAsWorker?: boolean;
}

const ProjectPreviewModal: React.FC<ProjectPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  project, 
  viewAsWorker = false 
}) => {
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [sampleTask, setSampleTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      loadPreviewData();
    }
  }, [isOpen, project]);

  const loadPreviewData = async () => {
    if (!project) return;
    
    setLoading(true);
    try {
      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', project.template_id)
        .single();

      if (templateError) throw templateError;

      const parsedTemplate: TaskTemplate = {
        ...templateData,
        column_config: Array.isArray(templateData.column_config) 
          ? templateData.column_config as unknown as ColumnConfig[]
          : []
      };
      setTemplate(parsedTemplate);

      // Create sample task data
      const sampleData: Record<string, any> = {};
      parsedTemplate.column_config.forEach((col, index) => {
        if (col.type === 'read') {
          switch (col.inputType) {
            case 'text':
              sampleData[col.id] = `Sample ${col.name.toLowerCase()} text`;
              break;
            case 'textarea':
              sampleData[col.id] = `This is a sample ${col.name.toLowerCase()} with multiple lines of text to demonstrate how this field would appear to workers.`;
              break;
            default:
              sampleData[col.id] = `Sample ${col.name.toLowerCase()}`;
          }
        }
      });

      const mockTask: Task = {
        id: 'preview-task',
        project_id: project.id,
        row_index: 1,
        status: 'assigned',
        data: sampleData,
        assigned_to: undefined,
        assigned_at: undefined,
        completed_at: undefined,
        completion_time_seconds: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setSampleTask(mockTask);
    } catch (error) {
      console.error('Error loading preview data:', error);
      toast({
        title: "Error",
        description: "Failed to load preview data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (data: Record<string, any>) => {
    toast({
      title: "Preview Mode",
      description: "This is a preview - task data not saved"
    });
  };

  const handleSkip = () => {
    toast({
      title: "Preview Mode", 
      description: "This is a preview - task not actually skipped"
    });
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{viewAsWorker ? 'Worker View' : 'Project Preview'}: {project.name}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{project.locale}</Badge>
                <Badge variant="secondary">Preview Mode</Badge>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close Preview
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : template && sampleTask ? (
            <TaskForm
              task={sampleTask}
              project={project}
              taskStartTime={new Date()}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to load preview</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectPreviewModal;