import React, { useState, useEffect } from 'react';
import { Task, Project, ColumnConfig, TaskTemplate } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ExternalLink, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getKeySymbol } from '@/lib/keyboard-utils';
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { mockTemplates } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';
import ProjectInstructions from './ProjectInstructions';
import { AudioShortformPlayer } from './AudioShortformPlayer';
import { getDriveFileUrl } from '@/lib/googleDriveLoader';
import { submitAnswer, type SubmitAnswerResult } from '@/lib/answers';

// Utility function to get the correct modifier key symbol based on OS
const getModifierKey = () => {
  if (typeof window === 'undefined') return '⌘'; // Default to Cmd for SSR
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
};

// Utility function to render keyboard shortcut
const renderKeyboardShortcut = () => {
  const modifierKey = getModifierKey();
  return (
    <div className="ml-2 text-xs text-muted-foreground flex items-center">
      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">{modifierKey}</kbd>
      <span className="mx-1">+</span>
      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd>
    </div>
  );
};

interface TaskFormProps {
  task: Task;
  project: Project;
  taskStartTime: Date | null;
  onComplete: (data: Record<string, unknown>, submission?: SubmitAnswerResult) => void;
  onSkip: () => void;
}

// Component for rendering read-only field with optional tooltip
const ReadOnlyField: React.FC<{ column: ColumnConfig; value: any; compact?: boolean }> = ({ column, value, compact = false }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const isLink = typeof value === 'string' && /https?:\/\//i.test(value);
  
  if (compact) {
    return (
      <div key={column.id} className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-xs text-muted-foreground">{column.name}:</span>
            {column.tooltip && (
              <TooltipProvider>
                <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setTooltipOpen(!tooltipOpen)}
                      onMouseEnter={() => setTooltipOpen(true)}
                      onMouseLeave={() => setTooltipOpen(false)}
                      className="inline-flex"
                    >
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{column.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {isLink ? (
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm underline text-primary"
                title={value}
              >
                {value}
              </a>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open link"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md border hover:bg-muted shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <span className="truncate text-sm" title={String(value || 'N/A')}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value || 'N/A')}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div key={column.id} className="space-y-2 min-w-0">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{column.name}</Label>
        {column.tooltip && (
          <TooltipProvider>
            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setTooltipOpen(!tooltipOpen)}
                  onMouseEnter={() => setTooltipOpen(true)}
                  onMouseLeave={() => setTooltipOpen(false)}
                  className="inline-flex"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{column.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {isLink ? (
        <div className="flex items-center gap-2 min-w-0">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-muted rounded-md text-sm underline break-words whitespace-pre-wrap max-w-full"
            title={value}
          >
            {value}
          </a>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border hover:bg-muted shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="p-3 bg-muted rounded-md text-sm break-words whitespace-pre-wrap">
          {typeof value === 'object' ? JSON.stringify(value) : String(value || 'N/A')}
        </div>
      )}
    </div>
  );
};

const TaskForm: React.FC<TaskFormProps> = ({ task, project, taskStartTime, onComplete, onSkip }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date>(() => taskStartTime ?? new Date());
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const audioObjectUrlRef = useRef<string | null>(null);
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const platform =
      (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      navigator.userAgent;
    return /mac|iphone|ipod|ipad/i.test(platform);
  }, []);
  const submitShortcuts = useMemo<ShortcutCombo[]>(() => {
    if (isMac) {
      return [
        {
          keys: ['Shift', 'Enter'],
          matcher: (event: KeyboardEvent) =>
            event.key === 'Enter' &&
            event.shiftKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey,
        },
        {
          keys: ['Cmd', 'Enter'],
          matcher: (event: KeyboardEvent) =>
            event.key === 'Enter' && event.metaKey && !event.ctrlKey && !event.altKey,
        },
      ];
    }
    return [
      {
        keys: ['Ctrl', 'Enter'],
        matcher: (event: KeyboardEvent) =>
          event.key === 'Enter' && event.ctrlKey && !event.metaKey && !event.altKey,
      },
    ];
  }, [isMac]);
  const submitDisplayShortcuts = isMac ? submitShortcuts.slice(0, 1) : submitShortcuts;
  const renderKeyboardShortcut = () => (
    <div className="ml-2 text-xs text-muted-foreground flex items-center gap-2">
      {submitDisplayShortcuts.length > 1 ? (
        <KbdGroup>
          {submitDisplayShortcuts.map(({ keys }) => (
            <Kbd key={keys.join('+')}>
              {keys.map((keyLabel, keyIndex) => (
                <React.Fragment key={keyLabel}>
                  {keyIndex > 0 && ' + '}
                  {getKeySymbol(keyLabel)}
                </React.Fragment>
              ))}
            </Kbd>
          ))}
        </KbdGroup>
      ) : (
        <Kbd>
          {submitDisplayShortcuts[0].keys.map((keyLabel, keyIndex) => (
            <React.Fragment key={keyLabel}>
              {keyIndex > 0 && ' + '}
              {getKeySymbol(keyLabel)}
            </React.Fragment>
          ))}
        </Kbd>
      )}
    </div>
  );

  useEffect(() => {
    setStartTime(taskStartTime ?? new Date());
  }, [taskStartTime, task.id]);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('task_templates')
          .select('*')
          .eq('id', project.template_id)
          .single();
        
        if (error) throw error;
        
        setTemplate({
          ...data,
          column_config: Array.isArray(data.column_config) ? data.column_config as unknown as ColumnConfig[] : []
        } as TaskTemplate);
        
        // If audio-short modality, load the audio file URL
        if (data.modality === 'audio-short' && task.data?.drive_file_id) {
          try {
            const url = await getDriveFileUrl(task.data.drive_file_id);
            setAudioUrl(url);
          } catch (error) {
            console.error('Error loading audio file:', error);
            toast.error("Failed to load audio file");
          }
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        const fallbackTemplate = mockTemplates.find(t => t.id === project.template_id);
        setTemplate(fallbackTemplate || null);
      }
    };

    fetchTemplate();
  }, [project.template_id, task.data]);

  // Add Ctrl+Enter hotkey for submit (cross-platform)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isSubmitting) {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting]);

  // Force re-render when form data changes to handle conditional field visibility
  useEffect(() => {
    // This will trigger a re-render when formData changes, which will update conditional field visibility
  }, [formData]);

  const handleInputChange = (columnId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [columnId]: value
    }));
  };

  // Get template configuration for this project

  // Validate required fields based on template
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!template) {
      toast.error("Project template not found.");
      setIsSubmitting(false);
      return;
    }

    // Validate required fields (including conditional requirements)
    const requiredFields = template?.column_config?.filter(col => col.type === 'write' && isFieldRequired(col)) || [];
    const missingFields = requiredFields.filter(field => !formData[field.id]);

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.name).join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const completionTime = new Date();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const submissionResult = await submitAnswer({
        task,
        workerId: user.id,
        formData,
        startTime,
        completionTime,
      });

      const { answerId: answerIdData, questionIdentifier, ahtSeconds } = submissionResult;

      // Write to Google Sheet asynchronously (don't block UI)
      setTimeout(async () => {
        try {
          const findByName = (name: string) => template.column_config.find(c => c.name.toLowerCase() === name.toLowerCase());
          const merged = { ...(task.data || {}), ...(formData || {}) } as Record<string, any>;
          const v = (name: string) => {
            const col = findByName(name);
            return merged[col?.id || name] ?? merged[name] ?? '';
          };
          // Build dynamic columns and values based on template
          const baseColumns = ['Timestamp','Project','Row','Question ID','Answer ID','Worker Email'];
          const baseValues = [
            new Date().toISOString(),
            project.name || '',
            String((task.row_index ?? 0) + 1), // Add 1 to match Google Sheet row (accounting for header)
            questionIdentifier,
            answerIdData,
            user.email || ''
          ];
          
          // Create Answer JSON with actual field names (not internal IDs)
          const answerData: Record<string, any> = {};
          template.column_config
            .filter(col => col.type === 'write') // Only include writable fields
            .forEach(col => {
              if (formData[col.id] !== undefined && formData[col.id] !== null && formData[col.id] !== '') {
                answerData[col.name] = formData[col.id]; // Use actual field names like "Article Support"
              }
            });

          // Create the full answer JSON structure like in dashboard
          const fullAnswerJson = {
            answer_id: answerIdData,
            worker: {
              full_name: user.user_metadata?.full_name || 'Unknown Worker',
              email: user.email || 'unknown@example.com'
            },
            answer_data: answerData,
            start_time: startTime.toISOString(),
            completion_time: completionTime.toISOString(),
            aht_seconds: ahtSeconds
          };
          
          // Add JSON and AHT right after Worker Email (cols G and H)
          const jsonAndAhtColumns = ['Answer JSON', 'AHT (seconds)'];
          const jsonAndAhtValues = [
            JSON.stringify(fullAnswerJson, null, 2),
            ahtSeconds
          ];
          
          // Add all template columns (both read and write) after JSON and AHT
          const templateColumns = template.column_config.map(col => col.name);
          const templateValues = template.column_config.map(col => v(col.name));
          
          // Final order: Base columns → JSON & AHT → Template columns
          const allColumns = [...baseColumns, ...jsonAndAhtColumns, ...templateColumns];
          const allValues = [...baseValues, ...jsonAndAhtValues, ...templateValues];
          
          const columns = allColumns;
          const values = allValues;
          await supabase.functions.invoke('write-answer-to-sheet', {
            body: {
              sheetUrl: project.google_sheet_url,
              columns,
              values
            }
          });
        } catch (sheetErr) {
          console.warn('Failed to write to Google Sheet:', sheetErr);
        }
      }, 0);
      
      onComplete(formData, submissionResult);
      
      // Refresh the parent component to update question counts
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('answerSubmitted'));
      }
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(error.message || "Failed to save your work. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReadOnlyField = (column: ColumnConfig, value: any, compact: boolean = false) => {
    return <ReadOnlyField key={column.id} column={column} value={value} compact={compact} />;
  };

  // Helper function to check if a field should be shown based on conditional logic
  const shouldShowField = (column: ColumnConfig): boolean => {
    if (!column.conditional || !template) return true;
    
    // Find the column that this field depends on
    const dependsOnColumn = template.column_config.find(col => col.name === column.conditional.dependsOnColumn);
    if (!dependsOnColumn) {
      return true;
    }
    
    const dependsOnValue = formData[dependsOnColumn.id];
    const shouldShow = dependsOnValue === column.conditional.requiredValue;
    
    return shouldShow;
  };

  // Helper function to check if a field is required (including conditional requirements)
  const isFieldRequired = (column: ColumnConfig): boolean => {
    if (!column.conditional || !template) return column.required || false;
    
    // If conditional, it's required when the condition is met
    return shouldShowField(column) && column.required;
  };

  // Helper component to render label with optional tooltip
  const renderFieldLabel = (column: ColumnConfig) => (
    <div className="flex items-center gap-2">
      <Label htmlFor={column.id} className="text-sm font-medium">
        {column.name} {isFieldRequired(column) && <span className="text-destructive">*</span>}
      </Label>
      {column.tooltip && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm p-3 text-sm leading-relaxed shadow-lg border-0 bg-popover"
              side="top"
              align="start"
            >
              <div className="prose prose-sm max-w-none prose-headings:text-sm prose-p:text-sm prose-strong:text-sm">
                <ReactMarkdown>{column.tooltip}</ReactMarkdown>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const renderWritableField = (column: ColumnConfig) => {
    // Don't render if conditional logic says it shouldn't be shown
    if (!shouldShowField(column)) return null;
    
    const value = formData[column.id] || '';

    switch (column.inputType) {
      case 'text':
        return (
          <div key={column.id} className="space-y-2">
            {renderFieldLabel(column)}
            <Input
              id={column.id}
              value={value}
              onChange={(e) => handleInputChange(column.id, e.target.value)}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              onPaste={async (e) => {
                if (column.pastePreventionEnabled) {
                  e.preventDefault();
                  toast.error("Pasting is not allowed in this field");
                }
                if (column.pasteDetection) {
                  const pastedText = e.clipboardData.getData('text');
                  console.log(`[PASTE DETECTED] Column: ${column.name}, Task: ${task.id}, Time: ${new Date().toISOString()}`);
                  
                  // Log to database
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('task_answer_events').insert({
                        project_id: task.project_id,
                        task_id: task.id,
                        worker_id: user.id,
                        event_type: 'paste',
                        field_id: column.id,
                        field_name: column.name,
                        details: { 
                          pastedLength: pastedText.length,
                          timestamp: new Date().toISOString()
                        }
                      });
                    }
                  } catch (error) {
                    console.error('Failed to log paste event:', error);
                  }
                }
              }}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={column.id} className="space-y-2">
            {renderFieldLabel(column)}
            <Textarea
              id={column.id}
              value={value}
              onChange={(e) => handleInputChange(column.id, e.target.value)}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              rows={3}
              onPaste={async (e) => {
                if (column.pastePreventionEnabled) {
                  e.preventDefault();
                  toast.error("Pasting is not allowed in this field");
                }
                if (column.pasteDetection) {
                  const pastedText = e.clipboardData.getData('text');
                  console.log(`[PASTE DETECTED] Column: ${column.name}, Task: ${task.id}, Time: ${new Date().toISOString()}`);
                  
                  // Log to database
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('task_answer_events').insert({
                        project_id: task.project_id,
                        task_id: task.id,
                        worker_id: user.id,
                        event_type: 'paste',
                        field_id: column.id,
                        field_name: column.name,
                        details: { 
                          pastedLength: pastedText.length,
                          timestamp: new Date().toISOString()
                        }
                      });
                    }
                  } catch (error) {
                    console.error('Failed to log paste event:', error);
                  }
                }
              }}
            />
          </div>
        );

      case 'select':
        return (
          <div key={column.id} className="space-y-2">
            {renderFieldLabel(column)}
            <Select value={value} onValueChange={(val) => handleInputChange(column.id, val)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${column.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map((option) => {
                  const optionColor = column.optionColors?.[option] || '#3b82f6';
                  return (
                    <SelectItem key={option} value={option}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300" 
                          style={{ backgroundColor: optionColor }}
                        />
                        {option}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );

      case 'radio':
        return (
          <div key={column.id} className="space-y-2">
            {renderFieldLabel(column)}
            <RadioGroup
              value={value}
              onValueChange={(val) => handleInputChange(column.id, val)}
            >
              {column.options?.map((option) => {
                const optionColor = column.optionColors?.[option] || '#3b82f6';
                return (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${column.id}_${option}`} />
                    <Label htmlFor={`${column.id}_${option}`} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300" 
                        style={{ backgroundColor: optionColor }}
                      />
                      {option}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 'rating':
        const maxRating = column.validation?.max || 5;
        return (
          <div key={column.id} className="space-y-2">
            {renderFieldLabel(column)}
            <div className="flex items-center space-x-1">
              {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleInputChange(column.id, rating)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      rating <= (value || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {value ? `${value}/${maxRating}` : 'Not rated'}
              </span>
            </div>
          </div>
        );

      case 'number':
        return (
          <div key={column.id} className="space-y-2">
            {renderFieldLabel(column)}
            <Input
              id={column.id}
              type="number"
              value={value}
              onChange={(e) => handleInputChange(column.id, parseFloat(e.target.value) || '')}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              min={column.validation?.min}
              max={column.validation?.max}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Instructions */}
      <div className="flex justify-between items-center">
        <div></div>
        <ProjectInstructions project={project} />
      </div>

      {template && (
        <>
          {/* Audio Player for audio-short modality */}
          {template.modality === 'audio-short' && audioUrl && (
            <AudioShortformPlayer audioUrl={audioUrl} />
          )}

          {/* Read-only fields */}
          {template.modality !== 'audio-short' && (
            <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Step 1: Review the Focus Fields</h3>
              {(() => {
                const cols = template.column_config.filter(col => col.type === 'read' && !col.hidden);
                const getVal = (c: ColumnConfig) => (task.data?.[c.id] ?? task.data?.[c.name] ?? (c.columnLetter ? task.data?.[c.columnLetter] : undefined));
                const byName = (name: string) => cols.find(c => c.name.toLowerCase() === name.toLowerCase());
                const cArticle = byName('Wikipedia Article');
                const cSection = byName('Wikipedia Section');
                const cLink = byName('Wikipedia Section Link');
                const cQuestion = byName('Question');
                const cAnswer = byName('Answer');
                const cNotes = byName('Notes/Context');
                const reserved = new Set([cArticle?.id, cSection?.id, cLink?.id, cQuestion?.id, cAnswer?.id, cNotes?.id].filter(Boolean) as string[]);
                const others = cols.filter(c => !reserved.has(c.id));
                return (
                  <div className="space-y-2">
                    {/* Row 1: thirds */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {cArticle && (
                        <div key={cArticle.id} className="space-y-2 min-w-0">
                          <Label className="text-sm font-medium">{cArticle.name}</Label>
                          <div className="p-3 bg-muted rounded-md text-sm truncate">
                            {String(getVal(cArticle) || 'N/A')}
                          </div>
                        </div>
                      )}
                      {cSection && (
                        <div key={cSection.id} className="space-y-2 min-w-0">
                          <Label className="text-sm font-medium">{cSection.name}</Label>
                          <div className="p-3 bg-muted rounded-md text-sm truncate">
                            {String(getVal(cSection) || 'N/A')}
                          </div>
                        </div>
                      )}
                      {cLink && (
                        <div key={cLink.id} className="space-y-2 min-w-0">
                          <Label className="text-sm font-medium">{cLink.name}</Label>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-3 bg-muted rounded-md text-sm truncate flex-1">
                              {String(getVal(cLink) || 'N/A')}
                            </div>
                            {getVal(cLink) && typeof getVal(cLink) === 'string' && /https?:\/\//i.test(getVal(cLink)) && (
                              <a
                                href={getVal(cLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open link"
                                className="inline-flex items-center justify-center h-9 w-9 rounded-md border hover:bg-muted shrink-0"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Row 2: 50/50 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cQuestion && renderReadOnlyField(cQuestion, getVal(cQuestion))}
                      {cAnswer && renderReadOnlyField(cAnswer, getVal(cAnswer))}
                    </div>
                    {/* Row 3: Notes full width, greyed */}
                    {cNotes && (
                      <div className="opacity-80">
                        {renderReadOnlyField(cNotes, getVal(cNotes))}
                      </div>
                    )}
                    {/* Any other read-only fields */}
                    {others.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {others.map(c => renderReadOnlyField(c, getVal(c)))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          )}

          {/* Writable fields */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Step 2: Complete the Response Fields</h3>
              <div className="space-y-2">
                {template?.column_config
                  ?.filter(col => col.type === 'write')
                  ?.map(column => renderWritableField(column))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Task'}
        </Button>
        {renderKeyboardShortcut()}
      </div>
    </form>
  );
};

export default TaskForm;
