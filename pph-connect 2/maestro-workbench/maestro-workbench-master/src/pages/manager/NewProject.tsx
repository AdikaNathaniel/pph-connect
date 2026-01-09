import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Download, Eye, Rocket, Copy, X, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { TaskTemplate } from '@/types';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { UrlValidator, SafeLink } from '@/lib/urlValidation';

type TrainingModuleRow = Database['public']['Tables']['training_modules']['Row'];

interface ProjectFormData {
  name: string;
  description: string;
  instructions: string;
  instructions_pdf_url: string;
  instructions_google_docs_url: string;
  template_id: string;
  locale: string;
  language: string;
  due_date: string;
  google_sheet_url: string;
  replications_per_question: number;
  reservation_time_limit_minutes: number;
  average_handle_time_minutes: number | null;
  enable_skip_button: boolean;
  skip_reasons: string[];
  training_module_id: string | null;
  training_required: boolean;
}

interface SheetInfo {
  totalTasks: number;
  columnHeaders: string[];
  columnsMatch: boolean;
}

const NewProject = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    instructions: '',
    instructions_pdf_url: '',
    instructions_google_docs_url: '',
    template_id: '',
    locale: 'en_us',
    language: 'English',
    due_date: '',
    google_sheet_url: '',
    replications_per_question: 1,
    reservation_time_limit_minutes: 60,
    average_handle_time_minutes: null,
    enable_skip_button: false,
    skip_reasons: [],
    training_module_id: null,
    training_required: false,
  });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [reservationTimeUnit, setReservationTimeUnit] = useState<'minutes' | 'hours'>('hours');
  const [ahtUnit, setAhtUnit] = useState<'minutes' | 'hours'>('minutes');
  const [newSkipReason, setNewSkipReason] = useState('');
  const [trainingModules, setTrainingModules] = useState<TrainingModuleRow[]>([]);
  const [trainingModulesLoading, setTrainingModulesLoading] = useState(true);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [savingTrainingModule, setSavingTrainingModule] = useState(false);
  const initialTrainingFormState = {
    title: '',
    description: '',
    video_url: '',
    content: '',
    requiredBeforeTasks: true,
  };
  const [trainingFormData, setTrainingFormData] = useState(initialTrainingFormState);
  const [urlValidationErrors, setUrlValidationErrors] = useState<{
    instructions_pdf_url?: string;
    instructions_google_docs_url?: string;
  }>({});

  const serviceAccountEmail = 'data-ops-workbench-service-acc@data-ops-workbenches.iam.gserviceaccount.com';

  useEffect(() => {
    fetchTemplates();
    fetchTrainingModules();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      // Convert the Supabase Json type to TaskTemplate type
      const templatesWithParsedConfig = (data || []).map(template => ({
        ...template,
        column_config: Array.isArray(template.column_config) ? template.column_config : []
      })) as unknown as TaskTemplate[];
      setTemplates(templatesWithParsedConfig);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error("Failed to fetch task templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingModules = async () => {
    try {
      setTrainingModulesLoading(true);
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .order('title');

      if (error) throw error;
      setTrainingModules(data || []);
    } catch (error) {
      console.error('Error fetching training modules:', error);
      toast.error('Failed to load training modules');
    } finally {
      setTrainingModulesLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string | number | boolean | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate URLs when they change
    if (field === 'instructions_pdf_url' && typeof value === 'string') {
      const validation = UrlValidator.validatePdfUrl(value);
      setUrlValidationErrors(prev => ({
        ...prev,
        instructions_pdf_url: validation.isValid ? undefined : validation.error
      }));
    } else if (field === 'instructions_google_docs_url' && typeof value === 'string') {
      const validation = UrlValidator.validateGoogleDocsUrl(value);
      setUrlValidationErrors(prev => ({
        ...prev,
        instructions_google_docs_url: validation.isValid ? undefined : validation.error
      }));
    }
  };

  const handleReservationValueChange = (value: string) => {
    const numericValue = parseInt(value, 10);

    if (Number.isNaN(numericValue) || numericValue <= 0) {
      handleInputChange('reservation_time_limit_minutes', reservationTimeUnit === 'hours' ? 60 : 1);
      return;
    }

    const minutes = reservationTimeUnit === 'hours'
      ? numericValue * 60
      : numericValue;

    handleInputChange('reservation_time_limit_minutes', minutes);
  };

  const handleReservationUnitChange = (unit: 'minutes' | 'hours') => {
    setReservationTimeUnit(unit);

    if (unit === 'hours') {
      const hours = Math.max(1, Math.round((formData.reservation_time_limit_minutes || 60) / 60));
      handleInputChange('reservation_time_limit_minutes', hours * 60);
    }
  };

  const getReservationDisplayValue = () => {
    if (reservationTimeUnit === 'hours') {
      return Math.max(1, Math.round((formData.reservation_time_limit_minutes || 60) / 60)).toString();
    }

    return Math.max(1, formData.reservation_time_limit_minutes || 60).toString();
  };

  const handleAhtValueChange = (value: string) => {
    if (value.trim() === '') {
      handleInputChange('average_handle_time_minutes', null);
      return;
    }

    const numericValue = parseInt(value, 10);

    if (Number.isNaN(numericValue) || numericValue <= 0) {
      handleInputChange('average_handle_time_minutes', null);
      return;
    }

    const minutes = ahtUnit === 'hours'
      ? numericValue * 60
      : numericValue;

    handleInputChange('average_handle_time_minutes', minutes);
  };

  const handleAhtUnitChange = (unit: 'minutes' | 'hours') => {
    setAhtUnit(unit);

    if (formData.average_handle_time_minutes == null) {
      return;
    }

    if (unit === 'hours') {
      const hours = Math.max(1, Math.round(formData.average_handle_time_minutes / 60));
      handleInputChange('average_handle_time_minutes', hours * 60);
    }
  };

  const getAhtDisplayValue = () => {
    if (formData.average_handle_time_minutes == null) {
      return '';
    }

    if (ahtUnit === 'hours') {
      return Math.max(1, Math.round(formData.average_handle_time_minutes / 60)).toString();
    }

    return Math.max(1, formData.average_handle_time_minutes).toString();
  };

  const handleToggleSkipButton = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      enable_skip_button: enabled,
      skip_reasons: enabled ? prev.skip_reasons : [],
    }));

    if (!enabled) {
      setNewSkipReason('');
    }
  };

  const handleAddSkipReason = () => {
    const trimmedReason = newSkipReason.trim();
    if (!trimmedReason) {
      return;
    }

    if (formData.skip_reasons.some(reason => reason.toLowerCase() === trimmedReason.toLowerCase())) {
      toast.error("This skip reason already exists.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      skip_reasons: [...prev.skip_reasons, trimmedReason]
    }));
    setNewSkipReason('');
  };

  const handleRemoveSkipReason = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      skip_reasons: prev.skip_reasons.filter(r => r !== reason)
    }));
  };

  const handleTrainingFormChange = <K extends keyof typeof trainingFormData>(field: K, value: (typeof trainingFormData)[K]) => {
    setTrainingFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetTrainingForm = () => {
    setTrainingFormData(initialTrainingFormState);
    setShowTrainingForm(false);
  };

  const handleSelectTrainingModule = (moduleId: string) => {
    setShowTrainingForm(false);
    handleInputChange('training_module_id', moduleId);
  };

  const handleClearTrainingSelection = () => {
    handleInputChange('training_module_id', null);
    handleInputChange('training_required', false);
  };

  const handleToggleTrainingRequired = (checked: boolean) => {
    handleInputChange('training_required', checked);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Service account email copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF file must be less than 10MB");
      return;
    }

    try {
      setUploadingPdf(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `project-instructions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      handleInputChange('instructions_pdf_url', publicUrl);

      toast.success("PDF uploaded successfully");
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error("Failed to upload PDF");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleLoadSheet = async () => {
    if (!formData.google_sheet_url || !formData.template_id) {
      toast.error("Please select a template and enter a sheet URL first");
      return;
    }

    setLoadingSheet(true);
    try {
      // Call the edge function to load sheet data
      const { data, error } = await supabase.functions.invoke('load-sheet-data', {
        body: { sheetUrl: formData.google_sheet_url }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to load sheet data');
      }

      // Get the selected template to compare columns
      const template = templates.find(t => t.id === formData.template_id);
      const templateColumns = template?.column_config.map(col => col.name) || [];
      
      // Check if sheet columns match template columns
      const columnsMatch = templateColumns.length > 0 && 
        templateColumns.every(col => data.headers.includes(col));
      
      const sheetInfo: SheetInfo = {
        totalTasks: data.totalTasks,
        columnHeaders: data.headers,
        columnsMatch: columnsMatch
      };
      
      setSheetInfo(sheetInfo);
      
      toast.success(`Loaded sheet with ${data.totalTasks} tasks. ${columnsMatch ? 'Columns match template!' : 'Column mismatch detected.'}`);
    } catch (error) {
      console.error('Error loading sheet:', error);
      toast.error(error instanceof Error ? error.message : "Failed to load sheet data. Make sure the sheet is publicly accessible or shared with the service account.");
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleDownloadTemplate = () => {
    const selectedTemplate = templates.find(t => t.id === formData.template_id);
    if (!selectedTemplate) {
      toast.error("Please select a template first");
      return;
    }

    // Create CSV header row based on template
    const headers = selectedTemplate.column_config.map(col => col.name);
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.name}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    if (!formData.template_id) {
      toast.error("Please select a template to preview");
      return;
    }
    
    // TODO: Open preview modal showing how the project would look to workers
    toast("Preview functionality coming soon");
  };

  const handleLaunchProject = async () => {
    if (!formData.name || !formData.template_id || !formData.google_sheet_url) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedTemplate = templates.find(t => t.id === formData.template_id);
    const isAudioShort = selectedTemplate?.modality === 'audio-short';

    if (!isAudioShort && !sheetInfo) {
      toast.error("Please load the sheet data first");
      return;
    }

    if (formData.enable_skip_button && formData.skip_reasons.length === 0) {
      toast.error("Please add at least one skip reason while skip button is enabled");
      return;
    }

    try {
      setCreating(true);
      
      let trainingModuleId = formData.training_module_id;

      if (showTrainingForm) {
        if (!trainingFormData.title.trim()) {
          toast.error('Training module title is required');
          setCreating(false);
          return;
        }

        setSavingTrainingModule(true);

        const { data: newModule, error: trainingError } = await supabase
          .from('training_modules')
          .insert({
            title: trainingFormData.title.trim(),
            description: trainingFormData.description.trim() || null,
            video_url: trainingFormData.video_url.trim() || null,
            content: trainingFormData.content || null,
          })
          .select()
          .single();

        if (trainingError) {
          console.error('Failed to create training module:', trainingError);
          toast.error('Failed to create training module');
          setSavingTrainingModule(false);
          setCreating(false);
          return;
        }

        trainingModuleId = newModule?.id || null;
        setTrainingModules(prev => [...prev, newModule]);
        handleInputChange('training_module_id', newModule?.id || null);
        handleInputChange('training_required', trainingFormData.requiredBeforeTasks);
        setSavingTrainingModule(false);
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          instructions_pdf_url: formData.instructions_pdf_url || null,
          instructions_google_docs_url: formData.instructions_google_docs_url || null,
          template_id: formData.template_id,
          locale: formData.locale,
          language: formData.language,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          google_sheet_url: formData.google_sheet_url,
          replications_per_question: formData.replications_per_question,
          reservation_time_limit_minutes: formData.reservation_time_limit_minutes,
          average_handle_time_minutes: formData.average_handle_time_minutes,
          enable_skip_button: formData.enable_skip_button,
          skip_reasons: formData.enable_skip_button ? formData.skip_reasons : [],
          total_tasks: isAudioShort ? 0 : (sheetInfo?.totalTasks || 0), // Will be updated after loading audio files
          completed_tasks: 0,
          status: 'active',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          training_module_id: trainingModuleId,
          training_required: Boolean(trainingModuleId) && formData.training_required,
        })
        .select()
        .single();

      if (error) throw error;

      // Load questions from sheet or Drive based on template modality
      console.log('Loading questions for project:', data.id, 'modality:', selectedTemplate?.modality);
      
      const functionName = isAudioShort ? 'populate-audio-questions' : 'populate-project-questions';
      const { data: functionData, error: questionsError } = await supabase.functions.invoke(functionName, {
        body: { projectId: data.id }
      });

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        console.error('Function response:', functionData);
        toast.error(`Failed to load questions: ${questionsError.message || 'Unknown error'}. Check console for details.`);
      } else {
        console.log('Questions loaded successfully:', functionData);
        const questionCount = isAudioShort ? functionData?.questionsCreated : functionData?.questionsLoaded;
        toast.success(`Project "${formData.name}" launched with ${questionCount || 0} questions loaded!`);
      }

      navigate('/m/dashboard');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setCreating(false);
      setSavingTrainingModule(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.template_id);

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

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="instructions">Project Instructions for Workers</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              placeholder="Enter detailed instructions that workers will see in the workbench (Markdown supported)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Markdown supported:</strong> Use **bold**, *italic*, `code`, lists, links, etc.
            </p>
            {formData.instructions && (
              <div className="mt-2 p-3 bg-muted rounded-md border">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="text-sm prose prose-sm max-w-none">
                  <ReactMarkdown>{formData.instructions}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="pdf-upload">Instructions PDF (optional)</Label>
            <div className="space-y-2">
              <Input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                disabled={uploadingPdf}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Upload a PDF with detailed instructions (max 10MB). This will be viewable alongside markdown instructions.
              </p>
              {formData.instructions_pdf_url && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <Badge variant="outline" className="bg-green-100">PDF Uploaded</Badge>
                  <SafeLink 
                    href={formData.instructions_pdf_url}
                    validator={UrlValidator.validatePdfUrl}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Preview PDF
                  </SafeLink>
                </div>
              )}
              {urlValidationErrors.instructions_pdf_url && (
                <div className="text-xs text-red-600">
                  {urlValidationErrors.instructions_pdf_url}
                </div>
              )}
              {uploadingPdf && (
                <p className="text-xs text-muted-foreground">Uploading PDF...</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="google-docs-url">Instructions Google Doc (optional)</Label>
            <div className="space-y-2">
              <Input
                id="google-docs-url"
                value={formData.instructions_google_docs_url}
                onChange={(e) => handleInputChange('instructions_google_docs_url', e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Link to a Google Doc with live instructions. Workers can view the latest version without re-uploads.
              </p>
              {formData.instructions_google_docs_url && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <Badge variant="outline" className="bg-blue-100">Google Doc Linked</Badge>
                  <SafeLink 
                    href={formData.instructions_google_docs_url}
                    validator={UrlValidator.validateGoogleDocsUrl}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Preview Google Doc
                  </SafeLink>
                </div>
              )}
              {urlValidationErrors.instructions_google_docs_url && (
                <div className="text-xs text-red-600">
                  {urlValidationErrors.instructions_google_docs_url}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="locale">Locale Code (visible to workers)</Label>
              <Input
                id="locale"
                value={formData.locale}
                onChange={(e) => handleInputChange('locale', e.target.value)}
                placeholder="e.g., en_us, fr_fr"
              />
            </div>
            <div>
              <Label htmlFor="language">Language (visible to workers)</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                placeholder="e.g., English, French"
              />
            </div>
            <div>
              <Label htmlFor="replications_per_question">Replications per Question</Label>
              <Input
                id="replications_per_question"
                type="number"
                min="1"
                max="10"
                value={formData.replications_per_question}
                onChange={(e) => handleInputChange('replications_per_question', parseInt(e.target.value) || 1)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many answers needed per question (default: 1)
              </p>
            </div>
            <div>
              <Label>Task Reservation Time Limit</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={getReservationDisplayValue()}
                  onChange={(e) => handleReservationValueChange(e.target.value)}
                />
                <Select
                  value={reservationTimeUnit}
                  onValueChange={(value) => handleReservationUnitChange(value as 'minutes' | 'hours')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Workers must submit or release the task before this limit. Default: 1 hour.
              </p>
            </div>
            <div>
              <Label htmlFor="average_handle_time">Average Handle Time Threshold</Label>
              <div className="flex gap-2">
                <Input
                  id="average_handle_time"
                  type="number"
                  min="1"
                  placeholder="Optional"
                  value={getAhtDisplayValue()}
                  onChange={(e) => handleAhtValueChange(e.target.value)}
                />
                <Select
                  value={ahtUnit}
                  onValueChange={(value) => handleAhtUnitChange(value as 'minutes' | 'hours')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Workers exceeding this handle time will see a gentle reminder. Leave blank to disable.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skip Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Task Skip Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Enable Skip Button</Label>
              <p className="text-xs text-muted-foreground">
                Allow workers to skip tasks while capturing structured feedback.
              </p>
            </div>
            <Switch
              checked={formData.enable_skip_button}
              onCheckedChange={handleToggleSkipButton}
            />
          </div>

          {formData.enable_skip_button && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Skip Reasons Configuration</Label>
                <p className="text-xs text-muted-foreground">
                  Workers must choose one of these reasons when skipping a task.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  value={newSkipReason}
                  onChange={(e) => setNewSkipReason(e.target.value)}
                  placeholder="e.g., Poor audio quality"
                />
                <Button type="button" onClick={handleAddSkipReason} disabled={!newSkipReason.trim()}>
                  Add Reason
                </Button>
              </div>
              {formData.skip_reasons.length > 0 ? (
                <div className="space-y-2">
                  {formData.skip_reasons.map((reason) => (
                    <div key={reason} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm">{reason}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSkipReason(reason)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove reason</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Add at least one reason to require when a task is skipped.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Training Module</Label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1">
                <Select
                  value={formData.training_module_id || ''}
                  onValueChange={(value) => handleSelectTrainingModule(value)}
                  disabled={trainingModulesLoading || showTrainingForm}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={trainingModulesLoading ? 'Loading training modules...' : 'Select training module'} />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingModules.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No training modules available
                      </SelectItem>
                    ) : (
                      trainingModules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowTrainingForm(true); setTrainingFormData(initialTrainingFormState); }} disabled={showTrainingForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
                {formData.training_module_id && !showTrainingForm && (
                  <Button type="button" variant="ghost" onClick={handleClearTrainingSelection}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {formData.training_module_id && !showTrainingForm && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">Training module linked to this project.</span>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Required before tasks</span>
                <Switch checked={formData.training_required} onCheckedChange={handleToggleTrainingRequired} />
              </div>
            </div>
          )}

          {showTrainingForm && (
            <div className="rounded-md border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New Training Module</h4>
                <Button type="button" variant="ghost" size="sm" onClick={resetTrainingForm}>
                  Cancel
                </Button>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label htmlFor="training-title">Title *</Label>
                  <Input
                    id="training-title"
                    value={trainingFormData.title}
                    onChange={(e) => handleTrainingFormChange('title', e.target.value)}
                    placeholder="e.g., Maestro Onboarding"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="training-description">Description</Label>
                  <Textarea
                    id="training-description"
                    value={trainingFormData.description}
                    onChange={(e) => handleTrainingFormChange('description', e.target.value)}
                    placeholder="Brief summary displayed alongside the training"
                    rows={2}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="training-video">Video URL</Label>
                  <Input
                    id="training-video"
                    value={trainingFormData.video_url}
                    onChange={(e) => handleTrainingFormChange('video_url', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">Supports YouTube video URLs. We will embed the video automatically.</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="training-content">Content (Markdown)</Label>
                  <Textarea
                    id="training-content"
                    value={trainingFormData.content}
                    onChange={(e) => handleTrainingFormChange('content', e.target.value)}
                    placeholder="Add step-by-step instructions or resources..."
                    rows={5}
                  />
                  {trainingFormData.content && (
                    <div className="mt-2 rounded-md border bg-background p-3">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{trainingFormData.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 rounded-md border bg-background p-3">
                  <Checkbox
                    id="training-required"
                    checked={trainingFormData.requiredBeforeTasks}
                    onCheckedChange={(checked) => handleTrainingFormChange('requiredBeforeTasks', Boolean(checked))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="training-required" className="text-sm font-medium">Required before tasks</Label>
                    <p className="text-xs text-muted-foreground">Workers must complete this training before launching tasks.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetTrainingForm}>
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!trainingFormData.title.trim()) {
                      toast.error('Training module title is required');
                      return;
                    }

                    try {
                      setSavingTrainingModule(true);
                      const { data: newModule, error: trainingError } = await supabase
                        .from('training_modules')
                        .insert({
                          title: trainingFormData.title.trim(),
                          description: trainingFormData.description.trim() || null,
                          video_url: trainingFormData.video_url.trim() || null,
                          content: trainingFormData.content || null,
                        })
                        .select()
                        .single();

                      if (trainingError) throw trainingError;

                      if (newModule) {
                        setTrainingModules(prev => [...prev, newModule]);
                        handleInputChange('training_module_id', newModule.id);
                        handleInputChange('training_required', trainingFormData.requiredBeforeTasks);
                        setShowTrainingForm(false);
                        resetTrainingForm();
                        toast.success('Training module created');
                      }
                    } catch (error) {
                      console.error('Failed to create training module:', error);
                      toast.error(error instanceof Error ? error.message : 'Failed to create training module');
                    } finally {
                      setSavingTrainingModule(false);
                    }
                  }}
                  disabled={savingTrainingModule}
                >
                  {savingTrainingModule ? 'Saving...' : 'Save & Use'}
                </Button>
              </div>
            </div>
          )}

          {!showTrainingForm && !formData.training_module_id && (
            <p className="text-sm text-muted-foreground">
              No training module attached. Workers can start tasks immediately unless a module is linked and marked as required.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Task Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Task Design Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Template *</Label>
            <Select value={formData.template_id} onValueChange={(value) => handleInputChange('template_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a task template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
              disabled={!formData.template_id}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('/m/templates/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>

          {selectedTemplate && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{selectedTemplate.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.column_config.map((col) => (
                  <Badge key={col.id} variant={col.type === 'read' ? 'secondary' : 'default'}>
                    {col.name} ({col.type})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Sheet Integration */}
      <Card>
        <CardHeader>
          <CardTitle>
            {templates.find(t => t.id === formData.template_id)?.modality === 'audio-short' 
              ? 'Google Drive Folder Connection' 
              : 'Google Sheet Connection'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sheet_url">
              {templates.find(t => t.id === formData.template_id)?.modality === 'audio-short'
                ? 'Google Drive Folder URL *'
                : 'Google Sheet URL *'}
            </Label>
            <Input
              id="sheet_url"
              value={formData.google_sheet_url}
              onChange={(e) => handleInputChange('google_sheet_url', e.target.value)}
              placeholder={
                templates.find(t => t.id === formData.template_id)?.modality === 'audio-short'
                  ? 'https://drive.google.com/drive/folders/...'
                  : 'https://docs.google.com/spreadsheets/d/...'
              }
              required
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">
              {templates.find(t => t.id === formData.template_id)?.modality === 'audio-short'
                ? 'Share your folder with this service account:'
                : 'Share your sheet with this service account:'}
            </h4>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-background px-2 py-1 rounded">
                {serviceAccountEmail}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(serviceAccountEmail)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {templates.find(t => t.id === formData.template_id)?.modality !== 'audio-short' && (
            <Button 
              onClick={handleLoadSheet}
              disabled={loadingSheet || !formData.google_sheet_url || !formData.template_id}
            >
              {loadingSheet ? 'Loading...' : 'Load Sheet Data'}
            </Button>
          )}

          {sheetInfo && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <h4 className="font-medium text-success mb-2">Sheet Loaded Successfully</h4>
              <div className="space-y-2 text-sm">
                <div>Total Tasks: <strong>{sheetInfo.totalTasks}</strong> (rows with missing answers)</div>
                <div>
                  Column Headers: {sheetInfo.columnHeaders.join(', ')}
                </div>
                <div className="flex items-center gap-2">
                  Template Match: 
                  <Badge variant={sheetInfo.columnsMatch ? 'default' : 'destructive'}>
                    {sheetInfo.columnsMatch ? 'Columns Match' : 'Columns Mismatch'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePreview} disabled={!formData.template_id}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={
                !formData.name || 
                !formData.template_id || 
                !formData.google_sheet_url || 
                (templates.find(t => t.id === formData.template_id)?.modality !== 'audio-short' && !sheetInfo) ||
                creating
              }
            >
              <Rocket className="h-4 w-4 mr-2" />
              {creating ? 'Launching...' : 'Launch Project'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Launch Project</AlertDialogTitle>
              <AlertDialogDescription>
                {templates.find(t => t.id === formData.template_id)?.modality === 'audio-short' ? (
                  <>Are you sure you want to launch "{formData.name}"? This will create the project and load audio files from the Google Drive folder.</>
                ) : (
                  <>Are you sure you want to launch "{formData.name}"? This will create the project with {sheetInfo?.totalTasks} tasks and make it available for assignment to workers.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLaunchProject}>
                Launch Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default NewProject;