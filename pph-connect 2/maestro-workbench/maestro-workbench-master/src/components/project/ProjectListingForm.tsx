import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  isActive: z.boolean().optional(),
  capacityMax: z.number().min(0, 'Capacity must be 0 or greater'),
  requiredSkills: z.string().optional(),
  requiredLocales: z.string().optional(),
  requiredTier: z.string().min(1, 'Tier is required'),
  description: z.string().optional(),
});

interface ProjectListingFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isSubmitting?: boolean;
}

export function ProjectListingForm({ onSubmit, isSubmitting }: ProjectListingFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
      isActive: true,
      capacityMax: 0,
      requiredSkills: '',
      requiredLocales: '',
      requiredTier: 'tier0',
      description: '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="project-listing-form">
      <div>
        <Label htmlFor="projectId">Project</Label>
        <Input
          id="projectId"
          data-testid="project-listing-project-id"
          {...form.register('projectId')}
          placeholder="Project ID"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="isActive" data-testid="project-listing-is-active" {...form.register('isActive')} disabled={isSubmitting} />
        <Label htmlFor="isActive">Is Active</Label>
      </div>
      <div>
        <Label htmlFor="capacityMax">Max Capacity</Label>
        <Input
          id="capacityMax"
          type="number"
          data-testid="project-listing-capacity"
          {...form.register('capacityMax', { valueAsNumber: true })}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="requiredSkills">Required Skills</Label>
        <Input
          id="requiredSkills"
          data-testid="project-listing-skills"
          {...form.register('requiredSkills')}
          placeholder="Comma-separated skills"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="requiredLocales">Required Locales</Label>
        <Input
          id="requiredLocales"
          data-testid="project-listing-locales"
          {...form.register('requiredLocales')}
          placeholder="Comma-separated locales"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="requiredTier">Required Tier</Label>
        <Input
          id="requiredTier"
          data-testid="project-listing-tier"
          {...form.register('requiredTier')}
          placeholder="tier0"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          data-testid="project-listing-description"
          {...form.register('description')}
          placeholder="Listing description"
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" data-testid="project-listing-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save Listing'}
      </Button>
    </form>
  );
}

export default ProjectListingForm;
