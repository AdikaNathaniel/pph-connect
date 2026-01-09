import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Copy, Edit, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ColumnConfig, TaskTemplate } from '@/types';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ProjectUsage {
  id: string;
  name: string;
  status: string;
}

interface TemplateWithUsage {
  id: string;
  name: string;
  description: string | null;
  google_sheet_url: string;
  column_config: ColumnConfig[];
  created_at: string;
  updated_at: string;
  created_by: string;
  projectsUsing: ProjectUsage[];
}

const PluginManager = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateWithUsage[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: TemplateWithUsage | null }>({
    open: false,
    template: null
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch projects using each template
      const templatesWithUsage: TemplateWithUsage[] = await Promise.all(
        templatesData.map(async (template) => {
          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, name, status')
            .eq('template_id', template.id);

          if (projectsError) {
            console.error('Error fetching projects for template:', projectsError);
            return { 
              ...template, 
              column_config: (template.column_config as unknown as ColumnConfig[]) || [],
              projectsUsing: [] as ProjectUsage[]
            };
          }

          return { 
            ...template, 
            column_config: (template.column_config as unknown as ColumnConfig[]) || [],
            projectsUsing: (projects || []) as ProjectUsage[]
          };
        })
      );

      setTemplates(templatesWithUsage as TemplateWithUsage[]);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load plugins",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (template: TemplateWithUsage) => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert([{
          name: `Copy of ${template.name}`,
          description: template.description,
          google_sheet_url: template.google_sheet_url,
          column_config: template.column_config as any,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Plugin "${template.name}" duplicated successfully!`
      });

      fetchTemplates();
    } catch (error: any) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate plugin",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (template: TemplateWithUsage) => {
    if (template.projectsUsing.length > 0) {
      toast({
        title: "Cannot Delete",
        description: `This plugin is used by ${template.projectsUsing.length} project(s). Remove it from all projects first.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Plugin "${template.name}" deleted successfully!`
      });

      fetchTemplates();
      setDeleteDialog({ open: false, template: null });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete plugin",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
        <Button onClick={() => navigate('/m/plugins/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Plugin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plugins</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your task plugins. Plugins define how data is structured and collected from workers.
          </p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No plugins created yet.</p>
              <p className="text-sm">Click "Create New Plugin" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id} className="border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{template.name}</h3>
                          <Badge variant="outline">
                            {Array.isArray(template.column_config) ? template.column_config.length : 0} columns
                          </Badge>
                        </div>
                        
                        {template.description && (
                          <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Used in {template.projectsUsing.length} project(s)</span>
                        </div>

                        {template.projectsUsing.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Used in projects:</p>
                            <div className="flex flex-wrap gap-2">
                              {template.projectsUsing.map((project) => (
                                <Badge key={project.id} variant="outline" className="text-xs">
                                  {project.name} ({project.status})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicate
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/plugins/edit/${template.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>

                        <AlertDialog
                          open={deleteDialog.open && deleteDialog.template?.id === template.id}
                          onOpenChange={(open) => setDeleteDialog({ open, template: open ? template : null })}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Plugin</AlertDialogTitle>
                              <AlertDialogDescription>
                                {template.projectsUsing.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-destructive">
                                      <AlertCircle className="h-4 w-4" />
                                      <span>Cannot delete this plugin</span>
                                    </div>
                                    <p>
                                      This plugin is currently used by {template.projectsUsing.length} project(s). 
                                      You must remove it from all projects before deleting.
                                    </p>
                                  </div>
                                ) : (
                                  `Are you sure you want to delete "${template.name}"? This action cannot be undone.`
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              {template.projectsUsing.length === 0 && (
                                <AlertDialogAction
                                  onClick={() => handleDelete(template)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Plugin
                                </AlertDialogAction>
                              )}
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PluginManager;