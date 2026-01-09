import type { Database } from './database';

export type WorkerStatus = Database['public']['Enums']['worker_status'];
export type EngagementModel = Database['public']['Enums']['engagement_model'];
export type ProjectStatus = Database['public']['Tables']['projects']['Row']['status'];

export interface WorkerTeamAssignment {
  teamId: string;
  teamName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  assignedAt: string;
  role?: string | null;
}

export interface WorkerProjectSummary {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  joinedAt: string;
  leftAt?: string | null;
}

export interface Worker {
  id: string;
  hrId: string;
  primaryEmail: string;
  secondaryEmail?: string | null;
  country: string;
  locale: string;
  engagementModel: EngagementModel;
  status: WorkerStatus;
  supervisorId?: string | null;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  assignments: WorkerProjectSummary[];
  teams: WorkerTeamAssignment[];
  computed: {
    fullName: string;
    statusLabel: string;
    tenureInDays: number;
    isActive: boolean;
    supervisorName?: string | null;
  };
}

export interface ProjectTeam {
  teamId: string;
  teamName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  leadId?: string | null;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  expertTier?: Database['public']['Enums']['expert_tier'] | null;
  startDate?: string | null;
  endDate?: string | null;
  departmentId?: string | null;
  requiredQualifications?: string[];
  createdAt: string;
  updatedAt: string;
  description?: string | null;
  teams: Array<WorkerTeamAssignment>;
  assignments: WorkerProjectSummary[];
  metrics: {
    activeWorkers: number;
    totalAssignments: number;
    openTasks: number;
  };
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'ilike'
  | 'in'
  | 'is'
  | 'contains'
  | 'containedBy'
  | 'overlaps';

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | boolean[]
  | { from?: string | number; to?: string | number };

export interface FilterState {
  field: string;
  operator: FilterOperator;
  value: FilterValue;
}

export interface WorkStats {
  id: string;
  workerId: string;
  workerAccountId: string;
  projectId: string;
  workDate: string;
  unitsCompleted: number;
  hoursWorked: number;
  earnings: number;
  createdAt: string;
  createdBy?: string | null;
  computed: {
    productivityPerHour: number | null;
    earningsPerHour: number | null;
  };
}

export interface RateCard {
  id: string;
  locale: string;
  expertTier: Database['public']['Enums']['project_expert_tier'];
  country: string;
  ratePerUnit: number;
  ratePerHour: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
  createdBy?: string | null;
  isActive: boolean;
}

export interface InvoiceLineItem {
  projectId: string;
  projectName: string;
  workerId: string;
  workDate: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  workerId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  totalHours: number;
  totalUnits: number;
  totalAmount: number;
  generatedAt: string;
  approvedBy?: string | null;
  lineItems: InvoiceLineItem[];
}

export interface MessagingParticipant {
  workerId: string;
  fullName: string;
  avatarUrl?: string | null;
  lastReadAt?: string | null;
}

export interface MessagingThreadSummary {
  threadId: string;
  subject: string;
  lastMessageSnippet: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: MessagingParticipant[];
  audienceTargets: Array<{
    departmentId?: string | null;
    teamId?: string | null;
  }>;
}

export type TrainingGateStatus = 'locked' | 'in_progress' | 'passed' | 'failed';

export interface TrainingGate {
  id: string;
  workerId: string;
  projectId: string;
  gateName: string;
  status: TrainingGateStatus;
  score: number;
  attemptCount: number;
  passedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QualificationType = 'skill' | 'assessment' | 'tenure' | 'performance' | 'manual';

export interface QualificationRequirement {
  projectId: string;
  type: QualificationType;
  label: string;
  threshold?: number;
  metadata?: Record<string, unknown>;
}

export interface QualificationResult {
  workerId: string;
  requirement: QualificationRequirement;
  satisfied: boolean;
  satisfiedAt?: string | null;
  evidence?: Record<string, unknown>;
}

export interface Skill {
  id: string;
  workerId: string;
  skillName: string;
  skillCategory: Database['public']['Enums']['skill_category'];
  proficiencyLevel: Database['public']['Enums']['proficiency_level'];
  verified: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt: string;
}

export interface SkillAssessment {
  id: string;
  workerId: string;
  skillName: string;
  assessmentType: string;
  score: number;
  passed: boolean;
  takenAt: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ProjectListing {
  id: string;
  projectId: string;
  isActive: boolean;
  capacityMax?: number | null;
  capacityCurrent: number;
  requiredSkills: string[];
  requiredLocales: string[];
  requiredTier: Database['public']['Enums']['project_expert_tier'];
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  computed: {
    spotsRemaining: number | null;
    fillRate: number | null;
    isFull: boolean;
  };
}

export type ApplicationStatus = Database['public']['Enums']['application_status'];

export interface WorkerApplication {
  id: string;
  workerId: string;
  projectListingId: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MarketplaceFilterSort = 'recency' | 'capacity' | 'matching';

export interface MarketplaceFilterState {
  search?: string;
  locales: string[];
  skills: string[];
  tiers: Array<Database['public']['Enums']['project_expert_tier']>;
  statuses: ApplicationStatus[];
  sortBy: MarketplaceFilterSort;
}

export type WorkerFormValues = {
  hrId: string;
  fullName: string;
  engagementModel: EngagementModel;
  workerRole?: string | null;
  emailPersonal: string;
  emailPph?: string | null;
  countryResidence: string;
  localePrimary: string;
  localeAll: string[];
  hireDate: string;
  rtwDateTime?: string | null;
  supervisorId?: string | null;
  terminationDate?: string | null;
  bgcExpirationDate?: string | null;
  status: WorkerStatus;
};

export type ProjectFormValues = {
  code: string;
  name: string;
  status: ProjectStatus;
  departmentId?: string | null;
  expertTier?: Database['public']['Enums']['expert_tier'] | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  assignTeamIds: string[];
};

export type TeamFormValues = {
  name: string;
  departmentId: string;
  localePrimary: string;
  localeSecondary?: string | null;
  region?: string | null;
  isActive: boolean;
};

export type DepartmentFormValues = {
  name: string;
  code: string;
  isActive: boolean;
};

export interface ApiResponse<T> {
  data: T;
  status: number;
  error?: {
    message: string;
    code?: string;
  } | null;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Legacy Maestro Workbench types remain available to avoid breaking existing imports.
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'team_lead' | 'worker';
  initial_password_hash?: string;
  password_changed_at?: string;
  last_sign_in_at?: string;
  suspended?: boolean;
  created_at: string;
  updated_at: string;
}

export type Modality =
  | 'spreadsheet'
  | 'audio-short'
  | 'audio-long'
  | 'text'
  | 'image'
  | 'video'
  | 'multimodal'
  | 'chatbot-eval';

export interface LabelOntology {
  name: string;
  description: string;
  categories: {
    id: string;
    name: string;
    labels: {
      id: string;
      name: string;
      color: string;
      description?: string;
      shortcut?: string;
      children?: {
        id: string;
        name: string;
        color: string;
        description?: string;
        shortcut?: string;
      }[];
    }[];
    multiSelect: boolean;
    required: boolean;
  }[];
  hierarchical?: {
    enabled: boolean;
    parentChild: Record<string, string[]>;
  };
}

export interface ModalityConfig {
  spreadsheet?: Record<string, never>;
  'audio-short'?: {
    fileFormats: string[];
    quality: 'high' | 'standard';
    storageUrl: string;
    transcriptionRequired: boolean;
    playbackControls: {
      speed: boolean;
      loop: boolean;
      rewind: boolean;
    };
  };
  'audio-long'?: {
    fileFormats: string[];
    quality: 'high' | 'standard';
    storageUrl: string;
    waveformControls: {
      zoom: boolean;
      segment: boolean;
      speaker: boolean;
      transcription: boolean;
    };
    timestampPrecision: 'second' | 'millisecond';
  };
  text?: {
    maxLength: number;
    minLength: number;
    allowMarkdown: boolean;
  };
  image?: {
    fileFormats: string[];
    maxResolution: string;
    annotationTools: string[];
  };
  video?: {
    fileFormats: string[];
    maxDuration: number;
    playbackControls: {
      speed: boolean;
      frame: boolean;
    };
  };
  multimodal?: {
    channels: string[];
    supportsFileUpload: boolean;
    allowReferenceAssets?: boolean;
  };
  chatbotEval?: {
    enabled: boolean;
    sections: number;
    questionsPerSection: number[];
    conversationSource: 'data' | 'column';
  };
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  google_sheet_url: string;
  column_config: ColumnConfig[];
  modality: Modality;
  modality_config: ModalityConfig;
  label_ontology?: LabelOntology | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ColumnConfig {
  id: string;
  name: string;
  columnLetter?: string;
  type: 'read' | 'write';
  hidden?: boolean;
  inputType?: 'text' | 'textarea' | 'select' | 'radio' | 'rating' | 'number';
  options?: string[];
  optionColors?: Record<string, string>;
  required?: boolean;
  conditional?: {
    dependsOnColumn: string;
    requiredValue: string;
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  pasteDetection?: boolean;
  pastePreventionEnabled?: boolean;
  tooltip?: string;
}

export interface Task {
  id: string;
  project_id: string;
  row_index: number;
  data: Record<string, unknown>;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  assigned_to?: string;
  assigned_at?: string;
  completed_at?: string;
  completion_time_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  worker_id: string;
  project_id: string;
  assigned_by: string;
  assigned_at: string;
  priority: number;
}

export interface TaskAssignment {
  taskId: string;
  workerId: string;
  assignedAt: string;
  expiresAt: string;
}

export interface TrainingCompletion {
  id: string;
  worker_id: string;
  training_module_id: string;
  project_id: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
}
