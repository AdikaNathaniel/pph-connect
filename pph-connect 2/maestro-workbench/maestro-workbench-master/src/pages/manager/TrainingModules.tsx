import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  BookOpen,
  Calendar,
  Users,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { UrlValidator } from '@/lib/urlValidation';
import ReactMarkdown from 'react-markdown';

type TrainingModule = Database['public']['Tables']['training_modules']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

interface TrainingModuleWithProjects extends TrainingModule {
  projects_using: Project[];
}

type WorkerTrainingCompletionWithRelations = Database['public']['Tables']['worker_training_completions']['Row'] & {
  profiles?: { full_name: string | null; email: string | null } | null;
  projects?: { name: string | null } | null;
};

type TrainingCompletionRow = {
  id: string;
  worker_id: string;
  training_module_id: string;
  project_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  worker_name: string;
  worker_email: string;
  project_name: string | null;
};

const TrainingModules = () => {
  const [modules, setModules] = useState<TrainingModuleWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCompletionsModalOpen, setIsCompletionsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<TrainingModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [completions, setCompletions] = useState<TrainingCompletionRow[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [completionsError, setCompletionsError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    content: '',
  });
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      
      // Fetch training modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('training_modules')
        .select(`
          id,
          title,
          description,
          video_url,
          content,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (modulesError) throw modulesError;

      // Fetch projects that use each training module
      const modulesWithProjects = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name, training_module_id')
            .eq('training_module_id', module.id);

          return {
            ...module,
            projects_using: projectsData || [],
          };
        })
      );

      setModules(modulesWithProjects);
    } catch (error) {
      console.error('Error fetching training modules:', error);
      toast.error('Failed to load training modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletions = async (moduleId: string) => {
    try {
      setCompletionsLoading(true);
      setCompletionsError(null);

      const { data, error } = await supabase
        .from('worker_training_completions')
        .select(`
          id,
          worker_id,
          training_module_id,
          project_id,
          started_at,
          completed_at,
          duration_seconds,
          profiles:profiles!worker_training_completions_worker_id_fkey(full_name, email),
          projects:projects!worker_training_completions_project_id_fkey(name)
        `)
        .eq('training_module_id', moduleId)
        .order('completed_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formatted: TrainingCompletionRow[] = ((data || []) as WorkerTrainingCompletionWithRelations[]).map(record => ({
        id: record.id,
        worker_id: record.worker_id,
        training_module_id: record.training_module_id,
        project_id: record.project_id,
        started_at: record.started_at || null,
        completed_at: record.completed_at || null,
        duration_seconds: record.duration_seconds ?? null,
        worker_name: record.profiles?.full_name || 'Unknown Worker',
        worker_email: record.profiles?.email || 'Unknown Email',
        project_name: record.projects?.name || null,
      }));

      setCompletions(formatted);
    } catch (error) {
      console.error('Error fetching training completions:', error);
      const message = error instanceof Error ? error.message : 'Failed to load training completions';
      setCompletionsError(message);
      toast.error(message);
    } finally {
      setCompletionsLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('training_modules')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          video_url: formData.video_url.trim() || null,
          content: formData.content || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Training module created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      await fetchModules();
    } catch (error) {
      console.error('Error creating training module:', error);
      toast.error('Failed to create training module');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!selectedModule || !formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('training_modules')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          video_url: formData.video_url.trim() || null,
          content: formData.content || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast.success('Training module updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      await fetchModules();
    } catch (error) {
      console.error('Error updating training module:', error);
      toast.error('Failed to update training module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', moduleToDelete.id);

      if (error) throw error;

      toast.success('Training module deleted successfully');
      setIsDeleteDialogOpen(false);
      setModuleToDelete(null);
      await fetchModules();
    } catch (error) {
      console.error('Error deleting training module:', error);
      toast.error('Failed to delete training module');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      content: '',
    });
    setSelectedModule(null);
    setVideoUrlError(null);
  };

  const openEditModal = (module: TrainingModule) => {
    setSelectedModule(module);
    setFormData({
      title: module.title,
      description: module.description || '',
      video_url: module.video_url || '',
      content: module.content || '',
    });
    setVideoUrlError(null);
    setIsEditModalOpen(true);
  };

  const openViewModal = (module: TrainingModule) => {
    setSelectedModule(module);
    setIsViewModalOpen(true);
  };

  const openCompletionsModal = async (module: TrainingModule) => {
    setSelectedModule(module);
    setIsCompletionsModalOpen(true);
    setCompletions([]);
    await fetchCompletions(module.id);
  };

  const openDeleteDialog = (module: TrainingModule) => {
    setModuleToDelete(module);
    setIsDeleteDialogOpen(true);
  };

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (module.description && module.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getEmbeddedYoutubeUrl = (videoUrl: string) => {
    const validation = UrlValidator.validateYouTubeUrl(videoUrl);
    if (!validation.isValid) {
      console.warn('Invalid YouTube URL:', validation.error);
      return null;
    }
    return validation.sanitizedUrl || null;
  };

  const handleVideoUrlChange = (value: string) => {
    setFormData(prev => ({ ...prev, video_url: value }));
    
    // Validate YouTube URL
    if (value.trim()) {
      const validation = UrlValidator.validateYouTubeUrl(value);
      setVideoUrlError(validation.isValid ? null : validation.error || 'Invalid YouTube URL');
    } else {
      setVideoUrlError(null);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Modules</h1>
          <p className="text-muted-foreground">Manage training content for your projects</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              New Training Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Training Module</DialogTitle>
              <DialogDescription>
                Create a new training module that can be assigned to projects.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Maestro Onboarding"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief summary of the training content"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  type="url"
                />
                {videoUrlError && (
                  <div className="text-xs text-red-600 mt-1">
                    {videoUrlError}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Add step-by-step instructions or resources..."
                  rows={6}
                />
                {formData.content && (
                  <div className="mt-2 rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateModule} disabled={saving}>
                {saving ? 'Creating...' : 'Create Module'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search training modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Modules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Training Modules ({filteredModules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredModules.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No training modules found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first training module to get started.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Training Module
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Projects Using</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModules.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell className="font-medium">{module.title}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {module.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {module.projects_using.length} project{module.projects_using.length !== 1 ? 's' : ''}
                        </span>
                        {module.projects_using.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {module.projects_using.map(p => p.name).join(', ')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(module.created_at || '')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewModal(module)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(module)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCompletionsModal(module)}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(module)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Training Module</DialogTitle>
            <DialogDescription>
              Update the training module details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Maestro Onboarding"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief summary of the training content"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-video_url">Video URL</Label>
              <Input
                id="edit-video_url"
                value={formData.video_url}
                onChange={(e) => handleVideoUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                type="url"
              />
              {videoUrlError && (
                <div className="text-xs text-red-600 mt-1">
                  {videoUrlError}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edit-content">Content (Markdown)</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Add step-by-step instructions or resources..."
                rows={6}
              />
              {formData.content && (
                <div className="mt-2 rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{formData.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateModule} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedModule?.title}</DialogTitle>
            {selectedModule?.description && (
              <DialogDescription>{selectedModule.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-6">
            {selectedModule?.video_url && getEmbeddedYoutubeUrl(selectedModule.video_url) && (
              <div className="w-full overflow-hidden rounded-lg border bg-muted">
                <div className="aspect-video">
                  <iframe
                    src={getEmbeddedYoutubeUrl(selectedModule.video_url)!}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Training video"
                  />
                </div>
              </div>
            )}
            {selectedModule?.content && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                <ReactMarkdown>{selectedModule.content}</ReactMarkdown>
              </div>
            )}
            {selectedModule && (
              <div className="rounded-md border bg-muted/40 p-4">
                <h4 className="font-medium mb-2">Module Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2">{formatDate(selectedModule.created_at || '')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="ml-2">{formatDate(selectedModule.updated_at || '')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completions Modal */}
      <Dialog open={isCompletionsModalOpen} onOpenChange={setIsCompletionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Training Completions</DialogTitle>
            <DialogDescription>
              {selectedModule ? `Workers who have completed "${selectedModule.title}"` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {completionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : completionsError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                {completionsError}
              </div>
            ) : completions.length === 0 ? (
              <div className="rounded-md border bg-muted/40 p-6 text-center text-muted-foreground">
                No workers have completed this training yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.worker_name}</span>
                          <span className="text-xs text-muted-foreground">{item.worker_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.project_name || '—'}</TableCell>
                      <TableCell>{formatDateTime(item.started_at)}</TableCell>
                      <TableCell>{formatDateTime(item.completed_at)}</TableCell>
                      <TableCell>{formatDuration(item.duration_seconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompletionsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Module</AlertDialogTitle>
            <AlertDialogDescription>
              {moduleToDelete && (
                <>
                  Are you sure you want to delete "{moduleToDelete.title}"?
                  {modules.find(m => m.id === moduleToDelete.id)?.projects_using.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Warning:</strong> This training module is currently used by{' '}
                        {modules.find(m => m.id === moduleToDelete.id)?.projects_using.length} project(s).
                        Deleting it will remove the training requirement from those projects.
                      </p>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrainingModules;
