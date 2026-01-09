import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

type ProjectOption = {
  id: string;
  name: string;
};

type TrainingMaterialFormProps = {
  projects?: ProjectOption[];
  onSuccess?: () => void;
};

const TRAINING_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'link', label: 'Link' }
];

const initialState = {
  projectId: '',
  title: '',
  description: '',
  type: 'video',
  url: ''
};

const TrainingMaterialForm: React.FC<TrainingMaterialFormProps> = ({
  projects = [],
  onSuccess
}) => {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const updateField =
    (field: keyof typeof initialState) =>
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
    };

  const resetForm = () => {
    setFormData(initialState);
    setFile(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (formData.type === 'link' && !formData.url.trim()) {
      toast.error('URL is required for link-based materials');
      return;
    }

    setIsSubmitting(true);

    try {
      let storagePath: string | null = null;
      let finalUrl = formData.url.trim();

      if (file) {
        storagePath = `materials/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('training-materials')
          .upload(storagePath, file, {
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData
        } = supabase.storage.from('training-materials').getPublicUrl(storagePath);

        if (publicUrlData?.publicUrl) {
          finalUrl = publicUrlData.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from('training_materials').insert({
        project_id: formData.projectId || null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        material_type: formData.type,
        url: finalUrl || null,
        storage_path: storagePath
      });

      if (insertError) {
        throw insertError;
      }

      toast.success('Training material saved');
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving training material:', error);
      toast.error('Failed to save training material');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="project">Project</Label>
        <Select
          value={formData.projectId}
          onValueChange={updateField('projectId')}
        >
          <SelectTrigger id="project">
            <SelectValue placeholder="Assign to project (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(event) => updateField('title')(event.target.value)}
          placeholder="e.g., Maestro Quality Guidelines"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(event) => updateField('description')(event.target.value)}
          placeholder="Provide a short summary of this training material"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select value={formData.type} onValueChange={updateField('type')}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select training type" />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://..."
            value={formData.url}
            onChange={(event) => updateField('url')(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Provide the hosted URL or leave blank to upload a file.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Upload File</Label>
        <Input
          id="file"
          type="file"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Optional – upload documents or videos to the training-materials bucket.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Training Material'}
        </Button>
      </div>
    </form>
  );
};

export default TrainingMaterialForm;
