import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Settings, Users, Activity, UserPlus, UserCheck, Pause, Play, Eye, Trash2, BarChart3, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Project, User as UserType, ProjectAssignment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatDateET } from '@/lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import ProjectPreviewModal from '@/components/ProjectPreviewModal';
import StatsModal from '@/components/StatsModal';
import ProjectEditModal from '@/components/ProjectEditModal';
import QuestionStatusModal from '@/components/QuestionStatusModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import VersionTracker from '@/components/VersionTracker';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [questionStatusOpen, setQuestionStatusOpen] = useState(false);
  const [selectedProjectForStatus, setSelectedProjectForStatus] = useState<Project | null>(null);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [projectAHT, setProjectAHT] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch templates first for reference
      const { data: templatesData, error: templatesError } = await supabase
        .from('task_templates')
        .select('id, name');
      
      if (templatesError) throw templatesError;
      
      const templatesMap: Record<string, string> = {};
      (templatesData || []).forEach((t: any) => {
        templatesMap[t.id] = t.name;
      });
      setTemplates(templatesMap);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (projectsError) throw projectsError;
      
      // Fetch users (workers and managers)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      
      // Fetch project assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('*');
      
      if (assignmentsError) throw assignmentsError;

      // Fetch questions data for accurate counts
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, project_id, is_answered, completed_replications, required_replications');
      
      if (questionsError) throw questionsError;

      // Update projects with accurate question counts from questions table
      const projectsWithCounts = (projectsData || []).map(project => {
        const projectQuestions = (questionsData || []).filter(q => q.project_id === project.id);
        const answeredQuestions = projectQuestions.filter(q => q.is_answered).length;
        const totalQuestions = projectQuestions.length;
        
        return {
          ...project,
          status: project.status as 'active' | 'paused' | 'completed',
          total_tasks: totalQuestions,
          completed_tasks: answeredQuestions
        };
      });
      
      setProjects(projectsWithCounts as Project[]);
      setUsers(usersData || []);
      setAssignments(assignmentsData || []);
      
      // Calculate AHT for each project
      await calculateProjectAHT(projectsWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (projectId: string) => {
    try {
      // Update project status to completed
      const { error: projectError } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', projectId);

      if (projectError) throw projectError;

      // Remove all assignments for this project
      const { error: assignmentsError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', projectId);

      if (assignmentsError) throw assignmentsError;

      toast({
        title: "Success",
        description: "Project marked as complete and all assignments removed"
      });

      fetchData();
    } catch (error: any) {
      console.error('Error marking project complete:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark project as complete",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'paused': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const calculateProjectAHT = async (projects: Project[]) => {
    const ahtData: Record<string, string> = {};
    
    for (const project of projects) {
      try {
        // Fetch answers for this project
        const { data: answers, error } = await supabase
          .from('answers')
          .select('aht_seconds')
          .eq('project_id', project.id);
        
        if (error) {
          console.error(`Error fetching answers for project ${project.id}:`, error);
          ahtData[project.id] = "tbd";
          continue;
        }
        
        if (!answers || answers.length === 0) {
          ahtData[project.id] = "tbd";
          continue;
        }
        
        // Calculate average AHT
        const totalAHT = answers.reduce((sum, answer) => sum + (answer.aht_seconds || 0), 0);
        const avgAHT = Math.round(totalAHT / answers.length);
        
        // Format as minutes:seconds
        const minutes = Math.floor(avgAHT / 60);
        const seconds = avgAHT % 60;
        ahtData[project.id] = `${minutes}m ${seconds}s`;
      } catch (error) {
        console.error(`Error calculating AHT for project ${project.id}:`, error);
        ahtData[project.id] = "tbd";
      }
    }
    
    setProjectAHT(ahtData);
  };

  const getProjectWorkerCount = (projectId: string) => {
    return assignments.filter(a => a.project_id === projectId).length;
  };

  const getProjectAHT = (projectId: string) => {
    return projectAHT[projectId] || "tbd";
  };

  const handlePauseProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'paused' })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project paused successfully"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to pause project",
        variant: "destructive"
      });
    }
  };

  const handleResumeProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project resumed successfully"
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to resume project",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // Delete in order: task_answers, tasks, project_assignments, projects
      await supabase.from('task_answers').delete().eq('project_id', projectId);
      await supabase.from('tasks').delete().eq('project_id', projectId);
      await supabase.from('project_assignments').delete().eq('project_id', projectId);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully"
      });

      fetchData();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive"
      });
    }
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setPreviewModalOpen(true);
  };



  const activeProjects = projects.filter(p => p.status === 'active');
  const pausedProjects = projects.filter(p => p.status === 'paused');
  const totalWorkers = users.filter(u => u.role === 'worker').length;
  
  // Calculate active questions (questions that still need answers)
  const activeQuestions = projects.reduce((sum, p) => {
    const remaining = (p.total_tasks || 0) - (p.completed_tasks || 0);
    return sum + Math.max(0, remaining);
  }, 0);
  
  // Calculate lifetime questions answered
  const lifetimeQuestionsAnswered = projects.reduce((sum, p) => sum + (p.completed_tasks || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Maestro Manager Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <Button onClick={() => navigate('/manager/paste-logs')} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Paste Logs
          </Button>
          <Button onClick={() => navigate('/manager/users')} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            User Management
          </Button>
          <Button onClick={() => navigate('/manager/assignments')} size="sm">
            <UserCheck className="h-4 w-4 mr-2" />
            Project Assignment
          </Button>
          <Button onClick={() => navigate('/plugins')} size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Plugins
          </Button>
          <Button onClick={() => navigate('/new-project')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Projects in Flight</p>
                <p className="text-2xl font-bold">
                  {activeProjects.length}
                </p>
                {pausedProjects.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects grounded: {pausedProjects.length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Workers</p>
                <p className="text-2xl font-bold">{totalWorkers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Questions</p>
                <p className="text-2xl font-bold">
                  {activeQuestions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Questions Answered</p>
                <p className="text-2xl font-bold">
                  {lifetimeQuestionsAnswered}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Projects</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompletedProjects(!showCompletedProjects)}
              >
                {showCompletedProjects ? 'Hide' : 'Show'} Completed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No projects created yet.</p>
              <p className="text-sm">Click "New Project" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects
                .filter(project => showCompletedProjects || project.status !== 'completed')
                .map((project) => (
                <div key={project.id} className="flex items-start justify-between p-6 border rounded-lg bg-white shadow-sm">
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <Badge variant="outline">{project.locale || 'en_us'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                    <div className="flex items-start gap-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Progress</span>
                          <span className="text-muted-foreground">{project.completed_tasks || 0}/{project.total_tasks || 0}</span>
                        </div>
                        <Progress 
                          value={project.total_tasks ? ((project.completed_tasks || 0) / project.total_tasks) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2 min-w-0">
                        <div><span className="font-medium">Plugin:</span> {templates[project.template_id] || 'Unknown'}</div>
                        <div><span className="font-medium">Workers:</span> {getProjectWorkerCount(project.id)}</div>
                        <div><span className="font-medium">AHT:</span> {getProjectAHT(project.id)}</div>
                        <div><span className="font-medium">Created:</span> {formatDateET(project.created_at)}</div>
                        {project.due_date && (
                          <div><span className="font-medium">Due:</span> {formatDateET(project.due_date)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/questions/${project.id}`)}
                        title="View question status and answers"
                        className="flex-shrink-0"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        View Questions
                      </Button>
                      {project.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseProject(project.id)}
                          className="flex-shrink-0"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : project.status === 'paused' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResumeProject(project.id)}
                          className="flex-shrink-0"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      ) : null}
                      {project.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkComplete(project.id)}
                          className="flex-shrink-0"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setSelectedProject(project); setEditOpen(true); }}
                        className="flex-shrink-0"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewProject(project)}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-shrink-0">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{project.name}"? This will permanently delete all tasks, assignments, and data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                              Delete Project
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ProjectPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        project={selectedProject}
        viewAsWorker={false}
      />
      <ProjectEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={selectedProject}
        onSaved={fetchData}
      />
      
      <QuestionStatusModal
        project={selectedProjectForStatus}
        isOpen={questionStatusOpen}
        onClose={() => {
          setQuestionStatusOpen(false);
          setSelectedProjectForStatus(null);
        }}
      />
      
      {/* Version Tracker Footer */}
      <div className="mt-8 flex justify-center">
        <VersionTracker />
      </div>
    </div>
  );
};

export default ManagerDashboard;