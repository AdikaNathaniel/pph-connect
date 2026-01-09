import type { ComponentType } from 'react';
import { UserPlus, ClipboardList, UploadCloud } from 'lucide-react';

export interface QuickActionDefinition {
  id: string;
  label: string;
  helper: string;
  href: string;
  variant: 'primary' | 'secondary';
  icon: ComponentType<{ className?: string }>;
}

export const QUICK_ACTION_CONFIG: QuickActionDefinition[] = [
  {
    id: 'add-worker',
    label: 'Add Worker',
    helper: 'Invite a worker to the workspace',
    href: '/m/workers?view=invite',
    variant: 'primary',
    icon: UserPlus
  },
  {
    id: 'add-project',
    label: 'Add Project',
    helper: 'Create a new project shell',
    href: '/m/projects/new',
    variant: 'primary',
    icon: ClipboardList
  },
  {
    id: 'bulk-upload',
    label: 'Bulk Upload Workers',
    helper: 'Import worker roster via CSV',
    href: '/m/workers/bulk-upload',
    variant: 'secondary',
    icon: UploadCloud
  }
];
