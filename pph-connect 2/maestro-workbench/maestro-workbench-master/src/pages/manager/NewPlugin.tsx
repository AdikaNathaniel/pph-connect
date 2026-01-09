import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Copy, Save, Eye, EyeOff, Info, CheckSquare, Square, Clipboard, Download, Upload, FileJson } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { ColumnConfig, TaskTemplate, Modality, ModalityConfig, LabelOntology } from '@/types';
import { toast } from "sonner";
import { useNavigate, useParams } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MODALITY_PRESETS } from '@/lib/modalityPresets';
import { MODALITY_TEMPLATES } from '@/lib/modalityTemplates';
import CustomModalityBuilder from '@/components/modality/CustomModalityBuilder';
import {
  listCustomModalities,
  createCustomModality,
  deleteCustomModality,
  type CustomModalityRecord,
} from '@/services/customModalityService';
import { MODALITY_TEMPLATES } from '@/lib/modalityTemplates';

interface SheetData {
  headers: string[];
  sampleRow: Record<string, any>;
  questionNames?: Record<string, string>;
  isTwoRowHeader?: boolean;
}

interface TemplateFormData {
  name: string;
  description: string;
  google_sheet_url: string;
  modality: Modality;
  modality_config: ModalityConfig;
  label_ontology?: LabelOntology | null;
}

type ModalityPresetId = keyof typeof MODALITY_PRESETS;
type TemplateId = keyof typeof MODALITY_TEMPLATES;
type TemplateId = keyof typeof MODALITY_TEMPLATES;

const getColumnLetter = (index: number): string => {
  let letter = '';
  let num = index;
  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
};

const defaultReviewStageConfig: ReviewStageConfigForm = {
  ratingMax: 5,
  highlightTags: ['Accuracy', 'Punctuation', 'Guidelines', 'Label'],
  feedbackEnabled: true,
  internalNotesEnabled: true,
};

// Preset option templates for common radio button scales
const PRESET_TEMPLATES = {
  '0-3-scale': {
    name: '0-3 Scale (Not Relevant, Major, Minor, No Issues)',
    options: ['0', '1', '2', '3'],
    optionColors: {
      '0': '#000000', // Black for Not Relevant
      '1': '#ef4444', // Red for Major Issues
      '2': '#000000', // Black for Minor Issues
      '3': '#22c55e', // Green for No Issues
    },
  },
  '1-3-scale': {
    name: '1-3 Scale (Major, Minor, No Issues)',
    options: ['1', '2', '3'],
    optionColors: {
      '1': '#ef4444', // Red for Major Issues
      '2': '#000000', // Black for Minor Issues
      '3': '#22c55e', // Green for No Issues
    },
  },
  '1-5-scale': {
    name: '1-5 Scale (Quality Rating)',
    options: ['1', '2', '3', '4', '5'],
    optionColors: {
      '1': '#ef4444', // Red for lowest
      '2': '#f97316', // Orange
      '3': '#eab308', // Yellow
      '4': '#84cc16', // Light green
      '5': '#22c55e', // Green for highest
    },
  },
  'yes-no': {
    name: 'Yes/No (True/False)',
    options: ['Yes', 'No'],
    optionColors: {
      'Yes': '#22c55e', // Green
      'No': '#ef4444', // Red
    },
  },
};

const NewPlugin = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    google_sheet_url: '',
    modality: 'spreadsheet', // Default to spreadsheet for backward compatibility
    modality_config: {},
    label_ontology: null
  });
  const [newHighlightTag, setNewHighlightTag] = useState('');
  const [copiedOptions, setCopiedOptions] = useState<{ options: string[]; optionColors: Record<string, string> } | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  const [bulkApplyDialogOpen, setBulkApplyDialogOpen] = useState(false);
  const [sourceColumnForBulk, setSourceColumnForBulk] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [copyFromPluginDialogOpen, setCopyFromPluginDialogOpen] = useState(false);
  const [availablePlugins, setAvailablePlugins] = useState<Array<{ id: string; name: string; modality: string }>>([]);
  const [selectedPluginToCopy, setSelectedPluginToCopy] = useState<string>('');
  const [customModalities, setCustomModalities] = useState<CustomModalityRecord[]>([]);
  const [customModalitiesLoading, setCustomModalitiesLoading] = useState(false);

  const refreshCustomModalities = useCallback(async () => {
    setCustomModalitiesLoading(true);
    try {
      const rows = await listCustomModalities();
      setCustomModalities(rows);
    } finally {
      setCustomModalitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit) {
      fetchTemplate();
    }
    refreshCustomModalities();
  }, [id, isEdit, refreshCustomModalities]);

  const fetchTemplate = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        name: data.name,
        description: data.description || '',
        google_sheet_url: data.google_sheet_url,
        modality: data.modality || 'spreadsheet',
        modality_config: (data.modality_config as ModalityConfig) || {},
        label_ontology: (data.label_ontology as LabelOntology) || null
      });
      
      const savedConfigs = (data.column_config as unknown as ColumnConfig[]) || [];
      setColumnConfigs(savedConfigs);
      
      // Auto-load sheet data to enable editing
      if (data.google_sheet_url && savedConfigs.length > 0) {
        await loadSheetDataForEdit(data.google_sheet_url, savedConfigs);
      }
    } catch (error: any) {
      console.error('Error fetching template:', error);
      toast.error("Failed to load plugin");
    } finally {
      setLoading(false);
    }
  };

  const loadSheetDataForEdit = async (sheetUrl: string, savedConfigs: ColumnConfig[]) => {
    try {
      console.log('Loading sheet data for edit:', sheetUrl);
      const { data, error } = await supabase.functions.invoke('load-sheet-data', {
        body: { sheetUrl }
      });

      console.log('load-sheet-data for edit response:', { data, error });
      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to load sheet data');
      }
      
      setSheetData({
        headers: data.headers,
        sampleRow: data.sampleRow
      });
    } catch (error: any) {
      console.error('Error loading sheet for edit:', error);
      toast("Could not load sheet data preview. You can still edit the plugin configuration.");
    }
  };

  const handleInputChange = (field: keyof TemplateFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyPreset = (presetId: ModalityPresetId) => {
    const preset = MODALITY_PRESETS[presetId];
    if (!preset) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      modality: preset.modality,
      description: prev.description || preset.description,
      modality_config: JSON.parse(JSON.stringify(preset.modalityConfig)),
    }));
    setColumnConfigs(preset.defaultColumns.map((column) => ({ ...column })));
    setSheetData(null);
    toast.success(`Applied ${preset.label} preset`);
  };

  const handleApplyTemplate = (templateId: TemplateId) => {
    const template = MODALITY_TEMPLATES[templateId];
    if (!template) return;
    setFormData((prev) => ({
      ...prev,
      modality: template.modality,
      description: prev.description || template.description,
      modality_config: JSON.parse(JSON.stringify(template.modalityConfig)),
    }));
    setColumnConfigs(template.columns.map((column) => ({ ...column })));
    setSheetData(null);
    toast.success(`Applied ${template.label} template`);
  };

  const handleCreateCustomModality = async (values: {
    name: string;
    modalityKey: string;
    description: string;
    modalityConfig: ModalityConfig;
    columnConfig: ColumnConfig[];
    annotationTools: string[];
    validationRules: Record<string, unknown>;
  }) => {
    const record = await createCustomModality({
      name: values.name,
      modalityKey: values.modalityKey,
      description: values.description,
      modalityConfig: values.modalityConfig,
      columnConfig: values.columnConfig,
      annotationTools: values.annotationTools,
      validationRules: values.validationRules,
    });
    if (record) {
      setCustomModalities((prev) => [record, ...prev]);
      setFormData((prev) => ({
        ...prev,
        modality: record.modality_key as Modality,
        description: prev.description || record.description || '',
        modality_config: record.modality_config,
      }));
      setColumnConfigs(record.column_config);
      toast.success('Custom modality applied to plugin builder');
    }
  };

  const handleApplyCustomModality = (record: CustomModalityRecord) => {
    setFormData((prev) => ({
      ...prev,
      modality: record.modality_key as Modality,
      description: prev.description || record.description || '',
      modality_config: record.modality_config,
    }));
    setColumnConfigs(record.column_config);
    toast.success(`Applied ${record.name}`);
  };

  const handleDeleteCustomModality = async (record: CustomModalityRecord) => {
    await deleteCustomModality(record.id);
    setCustomModalities((prev) => prev.filter((row) => row.id !== record.id));
    toast.success(`Deleted ${record.name}`);
  };

  const handleApplyTemplate = (templateId: TemplateId) => {
    const template = MODALITY_TEMPLATES[templateId];
    if (!template) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      modality: template.modality,
      description: prev.description || template.description,
      modality_config: JSON.parse(JSON.stringify(template.modalityConfig)),
    }));
    setColumnConfigs(template.columns.map((column) => ({ ...column })));
    setSheetData(null);
    toast.success(`Applied ${template.label} template`);
  };

  const handleLoadSheet = async () => {
    if (!formData.google_sheet_url) {
      toast.error("Please enter a Google Sheet URL first");
      return;
    }

    setLoadingSheet(true);
    try {
      console.log('Sending sheet URL to load-sheet-data:', formData.google_sheet_url);
      const { data, error } = await supabase.functions.invoke('load-sheet-data', {
        body: { sheetUrl: formData.google_sheet_url }
      });

      console.log('load-sheet-data response:', { data, error });
      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to load sheet data');
      }
      
      const sheetData: SheetData = {
        headers: data.headers,
        sampleRow: data.sampleRow
      };
      
      // Only reset configs if we don't have any (new plugin)
      // Otherwise preserve existing configs when reloading sheet
      if (columnConfigs.length === 0) {
        const isTwoRowHeader = data.isTwoRowHeader || false;
        const questionNames = data.questionNames || {};
        
        const initialConfigs: ColumnConfig[] = data.headers.map((header: string, index: number) => {
          // Use header (Row 1) as ID - it should already have prefix for chatbot-eval
          // If it starts with test_, base_, or sxs_, use it as-is
          // Otherwise, generate col-{index} as fallback
          let columnId = header;
          if (!header.startsWith('test_') && !header.startsWith('base_') && !header.startsWith('sxs_')) {
            columnId = `col-${index}`;
          }
          
          // Use question text from Row 2 if available, otherwise use header
          const questionText = isTwoRowHeader ? (questionNames[header] || header) : header;
          
          // Auto-detect type for chatbot-eval modality
          // test_goal, test_prompt, base_goal, base_prompt are read-only
          const isReadOnly = header === 'test_goal' || header === 'test_prompt' || 
                           header === 'base_goal' || header === 'base_prompt';
          
          // Auto-detect if it's a goal/prompt field to set appropriate name
          let displayName = questionText;
          if (header === 'test_goal' || header === 'base_goal') {
            displayName = questionText || 'User goal:';
          } else if (header === 'test_prompt' || header === 'base_prompt') {
            displayName = questionText || 'Initial prompt:';
          }
          
          return {
            id: columnId,
            name: displayName,
            columnLetter: getColumnLetter(index),
            type: isReadOnly ? 'read' : 'write',
            hidden: false,
            inputType: 'text',
            required: false
          };
        });
        setColumnConfigs(initialConfigs);
      }
      
      setSheetData(sheetData);
      
      toast.success(`Loaded ${data.headers.length} columns from sheet`);
    } catch (error: any) {
      console.error('Error loading sheet:', error);
      toast.error(error.message || "Failed to load sheet data. Make sure the sheet is publicly accessible or shared with the service account.");
    } finally {
      setLoadingSheet(false);
    }
  };

  const copyServiceAccountEmail = async () => {
    const serviceAccountEmail = 'data-ops-workbench-service-acc@data-ops-workbenches.iam.gserviceaccount.com';
    try {
      await navigator.clipboard.writeText(serviceAccountEmail);
      toast.success('Service account email copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy email to clipboard');
    }
  };

  const updateColumnConfig = (index: number, field: keyof ColumnConfig, value: any) => {
    setColumnConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, [field]: value } : config
    ));
  };

  const addOption = (columnIndex: number) => {
    setColumnConfigs(prev => prev.map((config, i) => 
      i === columnIndex 
        ? { ...config, options: [...(config.options || []), ''] }
        : config
    ));
  };

  const updateOption = (columnIndex: number, optionIndex: number, value: string) => {
    setColumnConfigs(prev => prev.map((config, i) => 
      i === columnIndex 
        ? { 
            ...config, 
            options: (config.options || []).map((opt, j) => j === optionIndex ? value : opt)
          }
        : config
    ));
  };

  const updateOptionColor = (columnIndex: number, option: string, color: string) => {
    setColumnConfigs(prev => prev.map((config, i) => 
      i === columnIndex 
        ? { 
            ...config, 
            optionColors: { ...(config.optionColors || {}), [option]: color }
          }
        : config
    ));
  };

  const removeOption = (columnIndex: number, optionIndex: number) => {
    setColumnConfigs(prev => prev.map((config, i) => 
      i === columnIndex 
        ? { 
            ...config, 
            options: (config.options || []).filter((_, j) => j !== optionIndex)
          }
        : config
    ));
  };

  // Apply preset template to a column
  const applyPreset = (columnIndex: number, presetKey: keyof typeof PRESET_TEMPLATES) => {
    const preset = PRESET_TEMPLATES[presetKey];
    setColumnConfigs(prev => prev.map((config, i) => 
      i === columnIndex 
        ? { 
            ...config, 
            options: [...preset.options],
            optionColors: { ...preset.optionColors }
          }
        : config
    ));
    toast.success(`Applied ${preset.name} to ${prev[columnIndex].name}`);
  };

  // Copy options from a column
  const copyOptions = (columnIndex: number) => {
    const config = columnConfigs[columnIndex];
    if (config.options && config.options.length > 0) {
      setCopiedOptions({
        options: [...config.options],
        optionColors: { ...(config.optionColors || {}) }
      });
      toast.success(`Copied options from ${config.name}`);
    } else {
      toast.error('No options to copy');
    }
  };

  // Paste options to a column
  const pasteOptions = (columnIndex: number) => {
    if (!copiedOptions) {
      toast.error('No options copied. Copy options from another field first.');
      return;
    }
    setColumnConfigs(prev => prev.map((config, i) => 
      i === columnIndex 
        ? { 
            ...config, 
            options: [...copiedOptions.options],
            optionColors: { ...copiedOptions.optionColors }
          }
        : config
    ));
    toast.success(`Pasted options to ${prev[columnIndex].name}`);
  };

  // Toggle column selection for bulk operations
  const toggleColumnSelection = (columnIndex: number) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnIndex)) {
        newSet.delete(columnIndex);
      } else {
        newSet.add(columnIndex);
      }
      return newSet;
    });
  };

  // Select all / Deselect all columns
  const toggleSelectAll = () => {
    if (selectedColumns.size === columnConfigs.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(columnConfigs.map((_, i) => i)));
    }
  };

  // Bulk apply options from source column to selected columns
  const bulkApplyOptions = () => {
    if (sourceColumnForBulk === null) {
      toast.error('Please select a source column');
      return;
    }
    if (selectedColumns.size === 0) {
      toast.error('Please select at least one target column');
      return;
    }
    if (selectedColumns.has(sourceColumnForBulk)) {
      toast.error('Source column cannot be in target selection');
      return;
    }

    const sourceConfig = columnConfigs[sourceColumnForBulk];
    if (!sourceConfig.options || sourceConfig.options.length === 0) {
      toast.error(`Source column "${sourceConfig.name}" has no options`);
      return;
    }

    setColumnConfigs(prev => prev.map((config, i) => {
      if (selectedColumns.has(i)) {
        return {
          ...config,
          options: [...sourceConfig.options!],
          optionColors: { ...(sourceConfig.optionColors || {}) }
        };
      }
      return config;
    }));

    toast.success(`Applied options from "${sourceConfig.name}" to ${selectedColumns.size} column(s)`);
    setBulkApplyDialogOpen(false);
    setSelectedColumns(new Set());
    setSourceColumnForBulk(null);
  };

  // Export column configuration as JSON
  const handleExportConfig = () => {
    if (columnConfigs.length === 0) {
      toast.error('No column configuration to export');
      return;
    }

    const exportData = {
      pluginName: formData.name || 'Unnamed Plugin',
      modality: formData.modality,
      exportedAt: new Date().toISOString(),
      columnConfig: columnConfigs
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.name || 'plugin'}-column-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Column configuration exported successfully');
  };

  // Import column configuration from JSON
  const handleImportConfig = () => {
    if (!importJsonText.trim()) {
      toast.error('Please paste JSON configuration');
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);
      
      // Validate structure
      if (!parsed.columnConfig || !Array.isArray(parsed.columnConfig)) {
        throw new Error('Invalid JSON format: missing or invalid columnConfig array');
      }

      // Check if modality matches
      if (parsed.modality && parsed.modality !== formData.modality) {
        const confirmed = window.confirm(
          `The imported config is for "${parsed.modality}" modality, but current plugin is "${formData.modality}". Continue anyway?`
        );
        if (!confirmed) return;
      }

      // Validate each column config
      const validConfigs: ColumnConfig[] = parsed.columnConfig.map((col: any, index: number) => ({
        ...col,
        id: col.id || `col-${index}`,
        name: col.name || `Column ${index + 1}`,
        columnLetter: col.columnLetter || getColumnLetter(index),
        type: col.type || 'read',
        inputType: col.inputType || 'text',
        hidden: col.hidden || false,
        required: col.required || false,
      }));

      setColumnConfigs(validConfigs);
      setImportDialogOpen(false);
      setImportJsonText('');
      
      toast.success(`Imported ${validConfigs.length} column configuration(s)`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`Failed to import: ${error.message}`);
    }
  };

  // Fetch available plugins for copying
  const fetchAvailablePlugins = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('task_templates')
        .select('id, name, modality')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAvailablePlugins(templates || []);
    } catch (error: any) {
      console.error('Error fetching plugins:', error);
      toast.error('Failed to load plugins');
    }
  };

  // Copy configuration from existing plugin
  const handleCopyFromPlugin = async () => {
    if (!selectedPluginToCopy) {
      toast.error('Please select a plugin to copy from');
      return;
    }

    try {
      // Fetch the selected plugin's full config
      const { data: template, error } = await supabase
        .from('task_templates')
        .select('id, name, modality, column_config')
        .eq('id', selectedPluginToCopy)
        .single();

      if (error) throw error;
      if (!template || !template.column_config) {
        toast.error('Selected plugin has no column configuration');
        return;
      }

      const columnConfig = Array.isArray(template.column_config) 
        ? template.column_config as unknown as ColumnConfig[]
        : [];

      if (columnConfig.length === 0) {
        toast.error('Selected plugin has no columns configured');
        return;
      }

      // Check modality match
      if (template.modality !== formData.modality) {
        const confirmed = window.confirm(
          `The selected plugin "${template.name}" is for "${template.modality}" modality, but current plugin is "${formData.modality}". Continue anyway?`
        );
        if (!confirmed) {
          setCopyFromPluginDialogOpen(false);
          setSelectedPluginToCopy('');
          return;
        }
      }

      // Update column configs, preserving IDs if sheet is loaded
      // If sheet is loaded, match by column name/id where possible
      if (sheetData && sheetData.headers.length > 0) {
        // Match columns by name or ID
        const matchedConfigs: ColumnConfig[] = sheetData.headers.map((header, index) => {
          const existingConfig = columnConfigs[index];
          const matchingConfig = columnConfig.find(
            (col) => col.id === existingConfig?.id || 
                     col.name === existingConfig?.name ||
                     col.id === header ||
                     col.name === header
          );

          if (matchingConfig) {
            // Preserve current column's ID and name (from sheet), but copy other settings
            return {
              ...matchingConfig,
              id: existingConfig?.id || `col-${index}`,
              name: existingConfig?.name || header,
              columnLetter: existingConfig?.columnLetter || getColumnLetter(index),
            };
          }
          
          // If no match, use existing config or create new
          return existingConfig || {
            id: `col-${index}`,
            name: header,
            columnLetter: getColumnLetter(index),
            type: 'read',
            hidden: false,
            inputType: 'text',
            required: false
          };
        });
        setColumnConfigs(matchedConfigs);
      } else {
        // No sheet loaded, just copy the configs
        setColumnConfigs(columnConfig.map((col, index) => ({
          ...col,
          columnLetter: col.columnLetter || getColumnLetter(index),
        })));
      }

      toast.success(`Copied configuration from "${template.name}" (${columnConfig.length} columns)`);
      setCopyFromPluginDialogOpen(false);
      setSelectedPluginToCopy('');
    } catch (error: any) {
      console.error('Error copying from plugin:', error);
      toast.error(`Failed to copy: ${error.message}`);
    }
  };

  const handleSaveTemplate = async () => {
    // For audio-short modality, we don't need column configs or sheet URL
    const needsColumns = formData.modality !== 'audio-short';
    const needsSheetUrl = formData.modality !== 'audio-short';
    
    if (!formData.name || (needsSheetUrl && !formData.google_sheet_url) || (needsColumns && columnConfigs.length === 0)) {
      toast.error("Please fill in all required fields" + (needsColumns ? " and configure columns" : ""));
      return;
    }

    setSaving(true);
    try {
      // For audio-short, create a simple transcription column config
      const audioShortConfig = formData.modality === 'audio-short' ? [{
        id: 'audio_file',
        name: 'Audio File',
        type: 'read' as const,
        inputType: 'text' as const,
        required: false,
        pasteDetection: false
      }, {
        id: 'transcription',
        name: 'Transcription',
        type: 'write' as const,
        inputType: 'textarea' as const,
        required: true,
        pasteDetection: false
      }] : columnConfigs;

      const templateData = {
        name: formData.name,
        description: formData.description,
        google_sheet_url: formData.google_sheet_url || '', // Empty for audio-short, will be set at project creation
        column_config: audioShortConfig as any,
        modality: formData.modality,
        modality_config: formData.modality === 'audio-short' ? {
          'audio-short': {
            fileFormats: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
            quality: 'high' as const,
            storageUrl: '', // Will be set at project creation
            transcriptionRequired: true,
            playbackControls: {
              speed: false,
              loop: false,
              rewind: false
            }
          }
        } : formData.modality_config,
        label_ontology: formData.label_ontology
      };

      let result;
      if (isEdit) {
        const { data, error } = await supabase
          .from('task_templates')
          .update(templateData)
          .eq('id', id)
          .select()
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('task_templates')
          .insert([{
            ...templateData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }])
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) throw result.error;

      toast.success(`Plugin "${formData.name}" ${isEdit ? 'updated' : 'created'} successfully!`);

      navigate('/m/plugins');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || "Failed to save plugin");
    } finally {
      setSaving(false);
    }
  };

  const renderColumnConfig = (config: ColumnConfig, index: number) => (
    <Card key={config.id} className="mb-4 relative">
      {/* Checkbox for bulk selection */}
      <div className="absolute top-4 right-4 z-10">
        <Checkbox
          checked={selectedColumns.has(index)}
          onCheckedChange={() => toggleColumnSelection(index)}
          id={`select-${index}`}
        />
        <Label htmlFor={`select-${index}`} className="sr-only">
          Select {config.name} for bulk operations
        </Label>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{config.columnLetter}</Badge>
            <h4 className="font-medium">{config.name}</h4>
            <Badge variant={config.type === 'read' ? 'secondary' : 'default'}>
              {config.type}
            </Badge>
            {config.hidden && (
              <Badge variant="outline" className="gap-1">
                <EyeOff className="h-3 w-3" />
                Hidden
              </Badge>
            )}
          </div>
        </div>

        {sheetData && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Sample Data:</div>
            <div className="text-sm text-muted-foreground">
              {sheetData.sampleRow[config.id] || sheetData.sampleRow[config.name] || 'No sample data'}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.hidden || false}
              onCheckedChange={(checked) => 
                updateColumnConfig(index, 'hidden', checked)
              }
            />
            <Label>Hide this column (won't be displayed in workbench)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.type === 'write'}
              onCheckedChange={(checked) => 
                updateColumnConfig(index, 'type', checked ? 'write' : 'read')
              }
            />
            <Label>Make this field writeable (workers can input data)</Label>
          </div>

          {config.type === 'write' && (
            <>
              <div>
                <Label>Input Type</Label>
                <Select 
                  value={config.inputType || 'text'} 
                  onValueChange={(value) => updateColumnConfig(index, 'inputType', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="select">Dropdown Selection</SelectItem>
                    <SelectItem value="radio">Radio Buttons</SelectItem>
                    <SelectItem value="rating">Star Rating</SelectItem>
                    <SelectItem value="number">Number Input</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.required || false}
                  onCheckedChange={(checked) => updateColumnConfig(index, 'required', checked)}
                />
                <Label>Required field</Label>
              </div>

              {(config.inputType === 'text' || config.inputType === 'textarea') && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.pasteDetection || false}
                      onCheckedChange={(checked) => updateColumnConfig(index, 'pasteDetection', checked)}
                    />
                    <Label>Log paste events for this field</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={config.pastePreventionEnabled || false}
                      onCheckedChange={(checked) => updateColumnConfig(index, 'pastePreventionEnabled', checked)}
                    />
                    <Label>Prevent paste in this field</Label>
                  </div>
                </>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Switch
                    checked={!!config.conditional}
                    onCheckedChange={(checked) => 
                      updateColumnConfig(index, 'conditional', checked ? {
                        dependsOnColumn: '',
                        requiredValue: ''
                      } : undefined)
                    }
                  />
                  <Label>Conditional (only shown and required if another column has specific value)</Label>
                </div>
                
                {config.conditional && (
                  <div className="ml-8 space-y-2 p-3 bg-blue-50 rounded-md border">
                    <p className="text-xs text-blue-700 mb-2">
                      This field will only be shown and required when the selected column has the specified value.
                      <br />
                      <strong>Example:</strong> Set "Answer Relevance" to depend on "Article Support" = "Supported"
                    </p>
                    <div>
                      <Label className="text-sm">Depends on column</Label>
                      <Select 
                        value={config.conditional.dependsOnColumn} 
                        onValueChange={(value) => 
                          updateColumnConfig(index, 'conditional', {
                            ...config.conditional!,
                            dependsOnColumn: value
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columnConfigs
                            .filter((c, i) => i !== index && c.type === 'write' && (c.inputType === 'select' || c.inputType === 'radio'))
                            .map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.columnLetter} - {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {config.conditional.dependsOnColumn && (
                      <div>
                        <Label className="text-sm">Required value</Label>
                        <Select 
                          value={config.conditional.requiredValue} 
                          onValueChange={(value) => 
                            updateColumnConfig(index, 'conditional', {
                              ...config.conditional!,
                              requiredValue: value
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select required value" />
                          </SelectTrigger>
                          <SelectContent>
                            {columnConfigs
                              .find(c => c.name === config.conditional!.dependsOnColumn)
                              ?.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(config.inputType === 'select' || config.inputType === 'radio') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Options</Label>
                    <div className="flex gap-2">
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value) {
                            applyPreset(index, value as keyof typeof PRESET_TEMPLATES);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Apply Preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRESET_TEMPLATES).map(([key, preset]) => (
                            <SelectItem key={key} value={key}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copyOptions(index)}
                        title="Copy options from this field"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => pasteOptions(index)}
                        disabled={!copiedOptions}
                        title={copiedOptions ? "Paste options to this field" : "No options copied"}
                      >
                        <Clipboard className="h-4 w-4 mr-1" />
                        Paste
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addOption(index)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                  {copiedOptions && (
                    <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      <Clipboard className="h-3 w-3 inline mr-1" />
                      Options copied ({copiedOptions.options.length} options) - Click Paste on any field to apply
                    </div>
                  )}
                  <div className="space-y-2">
                    {(config.options || []).map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                          placeholder="Enter option text"
                          className="flex-1"
                        />
                        <ColorPicker
                          value={config.optionColors?.[option] || '#3b82f6'}
                          onChange={(color) => updateOptionColor(index, option, color)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index, optionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Field Tooltip - Available for both read and write fields */}
          <div className="space-y-2">
            <Label>Field Tooltip (optional)</Label>
            <Textarea
              value={config.tooltip || ''}
              onChange={(e) => updateColumnConfig(index, 'tooltip', e.target.value)}
              placeholder="Add helpful instructions that will appear on hover... (Markdown supported)"
              className="min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">
              If provided, a tooltip icon will appear next to this field with these instructions. 
              <strong> Markdown supported:</strong> Use **bold**, *italic*, `code`, lists, etc.
            </p>
            {config.tooltip && (
              <div className="mt-2 p-3 bg-muted rounded-md border">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="text-sm prose prose-sm max-w-none">
                  <ReactMarkdown>{config.tooltip}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
        <Button variant="ghost" onClick={() => navigate('/m/plugins')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plugins
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Modality presets</h2>
          <p className="text-sm text-muted-foreground">
            Kick-start templates for common annotation workflows. Applying a preset updates the modality, config, and required columns.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(MODALITY_PRESETS).map((preset) => (
            <Card key={preset.id} data-testid={`modality-preset-${preset.id}`}>
              <CardHeader>
                <CardTitle>{preset.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                  {preset.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button size="sm" variant="secondary" onClick={() => handleApplyPreset(preset.id)}>
                  Apply Preset
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4" data-testid="modality-template-library">
        <div>
          <h2 className="text-lg font-semibold">Template library</h2>
          <p className="text-sm text-muted-foreground">
            One-click templates for popular project types. Applying a template updates the modality, config, and required fields.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.values(MODALITY_TEMPLATES).map((template) => (
            <Card key={template.id} data-testid={`modality-template-${template.id}`}>
              <CardHeader>
                <CardTitle>{template.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                  {template.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button size="sm" variant="secondary" onClick={() => handleApplyTemplate(template.id)}>
                  Apply Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4" data-testid="custom-modality-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Custom modalities</h2>
            <p className="text-sm text-muted-foreground">
              Capture bespoke workflows with custom fields, annotation tools, and validation rules.
            </p>
          </div>
        </div>
        <CustomModalityBuilder onCreate={handleCreateCustomModality} />
        <Card>
          <CardHeader>
            <CardTitle>Saved custom modalities</CardTitle>
            <CardDescription>Apply or delete saved templates. Only admins and creators can manage entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {customModalitiesLoading ? (
              <p className="text-sm text-muted-foreground">Loading custom modalities…</p>
            ) : customModalities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom modalities yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {customModalities.map((record) => (
                  <Card key={record.id} data-testid={`custom-modality-${record.id}`}>
                    <CardHeader>
                      <CardTitle className="text-base">{record.name}</CardTitle>
                      <CardDescription>{record.description || 'No description provided'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button size="sm" onClick={() => handleApplyCustomModality(record)}>
                        Use Template
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteCustomModality(record)}>
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plugin Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Plugin Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter plugin name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this plugin is used for"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="modality">Task Modality *</Label>
            <Select
              value={formData.modality}
              onValueChange={(value) => handleInputChange('modality', value as Modality)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spreadsheet">📊 Spreadsheet (Current)</SelectItem>
                <SelectItem value="audio-short">🎵 Audio Shortform (Playback + Form)</SelectItem>
                <SelectItem value="audio-long">🎧 Audio Longform (Waveform Annotation)</SelectItem>
                <SelectItem value="text">📝 Text Annotation</SelectItem>
                <SelectItem value="image">🖼️ Image Annotation</SelectItem>
                <SelectItem value="video">🎬 Video Annotation</SelectItem>
                <SelectItem value="multimodal">🔀 Multimodal Tasks</SelectItem>
                <SelectItem value="chatbot-eval">🤖 Chatbot Evaluation (3-Section Layout)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the type of tasks this plugin will handle. Spreadsheet is the current format.
            </p>
          </div>

          {formData.modality === 'chatbot-eval' && (
            <div className="p-4 bg-muted rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                This plugin is configured for chatbot evaluation tasks with a 3-section layout:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Section 1:</strong> Interaction A evaluation (test_* columns)</li>
                <li><strong>Section 2:</strong> Interaction B evaluation (base_* columns)</li>
                <li><strong>Section 3:</strong> Side-by-side comparison (sxs_* columns)</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-semibold mb-2 text-blue-900">📋 Google Sheet Structure (Two-Row Header Format):</p>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Row 1:</strong> Column IDs (with prefixes: <code className="bg-blue-100 px-1 rounded">test_goal</code>, <code className="bg-blue-100 px-1 rounded">test_prompt</code>, <code className="bg-blue-100 px-1 rounded">test_language_adherence</code>, etc.)</p>
                  <p><strong>Row 2:</strong> Question text (human-readable labels that workers see in the UI)</p>
                  <p><strong>Row 3+:</strong> Task data (one task per row)</p>
                  <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                    <p className="font-semibold mb-1">Example:</p>
                    <table className="text-xs border-collapse">
                      <tr>
                        <td className="border border-blue-300 p-1"><code>test_goal</code></td>
                        <td className="border border-blue-300 p-1"><code>test_prompt</code></td>
                        <td className="border border-blue-300 p-1"><code>test_language_adherence</code></td>
                      </tr>
                      <tr>
                        <td className="border border-blue-300 p-1">User goal:</td>
                        <td className="border border-blue-300 p-1">Initial prompt:</td>
                        <td className="border border-blue-300 p-1">How well did the GenAI chatbot...</td>
                      </tr>
                      <tr>
                        <td className="border border-blue-300 p-1">Find countries that...</td>
                        <td className="border border-blue-300 p-1">Which countries...</td>
                        <td className="border border-blue-300 p-1">[empty - worker answers]</td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-background/50 rounded border">
                <p className="text-sm font-semibold mb-2">Required Column Prefixes:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="bg-background px-1 rounded">test_goal</code> - User goal for Section 1 (read-only, displayed at top, value from Row 3+)</li>
                  <li><code className="bg-background px-1 rounded">test_prompt</code> - Initial prompt for Section 1 (read-only, displayed at top, value from Row 3+)</li>
                  <li><code className="bg-background px-1 rounded">base_goal</code> - User goal for Section 2 (read-only, displayed at top, value from Row 3+)</li>
                  <li><code className="bg-background px-1 rounded">base_prompt</code> - Initial prompt for Section 2 (read-only, displayed at top, value from Row 3+)</li>
                  <li><code className="bg-background px-1 rounded">test_*</code> - Evaluation questions for Section 1 (writeable, workers answer in Row 3+)</li>
                  <li><code className="bg-background px-1 rounded">base_*</code> - Evaluation questions for Section 2 (writeable, workers answer in Row 3+)</li>
                  <li><code className="bg-background px-1 rounded">sxs_*</code> - Comparison questions for Section 3 (writeable, workers answer in Row 3+)</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Important:</strong> Goal and prompt fields automatically set to read-only. Their text comes from Row 3+ data (one per task). Question text in Row 2 is what workers see as labels.
              </p>
            </div>
          )}

          {formData.modality === 'audio-short' ? (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This plugin is configured for audio transcription tasks. When you create a project using this plugin, you'll provide a Google Drive folder URL containing the audio files.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Plugin Configuration:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Audio player with waveform visualization</li>
                  <li>Single transcription text field</li>
                  <li>Supports: MP3, WAV, M4A, AAC, OGG</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="sheet_url">Google Sheet URL *</Label>
                <Input
                  id="sheet_url"
                  value={formData.google_sheet_url}
                  onChange={(e) => handleInputChange('google_sheet_url', e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  required
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Sheet Sharing Required</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>This sheet must be shared with our service account:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      data-ops-workbench-service-acc@data-ops-workbenches.iam.gserviceaccount.com
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyServiceAccountEmail}
                      className="h-8 px-2"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Email
                    </Button>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">How to share:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Open your Google Sheet</li>
                      <li>Click the "Share" button</li>
                      <li>Add the email above with "Viewer" access</li>
                      <li>Click "Share"</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleLoadSheet}
                disabled={loadingSheet || !formData.google_sheet_url}
              >
                {loadingSheet ? 'Loading...' : 'Load Sheet Structure'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {formData.modality === 'audio-short' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.review_enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      review_enabled: checked,
                    }))
                  }
                />
                <div>
                  <p className="font-medium">Enable review stage</p>
                  <p className="text-sm text-muted-foreground">
                    Every transcription will be routed to a reviewer before completion. Reviewers can edit the transcript,
                    rate quality, leave feedback for the transcriber, and add internal notes.
                  </p>
                </div>
              </div>
            </div>

            {formData.review_enabled && (
              <div className="space-y-6 border rounded-lg p-4 bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rating-max">Star rating scale</Label>
                    <Input
                      id="rating-max"
                      type="number"
                      min={3}
                      max={10}
                      value={formData.review_stage_config.ratingMax}
                      onChange={(e) =>
                        updateReviewConfig({
                          ratingMax: Math.max(1, Number.parseInt(e.target.value, 10) || defaultReviewStageConfig.ratingMax),
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Reviewers will be able to rate submissions from 1 to this number of stars.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reviewer options</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.review_stage_config.feedbackEnabled}
                        onCheckedChange={(checked) =>
                          updateReviewConfig({ feedbackEnabled: checked })
                        }
                      />
                      <span className="text-sm">Allow feedback to transcriber</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.review_stage_config.internalNotesEnabled}
                        onCheckedChange={(checked) =>
                          updateReviewConfig({ internalNotesEnabled: checked })
                        }
                      />
                      <span className="text-sm">Allow internal notes (not visible to workers)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Highlight tags</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Tags reviewers can apply to flag issues (shown alongside ratings). Common tags include accuracy, punctuation, guideline adherence, or label quality.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.review_stage_config.highlightTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-1 text-xs hover:text-destructive"
                          onClick={() =>
                            updateReviewConfig({
                              highlightTags: formData.review_stage_config.highlightTags.filter((t) => t !== tag),
                            })
                          }
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {formData.review_stage_config.highlightTags.length === 0 && (
                      <span className="text-sm text-muted-foreground italic">
                        No tags configured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newHighlightTag}
                      onChange={(e) => setNewHighlightTag(e.target.value)}
                      placeholder="Enter tag label"
                      className="w-48"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const trimmed = newHighlightTag.trim();
                        if (!trimmed) return;
                        if (formData.review_stage_config.highlightTags.includes(trimmed)) {
                          toast.warning('Tag already exists');
                          return;
                        }
                        updateReviewConfig({
                          highlightTags: [...formData.review_stage_config.highlightTags, trimmed],
                        });
                        setNewHighlightTag('');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add tag
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sheetData && (
        <Card>
          <CardHeader>
            <CardTitle>Column Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure how each column from your sheet should be handled in the workbench.
              Read fields are displayed as cards, write fields allow worker input.
            </p>
          </CardHeader>
          <CardContent>
            {/* Bulk Actions Toolbar */}
            {(selectedColumns.size > 0 || sourceColumnForBulk !== null) && (
              <div className="mb-6 p-4 bg-muted rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold">Bulk Actions</Label>
                    <Badge variant="secondary">
                      {selectedColumns.size} column{selectedColumns.size !== 1 ? 's' : ''} selected
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedColumns(new Set());
                      setSourceColumnForBulk(null);
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-sm mb-1 block">Source Column (copy options from):</Label>
                    <Select
                      value={sourceColumnForBulk !== null ? String(sourceColumnForBulk) : ''}
                      onValueChange={(value) => setSourceColumnForBulk(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select source column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnConfigs
                          .filter((c, i) => c.type === 'write' && (c.inputType === 'select' || c.inputType === 'radio') && c.options && c.options.length > 0)
                          .map((c, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {c.columnLetter} - {c.name} ({c.options?.length || 0} options)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={bulkApplyDialogOpen} onOpenChange={setBulkApplyDialogOpen}>
                    <Button
                      type="button"
                      disabled={sourceColumnForBulk === null || selectedColumns.size === 0}
                      onClick={() => setBulkApplyDialogOpen(true)}
                    >
                      Apply Options to Selected
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Bulk Apply</DialogTitle>
                        <DialogDescription>
                          This will overwrite options and colors in {selectedColumns.size} selected column{selectedColumns.size !== 1 ? 's' : ''} with options from "{columnConfigs[sourceColumnForBulk!]?.name}".
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Source Column:</p>
                          <div className="p-2 bg-muted rounded">
                            {columnConfigs[sourceColumnForBulk!]?.columnLetter} - {columnConfigs[sourceColumnForBulk!]?.name}
                            <div className="text-xs text-muted-foreground mt-1">
                              Options: {columnConfigs[sourceColumnForBulk!]?.options?.join(', ')}
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-4">Target Columns:</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {Array.from(selectedColumns).map(i => (
                              <div key={i} className="p-2 bg-muted rounded text-sm">
                                {columnConfigs[i]?.columnLetter} - {columnConfigs[i]?.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkApplyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={bulkApplyOptions}>
                          Apply Options
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            {/* Column List Header with Select All */}
            {columnConfigs.length > 0 && (
              <div className="mb-4 pb-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-8 px-2"
                  >
                    {selectedColumns.size === columnConfigs.length ? (
                      <CheckSquare className="h-4 w-4 mr-1" />
                    ) : (
                      <Square className="h-4 w-4 mr-1" />
                    )}
                    {selectedColumns.size === columnConfigs.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedColumns.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedColumns.size} selected
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkApplyDialogOpen(true)}
                  disabled={selectedColumns.size === 0 || sourceColumnForBulk === null}
                >
                  Bulk Apply Options
                </Button>
              </div>
            )}

            {columnConfigs.map((config, index) => renderColumnConfig(config, index))}
          </CardContent>
        </Card>
      )}

      {(sheetData || formData.modality === 'audio-short') && (
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportConfig} disabled={columnConfigs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export Config
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Config
            </Button>
            <Button variant="outline" onClick={() => {
              fetchAvailablePlugins();
              setCopyFromPluginDialogOpen(true);
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copy From Plugin
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview Plugin
            </Button>
          </div>
          
          <Button onClick={handleSaveTemplate} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : `${isEdit ? 'Update' : 'Save'} Plugin`}
          </Button>
        </div>
      )}

      {/* Import Configuration Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Column Configuration</DialogTitle>
            <DialogDescription>
              Paste the exported JSON configuration below to restore your column settings (options, colors, input types, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="import-json">JSON Configuration</Label>
              <Textarea
                id="import-json"
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="Paste JSON configuration here..."
                className="font-mono text-xs min-h-[300px]"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Tip:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use "Export Config" from another plugin to get the JSON format</li>
                <li>The imported config will replace your current column settings</li>
                <li>Column IDs and names will be matched if a sheet is loaded</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false);
              setImportJsonText('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleImportConfig} disabled={!importJsonText.trim()}>
              <FileJson className="h-4 w-4 mr-2" />
              Import Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy From Plugin Dialog */}
      <Dialog open={copyFromPluginDialogOpen} onOpenChange={(open) => {
        setCopyFromPluginDialogOpen(open);
        if (!open) {
          setSelectedPluginToCopy('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Configuration From Plugin</DialogTitle>
            <DialogDescription>
              Select a plugin to copy its column configuration (options, colors, input types, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="plugin-select">Select Plugin</Label>
              <Select value={selectedPluginToCopy} onValueChange={setSelectedPluginToCopy}>
                <SelectTrigger id="plugin-select">
                  <SelectValue placeholder="Choose a plugin..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlugins.map((plugin) => (
                    <SelectItem key={plugin.id} value={plugin.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{plugin.name}</span>
                        <Badge variant="outline" className="ml-2">{plugin.modality}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {availablePlugins.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No plugins found. Create a plugin first.
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Note:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>This will copy all column settings (options, colors, input types, required flags, etc.)</li>
                <li>If a sheet is loaded, columns will be matched by ID or name</li>
                <li>Current column settings will be replaced</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCopyFromPluginDialogOpen(false);
              setSelectedPluginToCopy('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCopyFromPlugin} disabled={!selectedPluginToCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewPlugin;
