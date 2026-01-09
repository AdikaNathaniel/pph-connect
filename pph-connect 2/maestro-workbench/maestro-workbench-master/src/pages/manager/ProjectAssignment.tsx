import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserCheck, UserX, Search, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User, Project, ProjectAssignment } from '@/types';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ProjectAssignmentPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [preProvisionedUsers, setPreProvisionedUsers] = useState<Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
  }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [preProvisionedAssignments, setPreProvisionedAssignments] = useState<Array<{
    id: string;
    pre_provisioned_user_id: string;
    project_id: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('50');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [usersResult, preProvisionedResult, projectsResult, assignmentsResult, preProvisionedAssignmentsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('pre_provisioned_users').select('id, email, full_name, role').order('full_name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('project_assignments').select('*'),
        supabase.from('pre_provisioned_project_assignments').select('id, pre_provisioned_user_id, project_id')
      ]);

      if (usersResult.error) throw usersResult.error;
      if (preProvisionedResult.error) throw preProvisionedResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      if (preProvisionedAssignmentsResult.error) throw preProvisionedAssignmentsResult.error;

      setUsers(usersResult.data || []);
      setPreProvisionedUsers(preProvisionedResult.data || []);
      setProjects((projectsResult.data || []) as Project[]);
      setAssignments(assignmentsResult.data || []);
      setPreProvisionedAssignments(preProvisionedAssignmentsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProject = async () => {
    if (!selectedWorker || !selectedProject) {
      toast.error("Please select both a worker and a project");
      return;
    }

    // Check if worker is pre-provisioned (ID starts with "pre_")
    const isPreProvisioned = selectedWorker.startsWith('pre_');
    const actualWorkerId = isPreProvisioned ? selectedWorker.substring(4) : selectedWorker;

    // Check if assignment already exists
    if (isPreProvisioned) {
      const existingAssignment = preProvisionedAssignments.find(
        a => a.pre_provisioned_user_id === actualWorkerId && a.project_id === selectedProject
      );
      if (existingAssignment) {
        toast.error("This pre-provisioned worker is already assigned to this project");
        return;
      }
    } else {
      const existingAssignment = assignments.find(
        a => a.worker_id === actualWorkerId && a.project_id === selectedProject
      );
      if (existingAssignment) {
        toast.error("This worker is already assigned to this project");
        return;
      }
    }

    try {
      setAssigning(true);

      if (isPreProvisioned) {
        // Insert into pre_provisioned_project_assignments
        const { error } = await supabase
          .from('pre_provisioned_project_assignments')
          .insert({
            pre_provisioned_user_id: actualWorkerId,
            project_id: selectedProject,
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
        toast.success("Project assigned to pre-provisioned worker successfully");
      } else {
        // Insert into regular project_assignments
        const { error } = await supabase
          .from('project_assignments')
          .insert({
            worker_id: actualWorkerId,
            project_id: selectedProject,
            assigned_by: (await supabase.auth.getUser()).data.user?.id,
            priority: parseInt(selectedPriority)
          });

        if (error) throw error;
        toast.success("Project assigned successfully");
      }

      setSelectedWorker('');
      setSelectedProject('');
      setSelectedPriority('50');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning project:', error);
      toast.error(error.message || "Failed to assign project");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('project_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success("Assignment removed successfully");

      fetchData();
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      toast.error(error.message || "Failed to remove assignment");
    }
  };

  const handleRemovePreProvisionedAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('pre_provisioned_project_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success("Assignment removed successfully");

      fetchData();
    } catch (error: any) {
      console.error('Error removing pre-provisioned assignment:', error);
      toast.error(error.message || "Failed to remove assignment");
    }
  };

  const getWorkerName = (workerId: string) => {
    const worker = users.find(u => u.id === workerId);
    return worker?.full_name || 'Unknown Worker';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getProjectsByWorker = (workerId: string) => {
    return assignments
      .filter(a => a.worker_id === workerId)
      .map(a => projects.find(p => p.id === a.project_id))
      .filter(p => p !== undefined);
  };

  const handleSelectWorker = (workerId: string) => {
    const newSelected = new Set(selectedWorkers);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedWorkers.size === filteredWorkers.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(filteredWorkers.map(w => w.id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedWorkers.size === 0) {
      toast.error("Please select workers first");
      return;
    }

    if (bulkAction === 'assign_project') {
      if (!selectedProject) {
        toast.error("Please select a project to assign");
        return;
      }

      try {
        setAssigning(true);
        const assignmentsToCreate = Array.from(selectedWorkers).map(workerId => ({
          worker_id: workerId,
          project_id: selectedProject,
          priority: parseInt(selectedPriority)
        }));

        const { error } = await supabase
          .from('project_assignments')
          .insert(assignmentsToCreate);

        if (error) throw error;

        toast.success(`Project assigned to ${selectedWorkers.size} worker(s)`);

        setSelectedWorkers(new Set());
        setBulkAction('');
        setSelectedProject('');
        fetchData();
      } catch (error: any) {
        console.error('Error bulk assigning:', error);
        toast.error(error.message || "Failed to assign project");
      } finally {
        setAssigning(false);
      }
    } else if (bulkAction === 'remove_all_assignments') {
      try {
        const { error } = await supabase
          .from('project_assignments')
          .delete()
          .in('worker_id', Array.from(selectedWorkers));

        if (error) throw error;

        toast.success(`Removed all assignments for ${selectedWorkers.size} worker(s)`);

        setSelectedWorkers(new Set());
        setBulkAction('');
        fetchData();
      } catch (error: any) {
        console.error('Error bulk removing:', error);
        toast.error(error.message || "Failed to remove assignments");
      }
    }
  };

  const workers = users.filter(u => u.role === 'worker');

  // Combine regular workers and pre-provisioned workers
  const allWorkers = [
    ...workers.map(w => ({ ...w, isPreProvisioned: false })),
    ...preProvisionedUsers
      .filter(u => u.role === 'worker')
      .map(w => ({ ...w, isPreProvisioned: true }))
  ];

  const filteredWorkers = allWorkers.filter(worker =>
    worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/m/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Assign Project Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Assign Project to Worker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Worker</label>
              <Select
                value={selectedWorker}
                onValueChange={setSelectedWorker}
                onOpenChange={(open) => {
                  if (!open) setWorkerSearchTerm(''); // Clear search when dropdown closes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a worker" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 py-2 border-b">
                    <Input
                      placeholder="Search workers..."
                      value={workerSearchTerm}
                      onChange={(e) => setWorkerSearchTerm(e.target.value)}
                      className="h-8 bg-background"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {(() => {
                    const filteredActiveWorkers = workers.filter(worker =>
                      worker.full_name.toLowerCase().includes(workerSearchTerm.toLowerCase()) ||
                      worker.email.toLowerCase().includes(workerSearchTerm.toLowerCase())
                    );
                    const filteredPreProvisionedWorkers = preProvisionedUsers
                      .filter(u => u.role === 'worker')
                      .filter(user =>
                        user.full_name.toLowerCase().includes(workerSearchTerm.toLowerCase()) ||
                        user.email.toLowerCase().includes(workerSearchTerm.toLowerCase())
                      );

                    const hasResults = filteredActiveWorkers.length > 0 || filteredPreProvisionedWorkers.length > 0;

                    if (!hasResults && workerSearchTerm) {
                      return (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          No workers found matching "{workerSearchTerm}"
                        </div>
                      );
                    }

                    return (
                      <>
                        {filteredActiveWorkers.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Active Workers {workerSearchTerm && `(${filteredActiveWorkers.length})`}
                            </div>
                            {filteredActiveWorkers.map((worker) => (
                              <SelectItem key={worker.id} value={worker.id}>
                                {worker.full_name} ({worker.email})
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {filteredPreProvisionedWorkers.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                              Pre-Provisioned Workers {workerSearchTerm && `(${filteredPreProvisionedWorkers.length})`}
                            </div>
                            {filteredPreProvisionedWorkers.map((user) => (
                              <SelectItem key={`pre_${user.id}`} value={`pre_${user.id}`}>
                                {user.full_name} ({user.email}) - Pending OAuth
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Priority (0=Highest)</label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Set priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">P0 - Highest Priority</SelectItem>
                  <SelectItem value="10">P10 - High Priority</SelectItem>
                  <SelectItem value="25">P25 - Medium-High Priority</SelectItem>
                  <SelectItem value="50">P50 - Medium Priority</SelectItem>
                  <SelectItem value="75">P75 - Low Priority</SelectItem>
                  <SelectItem value="100">P100 - Lowest Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssignProject} disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign Project'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Assignments Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Worker Assignments</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
          
          {/* Bulk Actions */}
          {filteredWorkers.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2"
                  >
                    {selectedWorkers.size === filteredWorkers.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedWorkers.size === filteredWorkers.length ? 'Unselect All' : 'Select All'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedWorkers.size} of {filteredWorkers.length} selected
                  </span>
                </div>
                
                {selectedWorkers.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={bulkAction} onValueChange={setBulkAction}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Bulk Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assign_project">Assign Project</SelectItem>
                        <SelectItem value="remove_all_assignments">Remove All Assignments</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {bulkAction === 'assign_project' && (
                      <div className="flex items-center gap-2">
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select Project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">P0</SelectItem>
                            <SelectItem value="25">P25</SelectItem>
                            <SelectItem value="50">P50</SelectItem>
                            <SelectItem value="75">P75</SelectItem>
                            <SelectItem value="100">P100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleBulkAction}
                      disabled={assigning || (bulkAction === 'assign_project' && !selectedProject)}
                      size="sm"
                    >
                      {assigning ? 'Processing...' : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No workers found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredWorkers.map((worker) => {
                // Get assignments based on worker type
                const workerAssignments = worker.isPreProvisioned
                  ? preProvisionedAssignments.filter(a => a.pre_provisioned_user_id === worker.id)
                  : assignments.filter(a => a.worker_id === worker.id).sort((a, b) => a.priority - b.priority);

                return (
                  <div key={worker.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectWorker(worker.id)}
                          className="p-1 h-auto"
                        >
                          {selectedWorkers.has(worker.id) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{worker.full_name}</h3>
                            {worker.isPreProvisioned && (
                              <Badge variant="outline" className="text-xs">Pending Sign-In</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{worker.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {workerAssignments.length} assignment{workerAssignments.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {workerAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No projects assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {workerAssignments.map((assignment: any) => {
                          const project = projects.find(p => p.id === assignment.project_id);
                          const isPreProvisionedAssignment = 'pre_provisioned_user_id' in assignment;

                          return (
                            <div key={assignment.id} className="flex items-center justify-between bg-muted p-3 rounded">
                              <div className="flex items-center gap-3">
                                {!isPreProvisionedAssignment && (
                                  <Badge variant={assignment.priority === 0 ? "default" : "secondary"}>
                                    P{assignment.priority}
                                  </Badge>
                                )}
                                <span className="font-medium">{project?.name}</span>
                                <Badge variant="outline">{project?.status}</Badge>
                                <Badge variant="outline">{project?.locale || 'en_us'}</Badge>
                              </div>
                              <div className="flex gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-destructive">
                                      <UserX className="h-4 w-4 mr-1" />
                                      Remove Assignment
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {worker.full_name} from {project?.name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => isPreProvisionedAssignment
                                        ? handleRemovePreProvisionedAssignment(assignment.id)
                                        : handleRemoveAssignment(assignment.id)}>
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectAssignmentPage;