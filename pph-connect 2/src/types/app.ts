/**
 * Application-level TypeScript interfaces for Phase 2 features
 * Adapted from Maestro Workbench reference implementation
 */

import type { Database } from './supabase'

// ============================================================================
// RATE CARD TYPES
// ============================================================================

/**
 * Rate card configuration for calculating worker pay
 * Rates vary by locale, expert tier, and country
 */
export interface RateCard {
  id: string
  locale: string
  expertTier: Database['public']['Enums']['expert_tier'] | null
  country: string
  ratePerUnit: number
  ratePerHour: number
  currency: string
  effectiveFrom: string
  effectiveTo?: string | null
  createdAt: string
  createdBy?: string | null
  isActive: boolean
}

// ============================================================================
// INVOICE TYPES
// ============================================================================

/**
 * Individual line item on an invoice
 * Represents work done on a specific project/date
 */
export interface InvoiceLineItem {
  projectId: string
  projectName: string
  workerId: string
  workDate: string
  quantity: number
  unitPrice: number
  subtotal: number
}

/**
 * Invoice for a worker covering a billing period
 * Aggregates work stats into a payable document
 */
export interface Invoice {
  id: string
  workerId: string
  periodStart: string
  periodEnd: string
  currency: string
  totalHours: number
  totalUnits: number
  totalAmount: number
  generatedAt: string
  approvedBy?: string | null
  lineItems: InvoiceLineItem[]
}

// ============================================================================
// TRAINING GATE TYPES
// ============================================================================

/**
 * Status of a training gate for a worker
 */
export type TrainingGateStatus = 'locked' | 'in_progress' | 'passed' | 'failed' | 'pending'

/**
 * Training gate/checkpoint that workers must pass
 * Gates are associated with projects and track completion
 */
export interface TrainingGate {
  id: string
  workerId: string
  projectId: string
  gateName: string
  status: TrainingGateStatus
  score: number | null
  attemptCount: number
  passedAt?: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================================
// QUALIFICATION TYPES
// ============================================================================

/**
 * Types of qualifications that can be required
 */
export type QualificationType = 'skill' | 'assessment' | 'tenure' | 'performance' | 'manual'

/**
 * A qualification requirement for a project
 * Defines what workers need to participate
 */
export interface QualificationRequirement {
  projectId: string
  type: QualificationType
  label: string
  threshold?: number
  metadata?: Record<string, unknown>
}

/**
 * Result of checking if a worker meets a qualification
 */
export interface QualificationResult {
  workerId: string
  requirement: QualificationRequirement
  satisfied: boolean
  satisfiedAt?: string | null
  evidence?: Record<string, unknown>
}

// ============================================================================
// MESSAGING TYPES
// ============================================================================

/**
 * Participant in a messaging thread
 */
export interface MessagingParticipant {
  workerId: string
  fullName: string
  avatarUrl?: string | null
  lastReadAt?: string | null
}

/**
 * Summary of a messaging thread for inbox display
 */
export interface MessagingThreadSummary {
  threadId: string
  subject: string
  lastMessageSnippet: string
  lastMessageAt: string
  unreadCount: number
  participants: MessagingParticipant[]
  audienceTargets: Array<{
    departmentId?: string | null
    teamId?: string | null
  }>
}

// ============================================================================
// WORK STATS TYPES (Application-level)
// ============================================================================

/**
 * Work stats with computed metrics for display
 * Extends the base WorkStat from schemas/workStats.ts
 */
export interface WorkStatsWithMetrics {
  id: string
  workerId: string
  workerAccountId: string | null
  projectId: string
  workDate: string
  unitsCompleted: number | null
  hoursWorked: number | null
  earnings: number | null
  createdAt: string
  createdBy?: string | null
  computed: {
    productivityPerHour: number | null
    earningsPerHour: number | null
  }
}

// ============================================================================
// SKILL TYPES
// ============================================================================

/**
 * Skill associated with a worker
 */
export interface Skill {
  id: string
  workerId: string
  skillName: string
  skillCategory: string
  proficiencyLevel: string
  verified: boolean
  verifiedAt?: string | null
  verifiedBy?: string | null
  createdAt: string
}

/**
 * Assessment of a worker's skill
 */
export interface SkillAssessment {
  id: string
  workerId: string
  skillName: string
  assessmentType: string
  score: number
  passed: boolean
  takenAt: string
  expiresAt?: string | null
  createdAt: string
}

// ============================================================================
// TRAINING ACCESS TYPES
// ============================================================================

/**
 * Worker's access to a training material
 */
export interface WorkerTrainingAccess {
  id: string
  workerId: string
  trainingMaterialId: string
  grantedAt: string
  completedAt?: string | null
}

/**
 * Training material with access and completion info
 */
export interface TrainingMaterialWithAccess {
  id: string
  projectId: string
  title: string
  description?: string | null
  type: string
  url: string
  createdAt: string
  createdBy?: string | null
  // Access info for a specific worker
  access?: {
    grantedAt: string
    completedAt?: string | null
  } | null
}
