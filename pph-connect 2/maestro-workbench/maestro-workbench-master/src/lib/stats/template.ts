const TEMPLATE_HEADER = [
  'worker_account_email',
  'project_code',
  'work_date',
  'units_completed',
  'hours_worked'
];

const SAMPLE_ROWS = [
  ['worker1@example.com', 'atlas', '2025-11-10', '120', '8.5'],
  ['worker2@example.com', 'beacon', '2025-11-10', '95', '7.0']
];

export const generateStatsTemplate = (): string => {
  const rows = [TEMPLATE_HEADER, ...SAMPLE_ROWS];
  return rows.map((row) => row.join(',')).join('\r\n');
};

export default generateStatsTemplate;
