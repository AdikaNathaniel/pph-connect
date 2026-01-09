import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectListingForm } from '@/components/project/ProjectListingForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const parseCsvList = (value?: string | null) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const CreateProjectListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (values: {
    projectId: string;
    isActive?: boolean;
    capacityMax: number;
    requiredSkills?: string;
    requiredLocales?: string;
    requiredTier: string;
    description?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const payload = {
        project_id: values.projectId,
        is_active: values.isActive ?? true,
        capacity_max: values.capacityMax,
        capacity_current: 0,
        required_skills: parseCsvList(values.requiredSkills),
        required_locales: parseCsvList(values.requiredLocales),
        required_tier: values.requiredTier,
        description: values.description ?? null,
      };

      const { error } = await supabase.from('project_listings').insert([payload]);
      if (error) {
        throw new Error(error.message);
      }

      toast.success('Listing created', {
        description: 'Project listing is now available in the marketplace.',
      });
      navigate('/m/project-listings');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create listing';
      toast.error('Unable to create listing', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card data-testid="project-listing-create-card">
      <CardHeader>
        <CardTitle>Create Project Listing</CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectListingForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
      </CardContent>
    </Card>
  );
};

export default CreateProjectListingPage;
