import { supabase } from '@/integrations/supabase/client';

type NodeType = 'skill' | 'assessment' | 'achievement';

interface SkillTreeNodeDefinition {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  category: 'foundations' | 'quality' | 'domain';
  prerequisites: string[];
  criteria: {
    trainings?: string[];
    assessments?: string[];
    achievements?: string[];
    tasks?: number;
    difficulty?: string;
  };
}

export interface SkillTreeDefinition {
  nodes: SkillTreeNodeDefinition[];
  edges: Array<{ from: string; to: string }>;
}

export interface SkillTreeNodeProgress {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  category: SkillTreeNodeDefinition['category'];
  status: 'locked' | 'available' | 'completed';
  requirements: string[];
  progressLabel: string;
  completionPercent: number;
}

export interface WorkerSkillTreeProgress {
  nodes: SkillTreeNodeProgress[];
}

const SKILL_TREE_DEFINITION: SkillTreeDefinition = {
  nodes: [
    {
      id: 'foundations',
      title: 'Workflow Foundations',
      description: 'Complete onboarding + accuracy training modules.',
      type: 'skill',
      category: 'foundations',
      prerequisites: [],
      criteria: {
        trainings: ['core_onboarding', 'accuracy_fundamentals'],
      },
    },
    {
      id: 'quality_guardian',
      title: 'Quality Guardian',
      description: 'Maintain 90%+ quality score across 50 tasks.',
      type: 'achievement',
      category: 'quality',
      prerequisites: ['foundations'],
      criteria: {
        tasks: 50,
        achievements: ['quality_master'],
      },
    },
    {
      id: 'domain_assessment_ai',
      title: 'AI Safety Assessment',
      description: 'Pass the AI safety domain assessment to unlock applied tracks.',
      type: 'assessment',
      category: 'domain',
      prerequisites: ['foundations'],
      criteria: {
        assessments: ['ai_safety'],
      },
    },
    {
      id: 'advanced_reviewer',
      title: 'Advanced Reviewer',
      description: 'Unlock advanced difficulty tasks after clearing assessments.',
      type: 'skill',
      category: 'quality',
      prerequisites: ['quality_guardian', 'domain_assessment_ai'],
      criteria: {
        difficulty: 'advanced',
      },
    },
    {
      id: 'expert_badge',
      title: 'Expert Badge',
      description: 'Earn the domain expert achievement and unlock expert tier.',
      type: 'achievement',
      category: 'domain',
      prerequisites: ['advanced_reviewer'],
      criteria: {
        achievements: ['domain_expert'],
        difficulty: 'expert',
      },
    },
  ],
  edges: [
    { from: 'foundations', to: 'quality_guardian' },
    { from: 'foundations', to: 'domain_assessment_ai' },
    { from: 'quality_guardian', to: 'advanced_reviewer' },
    { from: 'domain_assessment_ai', to: 'advanced_reviewer' },
    { from: 'advanced_reviewer', to: 'expert_badge' },
  ],
};

export const getSkillTreeConfig = (): SkillTreeDefinition => SKILL_TREE_DEFINITION;

const normalizeNumber = (value: number | null | undefined) =>
  Number.isFinite(value) ? Number(value) : 0;

const sumUnitsCompleted = async (workerId: string) => {
  const { data } = await supabase
    .from('work_stats')
    .select('units_completed')
    .eq('worker_id', workerId);
  return (data ?? []).reduce((total, row) => total + normalizeNumber(row.units_completed), 0);
};

const fetchTrainingStatuses = async (workerId: string) => {
  const { data } = await supabase.from('training_gates').select('slug, status').eq('worker_id', workerId);
  const passed = new Set<string>();
  (data ?? []).forEach((row) => {
    if ((row.status ?? '').toLowerCase() === 'passed' && row.slug) {
      passed.add(row.slug);
    }
  });
  return passed;
};

const fetchAssessmentStatuses = async (workerId: string) => {
  const { data } = await supabase
    .from('skill_assessments')
    .select('slug, passed')
    .eq('worker_id', workerId);
  const passed = new Set<string>();
  (data ?? []).forEach((row) => {
    if (row.slug && row.passed) {
      passed.add(row.slug);
    }
  });
  return passed;
};

const fetchAchievementSlugs = async (workerId: string) => {
  const { data } = await supabase
    .from('worker_achievements')
    .select('achievement_id')
    .eq('worker_id', workerId);
  return new Set((data ?? []).map((row) => row.achievement_id).filter(Boolean) as string[]);
};

const fetchUnlockedDifficulties = async (workerId: string) => {
  const { data } = await supabase
    .from('worker_unlocks')
    .select('difficulty_level')
    .eq('worker_id', workerId);
  return new Set((data ?? []).map((row) => row.difficulty_level).filter(Boolean) as string[]);
};

const formatRequirements = (node: SkillTreeNodeDefinition): string[] => {
  const requirements: string[] = [];
  if (node.criteria.trainings?.length) {
    requirements.push(`Training: ${node.criteria.trainings.join(', ')}`);
  }
  if (node.criteria.assessments?.length) {
    requirements.push(`Assessments: ${node.criteria.assessments.join(', ')}`);
  }
  if (node.criteria.achievements?.length) {
    requirements.push(`Achievements: ${node.criteria.achievements.join(', ')}`);
  }
  if (node.criteria.tasks) {
    requirements.push(`Complete ${node.criteria.tasks} tasks`);
  }
  if (node.criteria.difficulty) {
    requirements.push(`Unlock ${node.criteria.difficulty} difficulty`);
  }
  if (!requirements.length) {
    requirements.push('No explicit requirement');
  }
  return requirements;
};

const buildProgressLabel = (
  node: SkillTreeNodeDefinition,
  context: {
    trainings: Set<string>;
    assessments: Set<string>;
    achievements: Set<string>;
    tasks: number;
    difficulties: Set<string>;
  }
) => {
  if (node.criteria.tasks) {
    const percent = Math.min(100, Math.round((context.tasks / node.criteria.tasks) * 100));
    return `${Math.min(context.tasks, node.criteria.tasks)} / ${node.criteria.tasks} tasks (${percent}%)`;
  }
  if (node.criteria.achievements?.length) {
    const earned = node.criteria.achievements.every((slug) => context.achievements.has(slug));
    return earned ? 'Achievement earned' : 'Achievement pending';
  }
  if (node.criteria.assessments?.length) {
    const passed = node.criteria.assessments.every((slug) => context.assessments.has(slug));
    return passed ? 'Assessment passed' : 'Assessment pending';
  }
  if (node.criteria.trainings?.length) {
    const completed = node.criteria.trainings.every((slug) => context.trainings.has(slug));
    return completed ? 'Training complete' : 'Training pending';
  }
  if (node.criteria.difficulty) {
    return context.difficulties.has(node.criteria.difficulty)
      ? 'Difficulty unlocked'
      : 'Difficulty locked';
  }
  return 'Prerequisites only';
};

export async function getWorkerSkillTreeProgress(workerId: string): Promise<WorkerSkillTreeProgress> {
  if (!workerId) {
    return { nodes: SKILL_TREE_DEFINITION.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      type: node.type,
      category: node.category,
      status: 'locked',
      requirements: formatRequirements(node),
      progressLabel: 'Sign in to view progress',
      completionPercent: 0,
    })) };
  }

  const [tasksCompleted, trainings, assessments, achievements, difficulties] = await Promise.all([
    sumUnitsCompleted(workerId),
    fetchTrainingStatuses(workerId),
    fetchAssessmentStatuses(workerId),
    fetchAchievementSlugs(workerId),
    fetchUnlockedDifficulties(workerId),
  ]);

  const context = { trainings, assessments, achievements, tasks: tasksCompleted, difficulties };
  const completedNodes = new Set<string>();

  const nodesWithStatus: SkillTreeNodeProgress[] = SKILL_TREE_DEFINITION.nodes.map((node) => {
    const prereqsMet = node.prerequisites.every((prereq) => completedNodes.has(prereq));
    let completed = true;

    if (node.criteria.trainings) {
      completed &&= node.criteria.trainings.every((slug) => trainings.has(slug));
    }
    if (node.criteria.assessments) {
      completed &&= node.criteria.assessments.every((slug) => assessments.has(slug));
    }
    if (node.criteria.achievements) {
      completed &&= node.criteria.achievements.every((slug) => achievements.has(slug));
    }
    if (node.criteria.tasks) {
      completed &&= tasksCompleted >= node.criteria.tasks;
    }
    if (node.criteria.difficulty) {
      completed &&= difficulties.has(node.criteria.difficulty);
    }

    const status: SkillTreeNodeProgress['status'] = completed
      ? 'completed'
      : prereqsMet
      ? 'available'
      : 'locked';

    if (completed) {
      completedNodes.add(node.id);
    }

    let completionPercent = completed ? 100 : 0;
    if (node.criteria.tasks && !completed) {
      completionPercent = Math.min(100, Math.round((tasksCompleted / node.criteria.tasks) * 100));
    }

    return {
      id: node.id,
      title: node.title,
      description: node.description,
      type: node.type,
      category: node.category,
      status,
      requirements: formatRequirements(node),
      progressLabel: buildProgressLabel(node, context),
      completionPercent,
    };
  });

  return { nodes: nodesWithStatus };
}
