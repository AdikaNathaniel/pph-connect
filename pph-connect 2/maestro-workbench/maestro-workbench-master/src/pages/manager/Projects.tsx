import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Project } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProjectsOverviewTable } from '@/components/patterns/ProjectsOverviewTable';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    instructions_google_docs_url: '',
    due_date: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch question counts for each project
      const projectsWithProgress = await Promise.all(
        (data || []).map(async (project) => {
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('id, is_answered')
            .eq('project_id', project.id);
          
          if (questionsError) {
            console.error('Error fetching questions for project:', project.id, questionsError);
            return project;
          }
          
          const totalQuestions = questions?.length || 0;
          const completedQuestions = questions?.filter(q => q.is_answered).length || 0;
          
          return {
            ...project,
            total_tasks: totalQuestions,
            completed_tasks: completedQuestions
          };
        })
      );
      
      setProjects(projectsWithProgress as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditFormData({
      name: project.name,
      description: project.description || '',
      instructions: project.instructions || '',
      instructions_google_docs_url: project.instructions_google_docs_url || '',
      due_date: project.due_date ? new Date(project.due_date).toISOString().split('T')[0] : ''
    });
  };

  const handleCloseEdit = () => {
    setEditingProject(null);
    setEditFormData({
      name: '',
      description: '',
      instructions: '',
      instructions_google_docs_url: '',
      due_date: ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('projects')
        .update({
          name: editFormData.name,
          description: editFormData.description,
          instructions: editFormData.instructions,
          instructions_google_docs_url: editFormData.instructions_google_docs_url,
          due_date: editFormData.due_date ? new Date(editFormData.due_date).toISOString() : null
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      toast.success('Project updated successfully!');
      handleCloseEdit();
      fetchProjects(); // Refresh the list
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setSaving(false);
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
    <div className="space-y-1">
      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first project to get started
              </p>
              <Button asChild>
                <Link to="/m/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProjectsOverviewTable 
          projects={projects}
          onRefresh={fetchProjects}
          onEdit={handleEditProject}
        />
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and instructions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Project description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-instructions">Instructions</Label>
              <Textarea
                id="edit-instructions"
                value={editFormData.instructions}
                onChange={(e) => setEditFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Task instructions for workers"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-docs-url">Instructions Google Docs URL</Label>
              <Input
                id="edit-docs-url"
                value={editFormData.instructions_google_docs_url}
                onChange={(e) => setEditFormData(prev => ({ ...prev, instructions_google_docs_url: e.target.value }))}
                placeholder="https://docs.google.com/document/d/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editFormData.due_date}
                onChange={(e) => setEditFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editFormData.name}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
