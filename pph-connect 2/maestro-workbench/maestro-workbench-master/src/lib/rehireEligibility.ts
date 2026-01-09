const PERFORMANCE_COOLDOWN_MONTHS = 6;

const normalizeReason = (reason?: string | null) => (reason ?? '').toLowerCase();

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export interface RehireEligibilityInput {
  terminationReason?: string | null;
  terminationDate?: string | null;
  today?: Date;
}

export interface RehireEligibilityResult {
  eligible: boolean;
  reasonCode: 'eligible' | 'policy_block' | 'performance_cooldown';
  eligibleAfter?: string | null;
}

export function evaluateRehireEligibility(input: RehireEligibilityInput): RehireEligibilityResult {
  const reason = normalizeReason(input.terminationReason);
  const today = input.today ?? new Date();
  if (reason === 'policy_violation') {
    return { eligible: false, reasonCode: 'policy_block', eligibleAfter: null };
  }

  if (reason === 'performance_issue') {
    if (!input.terminationDate) {
      return { eligible: false, reasonCode: 'performance_cooldown', eligibleAfter: null };
    }
    const terminationDate = new Date(input.terminationDate);
    if (Number.isNaN(terminationDate.getTime())) {
      return { eligible: false, reasonCode: 'performance_cooldown', eligibleAfter: null };
    }
    const eligibleAfterDate = addMonths(terminationDate, PERFORMANCE_COOLDOWN_MONTHS);
    if (today >= eligibleAfterDate) {
      return {
        eligible: true,
        reasonCode: 'eligible',
        eligibleAfter: formatDate(eligibleAfterDate),
      };
    }
    return {
      eligible: false,
      reasonCode: 'performance_cooldown',
      eligibleAfter: formatDate(eligibleAfterDate),
    };
  }

  return { eligible: true, reasonCode: 'eligible', eligibleAfter: null };
}

export { PERFORMANCE_COOLDOWN_MONTHS };
