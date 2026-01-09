import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Task, Project, ColumnConfig, TaskTemplate } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';
import { ExternalLink, HelpCircle, UserCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import ProjectInstructions from './ProjectInstructions';
import { submitAnswer } from '@/lib/answers';

interface ChatbotEvalFormProps {
  task: Task;
  project: Project;
  taskStartTime: Date | null;
  onComplete: (data: Record<string, unknown>) => void;
  onSkip: () => void;
}

// Helper to get scale label from numeric value
const getScaleLabel = (value: number, maxValue: number): { label: string; color: string } => {
  if (maxValue === 3 && [0, 1, 2, 3].includes(value)) {
    // 0,1,2,3 scale
    if (value === 0) return { label: 'Not Relevant', color: '#000000' };
    if (value === 1) return { label: 'Major Issue(s)', color: '#ef4444' }; // red-600
    if (value === 2) return { label: 'Minor Issue(s)', color: '#000000' };
    return { label: 'No Issues', color: '#22c55e' }; // green-600
  } else {
    // 1,2,3 scale (no "Not Relevant")
    if (value === 1) return { label: 'Major Issue(s)', color: '#ef4444' };
    if (value === 2) return { label: 'Minor Issue(s)', color: '#000000' };
    return { label: 'No Issues', color: '#22c55e' };
  }
};

// Helper to check if a question should be shown based on conditional logic
const shouldShowQuestion = (
  column: ColumnConfig,
  formData: Record<string, any>,
  template: TaskTemplate | null
): boolean => {
  if (!column.conditional || !template) return true;
  
  // Find the column this field depends on
  const dependsOnColumn = template.column_config.find(
    col => col.id === column.conditional!.dependsOnColumn || col.name === column.conditional!.dependsOnColumn
  );
  
  if (!dependsOnColumn) return true;
  
  const dependsOnValue = formData[dependsOnColumn.id];
  return dependsOnValue === column.conditional!.requiredValue;
};

// Check if a question should show based on parent question answer (for issue explanations)
const shouldShowIssueExplanation = (
  columnId: string,
  formData: Record<string, any>,
  template: TaskTemplate | null
): boolean => {
  if (!template) return true;
  
  // Questions like test_audio_understanding_issue_explanation depend on test_audio_understanding
  if (columnId.includes('_issue_explanation') && !columnId.includes('_understanding_issue')) {
    // Extract parent question ID (e.g., "test_audio_understanding" from "test_audio_understanding_issue_explanation")
    const parentId = columnId.replace(/_issue_explanation$/, '');
    const parentColumn = template.column_config.find(c => c.id === parentId);
    
    if (parentColumn) {
      const parentValue = formData[parentId];
      // Show if parent answered with an issue (not "3" for No Issues, not "0" for Not Relevant)
      if (parentValue && parentValue !== '3' && parentValue !== '0') {
        return true;
      }
      return false;
    }
  }
  
  // Questions like test_audio_understanding_issue_0, test_audio_understanding_issue_1 depend on test_audio_understanding_issue_explanation
  if (columnId.match(/_issue_\d+$/) && !columnId.includes('_issue_explanation')) {
    const explanationId = columnId.replace(/_issue_\d+$/, '_issue_explanation');
    const explanationColumn = template.column_config.find(c => c.id === explanationId);
    
    if (explanationColumn) {
      const explanationValue = formData[explanationId];
      // Show if explanation was provided (text field has value)
      return Boolean(explanationValue && explanationValue.trim());
    }
  }
  
  return true;
};

const ChatbotEvalForm: React.FC<ChatbotEvalFormProps> = ({ 
  task, 
  project, 
  taskStartTime, 
  onComplete, 
  onSkip 
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date>(() => taskStartTime ?? new Date());
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['section-1', 'section-2', 'section-3']);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);

  useEffect(() => {
    setStartTime(taskStartTime ?? new Date());
  }, [taskStartTime, task.id]);

  // Auto-expand all questions when template loads
  useEffect(() => {
    if (template && template.column_config) {
      const radioQuestionIds = template.column_config
        .filter(col => col.type === 'write' && col.inputType === 'radio')
        .map(col => col.id);
      setExpandedQuestions(radioQuestionIds);
    }
  }, [template]);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('task_templates')
          .select('*')
          .eq('id', project.template_id)
          .single();
        
        if (error) throw error;
        
        const parsedTemplate = {
          ...data,
          column_config: Array.isArray(data.column_config) ? data.column_config as unknown as ColumnConfig[] : []
        } as TaskTemplate;
        
        setTemplate(parsedTemplate);
      } catch (error) {
        console.error('Error fetching template:', error);
        toast.error('Failed to load template');
      }
    };

    fetchTemplate();
  }, [project.template_id]);

  const handleInputChange = (columnId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [columnId]: value
    }));
    
    // Clear the field from missing required fields if it now has a value
    if (value !== undefined && value !== null && value !== '') {
      setMissingRequiredFields(prev => prev.filter(id => id !== columnId));
    }
  };

  // Group columns by section prefix
  const sectionColumns = useMemo(() => {
    if (!template) return { test: [], base: [], sxs: [] };
    
    const testCols = template.column_config.filter(col => 
      col.type === 'write' && col.id.startsWith('test_')
    );
    const baseCols = template.column_config.filter(col => 
      col.type === 'write' && col.id.startsWith('base_')
    );
    const sxsCols = template.column_config.filter(col => 
      col.type === 'write' && col.id.startsWith('sxs_')
    );
    
    return { test: testCols, base: baseCols, sxs: sxsCols };
  }, [template]);

  // Get conversation data
  const conversation = useMemo(() => {
    if (Array.isArray(task.data?.conversation)) {
      return task.data.conversation as string[];
    }
    return [];
  }, [task.data]);

  // Calculate remaining required questions
  const remainingRequiredCount = useMemo(() => {
    if (!template) return 0;
    
    return template.column_config.filter(column => {
      // Only check write columns
      if (column.type !== 'write') return false;
      
      // Check if question is currently visible based on conditional logic
      if (!shouldShowQuestion(column, formData, template)) return false;
      
      // Check if question should be shown based on issue explanation logic
      if (!shouldShowIssueExplanation(column.id, formData, template)) return false;
      
      // Check if field is required
      if (!column.conditional && !column.required) return false;
      if (column.conditional && !shouldShowQuestion(column, formData, template)) return false;
      if (column.conditional && !column.required) return false;
      
      // Check if field has a value (not empty)
      const value = formData[column.id];
      const isEmpty = value === undefined || value === null || value === '';
      
      return isEmpty;
    }).length;
  }, [template, formData]);

  // Helper to get section goal and prompt from task.data
  const getSectionGoalAndPrompt = (sectionPrefix: 'test_' | 'base_'): { goal: string | null; prompt: string | null } => {
    const goalKey = `${sectionPrefix}goal`;
    const promptKey = `${sectionPrefix}prompt`;
    
    // First try direct access via prefix
    const goal = task.data?.[goalKey] || task.data?.[goalKey.toUpperCase()] || null;
    const prompt = task.data?.[promptKey] || task.data?.[promptKey.toUpperCase()] || null;
    
    // Fallback: try finding in template column_config
    if (!goal || !prompt) {
      const goalColumn = template?.column_config.find(c => 
        c.id === goalKey || c.name.toLowerCase() === goalKey.toLowerCase()
      );
      const promptColumn = template?.column_config.find(c => 
        c.id === promptKey || c.name.toLowerCase() === promptKey.toLowerCase()
      );
      
      if (goalColumn && !goal) {
        const goalValue = task.data?.[goalColumn.id] || task.data?.[goalColumn.name] || null;
        if (goalValue) return { goal: String(goalValue), prompt: prompt ? String(prompt) : null };
      }
      
      if (promptColumn && !prompt) {
        const promptValue = task.data?.[promptColumn.id] || task.data?.[promptColumn.name] || null;
        if (promptValue) return { goal: goal ? String(goal) : null, prompt: String(promptValue) };
      }
    }
    
    return {
      goal: goal ? String(goal) : null,
      prompt: prompt ? String(prompt) : null
    };
  };

  // Component for section field label with tooltip (goal/prompt)
  const SectionFieldLabel: React.FC<{ label: string; tooltip?: string }> = ({ label, tooltip }) => {
    const [tooltipOpen, setTooltipOpen] = React.useState(false);
    
    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm font-semibold">{label}</Label>
        {tooltip && (
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
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };
  
  // Render section header with goal and prompt
  const renderSectionHeader = (sectionPrefix: 'test_' | 'base_', sectionTitle: string) => {
    const { goal, prompt } = getSectionGoalAndPrompt(sectionPrefix);
    
    // Don't render if both are missing
    if (!goal && !prompt) return null;
    
    // Get tooltip from column config if available
    const goalKey = `${sectionPrefix}goal`;
    const promptKey = `${sectionPrefix}prompt`;
    const goalColumn = template?.column_config.find(c => 
      c.id === goalKey || c.name.toLowerCase() === goalKey.toLowerCase()
    );
    const promptColumn = template?.column_config.find(c => 
      c.id === promptKey || c.name.toLowerCase() === promptKey.toLowerCase()
    );
    
    return (
      <div className="mb-6 pb-4 border-b">
        <div className="flex gap-3">
          {/* Icon at level 0 */}
          <div className="flex-shrink-0 pt-0.5">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          
          {/* All content at level 1 (indented from icon) */}
          <div className="flex-1 space-y-4">
            {goal && (
              <div className="space-y-2">
                <SectionFieldLabel label="User goal:" tooltip={goalColumn?.tooltip} />
                <p className="text-sm whitespace-pre-wrap">{goal}</p>
              </div>
            )}
            {prompt && (
              <div className="space-y-2">
                <SectionFieldLabel label="Initial prompt:" tooltip={promptColumn?.tooltip} />
                <p className="text-sm whitespace-pre-wrap">{prompt}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Component for field label with tooltip
  const FieldLabel: React.FC<{ column: ColumnConfig; isMissing?: boolean }> = ({ column, isMissing = false }) => {
    const [tooltipOpen, setTooltipOpen] = React.useState(false);
    
    if (!column.name) return null;
    
    return (
      <div className="flex items-center gap-2">
        <Label className={`text-sm font-medium ${isMissing ? 'text-red-600' : ''}`}>
          {column.name}
          {column.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
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
    );
  };
  
  // Render field label with tooltip
  const renderFieldLabel = (column: ColumnConfig) => {
    const isMissing = missingRequiredFields.includes(column.id);
    return <FieldLabel column={column} isMissing={isMissing} />;
  };

  // Render a question field based on its type
  const renderQuestionField = (column: ColumnConfig) => {
    // Check conditional logic
    if (!shouldShowQuestion(column, formData, template)) {
      return null;
    }
    
    // Check issue explanation logic
    if (!shouldShowIssueExplanation(column.id, formData, template)) {
      return null;
    }
    
    const value = formData[column.id] || '';
    
    // Radio buttons with collapsible structure
    if (column.inputType === 'radio' && column.options) {
      const isExpanded = expandedQuestions.includes(column.id);
      
      return (
        <div key={column.id} className="mb-4">
          <div className="rounded-md overflow-hidden">
            {/* Toggle button and question label */}
            <div className="flex">
              {/* Toggle button - 48px wide at indent level 0 */}
              <button
                type="button"
                onClick={() => {
                  setExpandedQuestions(prev => 
                    prev.includes(column.id) 
                      ? prev.filter(id => id !== column.id)
                      : [...prev, column.id]
                  );
                }}
                className="w-12 flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0 bg-transparent"
                aria-label={isExpanded ? 'Collapse question' : 'Expand question'}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Question label - indent level 1 */}
              <div className="flex-1 py-4 pr-4">
                <div className="my-4">
                  {renderFieldLabel(column)}
                </div>
              </div>
            </div>
            
            {/* Options - shown when expanded */}
            {isExpanded && (
              <div className="pl-12 pr-4 pb-4">
                <RadioGroup
                  value={String(value)}
                  onValueChange={(val) => handleInputChange(column.id, val)}
                >
                  <div className="flex flex-wrap gap-8">
                    {column.options.map((option) => {
                      // Use actual option colors and labels from column config
                      let displayLabel = option; // Default: use the option value as label
                      let displayColor = '#000000'; // Default: black
                      
                      // First check if column has optionColors defined
                      if (column.optionColors && column.optionColors[option]) {
                        displayColor = column.optionColors[option];
                        displayLabel = option;
                      } else {
                        // Fallback to hardcoded scale labels ONLY for numeric options
                        const numVal = parseInt(option);
                        if (!isNaN(numVal)) {
                          const allNumeric = column.options.every(opt => !isNaN(parseInt(opt)));
                          if (allNumeric) {
                            const maxValue = Math.max(...column.options.map(opt => parseInt(opt)));
                            const scaleLabel = getScaleLabel(numVal, maxValue);
                            displayLabel = scaleLabel.label;
                            displayColor = scaleLabel.color;
                          }
                        }
                      }
                      
                      return (
                        <div key={option} className="flex items-center">
                          <label 
                            htmlFor={`${column.id}_${option}`}
                            className="flex items-center gap-3 cursor-pointer p-2 -ml-2 hover:opacity-80"
                          >
                            <RadioGroupItem 
                              value={option} 
                              id={`${column.id}_${option}`}
                              className="h-5 w-5 flex-shrink-0"
                            />
                            <span 
                              className="text-sm"
                              style={{ color: displayColor }}
                            >
                              {displayLabel}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Text input
    if (column.inputType === 'text') {
      return (
        <div key={column.id} className="mb-4">
          <div className="py-4 px-4">
            <div className="my-4">
              {renderFieldLabel(column)}
            </div>
            <Input
              id={column.id}
              value={value}
              onChange={(e) => handleInputChange(column.id, e.target.value)}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              className="focus-visible:ring-offset-0"
            />
          </div>
        </div>
      );
    }
    
    // Textarea
    if (column.inputType === 'textarea') {
      return (
        <div key={column.id} className="mb-4">
          <div className="py-4 px-4">
            <div className="my-4">
              {renderFieldLabel(column)}
            </div>
            <Textarea
              id={column.id}
              value={value}
              onChange={(e) => handleInputChange(column.id, e.target.value)}
              placeholder={`Enter ${column.name.toLowerCase()}`}
              rows={3}
              className="focus-visible:ring-offset-0"
            />
          </div>
        </div>
      );
    }
    
    // Select dropdown
    if (column.inputType === 'select' && column.options) {
      return (
        <div key={column.id} className="mb-4">
          <div className="py-4 px-4">
            <div className="my-4">
              {renderFieldLabel(column)}
            </div>
            <Select value={value} onValueChange={(val) => handleInputChange(column.id, val)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${column.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {column.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }
    
    // Checkbox (for multi-select issues - options are [true, false] or ['true', 'false'])
    if (column.options && column.options.length === 2) {
      const hasBooleanOptions = column.options.some(opt => 
        opt === true || opt === false || opt === 'true' || opt === 'false'
      );
      
      if (hasBooleanOptions) {
        return (
          <div key={column.id} className="flex items-center space-x-2 mb-4">
            <Checkbox
              id={column.id}
              checked={value === true || value === 'true' || value === 'True'}
              onCheckedChange={(checked) => {
                // Store as string 'true' or 'false' for consistency
                handleInputChange(column.id, checked ? 'true' : 'false');
              }}
            />
            <Label htmlFor={column.id} className="cursor-pointer">
              {column.name}
            </Label>
          </div>
        );
      }
    }
    
    return null;
  };

  // Check if field is required
  const isFieldRequired = (column: ColumnConfig): boolean => {
    if (!column.conditional) return column.required || false;
    return shouldShowQuestion(column, formData, template) && (column.required || false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!template) {
      toast.error("Project template not found.");
      setIsSubmitting(false);
      return;
    }

    // Validate required fields
    const requiredFields = template.column_config.filter(col => 
      col.type === 'write' && isFieldRequired(col)
    );
    const missingFields = requiredFields.filter(field => !formData[field.id]);

    if (missingFields.length > 0) {
      setMissingRequiredFields(missingFields.map(f => f.id));
      toast.error(`Unable to submit: ${missingFields.length} required question${missingFields.length !== 1 ? 's' : ''} remaining. Please scroll through the form to find all unanswered required questions (highlighted in red).`);
      setIsSubmitting(false);
      return;
    }
    
    // Clear any previous missing field highlights on successful submission
    setMissingRequiredFields([]);

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
        requiresReview: Boolean(template?.review_enabled),
      });

      const { questionIdentifier, answerId, ahtSeconds } = submissionResult;

      // Write to Google Sheet (same pattern as TaskForm)
      const sheetUrl = project.google_sheet_url || '';
      const shouldSyncSheet = /\/spreadsheets\/d\//i.test(sheetUrl);

      if (shouldSyncSheet && template) {
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
            const baseColumns = ['Timestamp', 'Project', 'Row', 'Question ID', 'Answer ID', 'Worker Email'];
            const baseValues = [
              new Date().toISOString(),
              project.name || '',
              String((task.row_index ?? 0) + 1), // Add 1 to match Google Sheet row (accounting for header)
              questionIdentifier,
              answerId,
              user.email || ''
            ];
            
            // Create Answer JSON with actual field names (not internal IDs)
            const answerData: Record<string, any> = {};
            template.column_config
              .filter(col => col.type === 'write') // Only include writable fields
              .forEach(col => {
                if (formData[col.id] !== undefined && formData[col.id] !== null && formData[col.id] !== '') {
                  answerData[col.name] = formData[col.id]; // Use actual field names
                }
              });

            // Create the full answer JSON structure
            const fullAnswerJson = {
              answer_id: answerId,
              worker: {
                full_name: user.user_metadata?.full_name || 'Unknown Worker',
                email: user.email || 'unknown@example.com'
              },
              answer_data: answerData,
              start_time: startTime.toISOString(),
              completion_time: completionTime.toISOString(),
              aht_seconds: ahtSeconds
            };
            
            // Add JSON and AHT right after Worker Email
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
            
            await supabase.functions.invoke('write-answer-to-sheet', {
              body: {
                sheetUrl,
                columns: allColumns,
                values: allValues
              }
            });
          } catch (sheetErr) {
            console.warn('Failed to write to Google Sheet:', sheetErr);
          }
        }, 0);
      }

      toast.success('Task submitted successfully');
      onComplete(formData);
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(error.message || "Failed to save your work. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div>Loading template...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Instructions */}
      <div className="flex justify-between items-center">
        <div></div>
        <ProjectInstructions project={project} />
      </div>

      {/* Conversation Display */}
      {conversation.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Conversation</h3>
            <div className="space-y-4">
              {conversation.map((msg, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-md">
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {msg}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Three Sections */}
      <Accordion 
        type="multiple" 
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-4"
      >
        {/* Section 1: Interaction A (test_) */}
        <AccordionItem 
          value="section-1" 
          className="rounded-lg px-4" 
          style={{ 
            backgroundColor: 'hsl(46deg 88% 94%)',
            borderColor: 'hsl(45deg 97% 60%)',
            borderWidth: '1px'
          }}
        >
          <AccordionTrigger className="text-lg font-semibold">
            Section 1: Gemini Experience
          </AccordionTrigger>
          <AccordionContent>
            <div className="py-4">
              {renderSectionHeader('test_', 'Section 1: Gemini Experience')}
              {sectionColumns.test.map(column => renderQuestionField(column))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Interaction B (base_) */}
        <AccordionItem 
          value="section-2" 
          className="rounded-lg px-4" 
          style={{ 
            backgroundColor: 'hsl(46deg 88% 94%)',
            borderColor: 'hsl(45deg 97% 60%)',
            borderWidth: '1px'
          }}
        >
          <AccordionTrigger className="text-lg font-semibold">
            Section 2: Competitor Experience
          </AccordionTrigger>
          <AccordionContent>
            <div className="py-4">
              {renderSectionHeader('base_', 'Section 2: Competitor Experience')}
              {sectionColumns.base.map(column => renderQuestionField(column))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Side-by-Side Comparison (sxs_) */}
        <AccordionItem 
          value="section-3" 
          className="rounded-lg px-4" 
          style={{ 
            backgroundColor: 'hsl(46deg 88% 94%)',
            borderColor: 'hsl(45deg 97% 60%)',
            borderWidth: '1px'
          }}
        >
          <AccordionTrigger className="text-lg font-semibold">
            Section 3: Side-by-Side Comparison
          </AccordionTrigger>
          <AccordionContent>
            <div className="py-4">
              {sectionColumns.sxs.map(column => renderQuestionField(column))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Progress Indicator */}
      <div className="text-sm text-center">
        {remainingRequiredCount > 0 ? (
          <span className="text-orange-600 font-medium">
            {remainingRequiredCount} required question{remainingRequiredCount !== 1 ? 's' : ''} remaining
          </span>
        ) : (
          <span className="text-green-600 font-medium">
            All required questions answered
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {project.enable_skip_button && (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
          >
            Skip
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Task'}
        </Button>
      </div>
    </form>
  );
};

export default ChatbotEvalForm;

