import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { ColumnConfig, ModalityConfig } from '@/types';

export interface CustomModalityBuilderValues {
  name: string;
  modalityKey: string;
  description: string;
  modalityConfig: ModalityConfig;
  columnConfig: ColumnConfig[];
  annotationTools: string[];
  validationRules: Record<string, unknown>;
}

export interface CustomModalityBuilderProps {
  initialValues?: Partial<CustomModalityBuilderValues>;
  onCreate: (values: CustomModalityBuilderValues) => Promise<void> | void;
  onClose?: () => void;
}

const TOOL_OPTIONS = ['bounding-box', 'polygon', 'keypoint', 'segmentation', 'transcription', 'rating'];

const defaultColumn = (): ColumnConfig => ({
  id: `field_${Math.random().toString(36).slice(2, 8)}`,
  name: 'New Field',
  type: 'write',
  inputType: 'text',
  required: false,
});

const CustomModalityBuilder: React.FC<CustomModalityBuilderProps> = ({ initialValues, onCreate, onClose }) => {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [modalityKey, setModalityKey] = useState(initialValues?.modalityKey ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [annotationTools, setAnnotationTools] = useState<string[]>(initialValues?.annotationTools ?? []);
  const [columns, setColumns] = useState<ColumnConfig[]>(initialValues?.columnConfig ?? [defaultColumn()]);
  const [saving, setSaving] = useState(false);
  const [modalityConfigJson, setModalityConfigJson] = useState(
    JSON.stringify(initialValues?.modalityConfig ?? {}, null, 2)
  );
  const [validationRulesJson, setValidationRulesJson] = useState(
    JSON.stringify(initialValues?.validationRules ?? {}, null, 2)
  );

  const handleToggleTool = (tool: string) => {
    setAnnotationTools((previous) => {
      if (previous.includes(tool)) {
        return previous.filter((entry) => entry !== tool);
      }
      return [...previous, tool];
    });
  };

  const handleColumnChange = (index: number, field: keyof ColumnConfig, value: any) => {
    setColumns((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddColumn = () => setColumns((prev) => [...prev, defaultColumn()]);
  const handleRemoveColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !modalityKey.trim()) {
      toast.error('Name and modality key are required');
      return;
    }
    if (columns.length === 0) {
      toast.error('Define at least one field/column');
      return;
    }

    let parsedModalityConfig: ModalityConfig;
    let parsedValidationRules: Record<string, unknown>;
    try {
      parsedModalityConfig = modalityConfigJson.trim() ? JSON.parse(modalityConfigJson) : {};
      parsedValidationRules = validationRulesJson.trim() ? JSON.parse(validationRulesJson) : {};
    } catch (jsonError) {
      toast.error('Modality config and validation rules must be valid JSON');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        modalityKey: modalityKey.trim(),
        description: description.trim(),
        modalityConfig: parsedModalityConfig,
        columnConfig: columns,
        annotationTools,
        validationRules: parsedValidationRules,
      });
      toast.success('Custom modality saved');
      onClose?.();
      setName('');
      setModalityKey('');
      setDescription('');
      setColumns([defaultColumn()]);
      setAnnotationTools([]);
      setModalityConfigJson('{}');
      setValidationRulesJson('{}');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="custom-modality-builder">
      <CardHeader>
        <CardTitle>Create custom modality</CardTitle>
        <CardDescription>Define the input fields, annotation tools, and validation rules for this custom workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g., Medical Image QA" />
          </div>
          <div className="space-y-2">
            <Label>Modality key</Label>
            <Input
              value={modalityKey}
              onChange={(event) => setModalityKey(event.target.value)}
              placeholder="e.g., medical-image-qa"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Modality config (JSON)</Label>
            <Textarea
              value={modalityConfigJson}
              onChange={(event) => setModalityConfigJson(event.target.value)}
              rows={6}
              placeholder='{"text":{"maxLength":1000}}'
            />
          </div>
          <div className="space-y-2">
            <Label>Validation rules (JSON)</Label>
            <Textarea
              value={validationRulesJson}
              onChange={(event) => setValidationRulesJson(event.target.value)}
              rows={6}
              placeholder='{"maxBoundingBoxes":10}'
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Annotation tools</Label>
          <div className="flex flex-wrap gap-3">
            {TOOL_OPTIONS.map((tool) => (
              <label key={tool} className="flex items-center gap-2 text-sm">
                <Checkbox checked={annotationTools.includes(tool)} onCheckedChange={() => handleToggleTool(tool)} />
                {tool}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Fields & columns</Label>
            <Button size="sm" variant="outline" onClick={handleAddColumn}>
              Add field
            </Button>
          </div>
          <div className="space-y-3">
            {columns.map((column, index) => (
              <div key={column.id} className="rounded-lg border p-3 space-y-2">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Field name</Label>
                    <Input value={column.name} onChange={(event) => handleColumnChange(index, 'name', event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Input type</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={column.inputType ?? 'text'}
                      onChange={(event) => handleColumnChange(index, 'inputType', event.target.value)}
                    >
                      {['text', 'textarea', 'select', 'radio', 'rating', 'number'].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={column.required ?? false}
                      onCheckedChange={(checked) => handleColumnChange(index, 'required', Boolean(checked))}
                    />
                    Required
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveColumn(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {onClose ? (
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          ) : null}
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save custom modality'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomModalityBuilder;
