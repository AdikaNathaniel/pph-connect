-- Synthetic data seeding for large dataset performance tests
-- Projects
insert into projects (project_code, project_name, department_id, expert_tier, status)
select
  concat('P', lpad(i::text, 4, '0')) as project_code,
  concat('Synthetic Project ', i),
  (select id from departments limit 1),
  'TIER_1',
  'active'
from generate_series(1, 100) as s(i);

-- Workers
insert into workers (hr_id, first_name, last_name, email_personal, status, supervisor_id)
select
  concat('HR', lpad(i::text, 5, '0')),
  'Worker',
  concat('Load', i),
  concat('worker', i, '@load.test'),
  'active',
  null
from generate_series(1, 1000) as s(i);

-- Work stats
insert into work_stats (worker_id, project_id, work_date, units_completed, hours_worked, earnings)
select
  w.id,
  p.id,
  current_date - (random() * 14)::int,
  120 + (random() * 30)::int,
  6 + (random() * 3)::int,
  45 + (random() * 10)::int
from workers w
join projects p on w.id % 100 = p.id % 100;
