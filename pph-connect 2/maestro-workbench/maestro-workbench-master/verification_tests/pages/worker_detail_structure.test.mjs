import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const appPath = resolvePath(['src', 'App.tsx']);
const detailPagePath = resolvePath(['src', 'pages', 'manager', 'WorkerDetail.tsx']);

test('WorkerDetail page file should exist and export component', () => {
  assert.ok(existsSync(detailPagePath), 'Expected WorkerDetail.tsx to exist');
  const content = readFileSync(detailPagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerDetail\b/, 'Expected named WorkerDetail export');
  assert.match(content, /export\s+default\s+WorkerDetail\b/, 'Expected default WorkerDetail export');
});

test('App routes should mount WorkerDetail for /m/workers/:id', () => {
  assert.ok(existsSync(appPath), 'Expected App.tsx to exist');
  const content = readFileSync(appPath, 'utf8');

  assert.match(
    content,
    /const\s+WorkerDetail\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\(["']\.\/pages\/manager\/WorkerDetail["']\)\s*\);/,
    'Expected WorkerDetail lazy import in App routes'
  );

  assert.match(
    content,
    /<Route\s+path="\/m\/workers\/:id"\s+element=\{\s*<ProtectedRoute\s+requiredRole="manager">\s*<ManagerLayout\s+pageTitle="Worker Detail">[\s\S]*?<WorkerDetail\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected /m/workers/:id route rendering WorkerDetail within ManagerLayout'
  );
});

test('WorkerDetail fetches worker record with related accounts and assignments', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /import\s+(?:React,\s*)?\{\s*useCallback,\s*useEffect,\s*useMemo,\s*useState\s*\}\s+from\s+'react';/,
    'Expected React hooks for data fetching state'
  );
  assert.match(
    content,
    /import\s+\{\s*Link,\s*useParams\s*\}\s+from\s+'react-router-dom';/,
    'Expected Link and useParams imports for worker id and breadcrumb'
  );
  assert.match(
    content,
    /import\s+\{\s*supabase\s*\}\s+from\s+'@\/integrations\/supabase\/client';/,
    'Expected supabase client import'
  );
  assert.match(
    content,
    /const\s+WORKER_DETAIL_SELECT\s*=\s*`[\s\S]*worker_accounts[\s\S]*worker_assignments[\s\S]*`;/,
    'Expected select constant to include accounts and assignments relations'
  );
  assert.match(
    content,
    /supabase[\s\S]*\.from\('workers'\)[\s\S]*\.select\(WORKER_DETAIL_SELECT\)[\s\S]*\.eq\('id',\s*workerId\)[\s\S]*\.maybeSingle\(\)/,
    'Expected supabase query for worker detail'
  );
});

test('WorkerDetail header renders breadcrumb, status badge, BGC icon, and primary actions', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*Link,\s*useParams\s*\}\s+from\s+'react-router-dom';/,
    'Expected Link and useParams imports for breadcrumb'
  );
  assert.match(
    content,
    /import\s+\{\s*Button\s*\}\s+from\s+'@\/components\/ui\/button';/,
    'Expected button import for header actions'
  );
  assert.match(
    content,
    /import\s+\{\s*DropdownMenu,\s*DropdownMenuContent,\s*DropdownMenuItem,\s*DropdownMenuLabel,\s*DropdownMenuSeparator,\s*DropdownMenuTrigger\s*\}\s+from\s+'@\/components\/ui\/dropdown-menu';/,
    'Expected dropdown menu imports for more actions'
  );
  assert.match(
    content,
    /import\s+StatusBadge\s+from\s+'@\/components\/status\/StatusBadge';/,
    'Expected StatusBadge import'
  );
  assert.match(
    content,
    /import\s+\{\s*BGCStatusIcon\s*\}\s+from\s+'@\/components\/status\/BGCStatusIcon';/,
    'Expected BGC status icon import'
  );
  assert.match(
    content,
    /data-testid="worker-detail-breadcrumb"/,
    'Expected breadcrumb test id'
  );
  assert.match(
    content,
    /data-testid="worker-detail-actions"/,
    'Expected actions container test id'
  );
  assert.match(
    content,
    /const\s+statusActionLabel\s*=\s*worker\?\.status\s*===\s*'active'\s*\?\s*'Deactivate'\s*:\s*'Reactivate';/,
    'Expected status-aware action label logic'
  );
  assert.match(
    content,
    /toast\.info\(/,
    'Expected toast placeholder actions'
  );
});

test('WorkerDetail header exposes quick action controls via test ids', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /data-testid="worker-detail-toggle-status"/,
    'Expected toggle status button test id'
  );
  assert.match(content, /data-testid="worker-detail-edit"/, 'Expected edit button test id');
  assert.match(
    content,
    /data-testid="worker-detail-more-actions"/,
    'Expected more actions trigger test id'
  );
});

test('WorkerDetail header binds worker name into breadcrumb and title landmarks', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(content, /data-testid="worker-detail-title"/, 'Expected worker title test id');
  assert.match(content, /data-testid="worker-detail-status"/, 'Expected status badge test id');
  assert.match(content, /data-testid="worker-detail-breadcrumb"/, 'Expected breadcrumb section');
  assert.match(content, /<BGCStatusIcon\b/, 'Expected BGC status icon in header');
});

test('WorkerDetail profile section renders grid of metadata cards with computed values', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*Card,\s*CardContent\s*\}\s+from\s+'@\/components\/ui\/card';/,
    'Expected card components import'
  );
  assert.match(
    content,
    /import\s+\{\s*Badge\s*\}\s+from\s+'@\/components\/ui\/badge';/,
    'Expected Badge import for platform label'
  );
  assert.match(
    content,
    /const\s+currentWorkerEmail\s*=\s*/i,
    'Expected derived currentWorkerEmail constant'
  );
  assert.match(
    content,
    /const\s+profileItems\s*=\s*useMemo/,
    'Expected profile items configuration array'
  );
  assert.match(
    content,
    /data-testid="worker-detail-profile"/,
    'Expected profile section test id'
  );
  assert.match(
    content,
    /to=\{\`\/m\/workers\/\$\{worker\.supervisor\.id\}\`\}/,
    'Expected supervisor link pointing to worker detail route'
  );
  assert.match(
    content,
    /justify-between[^>]*gap-3[^>]*text-sm[^>]*text-muted-foreground/,
    'Expected contextual metadata row styling'
  );
  assert.match(
    content,
    /data-testid="worker-detail-metadata"/,
    'Expected header metadata container test id'
  );
  assert.match(
    content,
    /The\s+header\s+metadata\s+should\s+summarize/,
    'Expected descriptive copy guiding future enhancements'
  );
});

test('WorkerDetail defines tabbed sections for accounts, projects, and activity', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*Tabs,\s*TabsContent,\s*TabsList,\s*TabsTrigger\s*\}\s+from\s+'@\/components\/ui\/tabs';/,
    'Expected tabs component imports'
  );
  assert.match(content, /data-testid="worker-detail-tabs"/, 'Expected tabs container test id');
  assert.match(
    content,
    /<TabsTrigger value="accounts"[^>]*>\s*Accounts\s*<\/TabsTrigger>/,
    'Expected Accounts tab trigger'
  );
  assert.match(
    content,
    /<TabsTrigger value="projects"[^>]*>\s*Projects\s*<\/TabsTrigger>/,
    'Expected Projects tab trigger'
  );
  assert.match(
    content,
    /<TabsTrigger value="activity"[^>]*>\s*Activity\s*<\/TabsTrigger>/,
    'Expected Activity tab trigger'
  );
  assert.match(
    content,
    /TabsContent value="accounts"[\s\S]*?Platform Accounts/,
    'Expected Platform Accounts section title'
  );
  assert.match(
    content,
    /data-testid="worker-accounts-add"/,
    'Expected add account control in accounts tab'
  );
  assert.match(content, /TableHead[^>]*>\s*Platform\s*</, 'Expected Platform column header');
  assert.match(content, /TableHead[^>]*>\s*Account Email\s*</, 'Expected Account Email column header');
  assert.match(content, /TableHead[^>]*>\s*Account ID\s*</, 'Expected Account ID column header');
  assert.match(content, /TableHead[^>]*>\s*Status\s*</, 'Expected Status column header');
  assert.match(content, /TableHead[^>]*>\s*Current\s*</, 'Expected Current column header');
  assert.match(content, /TableHead[^>]*>\s*Activated\s*</, 'Expected Activated column header');
  assert.match(content, /TableHead[^>]*>\s*Deactivated\s*</, 'Expected Deactivated column header');
  assert.match(content, /TableHead[^>]*>\s*Actions\s*</, 'Expected Actions column header');
  assert.match(content, /View Details/, 'Expected View Details action placeholder');
  assert.match(content, /Replace Account/, 'Expected Replace Account action placeholder');
  assert.match(content, /View History/, 'Expected View History action placeholder');
  assert.match(
    content,
    /import\s+\{\s*ReplaceAccountModal\s*\}\s+from\s+'@\/components\/worker\/ReplaceAccountModal';/,
    'Expected ReplaceAccountModal import'
  );
  assert.match(
    content,
    /<ReplaceAccountModal\s+account=\{selectedAccount\}[\s\S]*onClose=\{handleCloseReplaceModal\}[\s\S]*onSuccess=\{handleReplaceSuccess\}\s*\/>/,
    'Expected ReplaceAccountModal usage with handlers'
  );
  assert.match(
    content,
    /import\s+\{\s*RemoveAssignmentModal\s*\}\s+from\s+'@\/components\/worker\/RemoveAssignmentModal';/,
    'Expected RemoveAssignmentModal import'
  );
  assert.match(
    content,
    /import\s+\{\s*AssignToProjectModal\s*\}\s+from\s+'@\/components\/worker\/AssignToProjectModal';/,
    'Expected AssignToProjectModal import'
  );
  assert.match(
    content,
    /<RemoveAssignmentModal\s+assignment=\{selectedAssignment\}[\s\S]*onClose=\{handleCloseRemoveModal\}[\s\S]*onSuccess=\{handleRemoveSuccess\}\s*\/>/,
    'Expected RemoveAssignmentModal usage with handlers'
  );
  assert.match(
    content,
    /<AssignToProjectModal[\s\S]*workerId=\{workerId(?:\s*\?\?\s*null)?\}[\s\S]*existingProjectIds=\{[\s\S]*activeAssignments\s*\.\s*map\(\(assignment\)\s*=>\s*assignment\.project_id\)[\s\S]*\}[\s\S]*open=\{isAssignModalOpen\}[\s\S]*onClose=\{handleCloseAssignModal\}[\s\S]*onSuccess=\{handleAssignSuccess\}[\s\S]*\/>/,
    'Expected AssignToProjectModal usage with worker context and callbacks'
  );
  assert.match(
    content,
    /const\s+\[isAssignModalOpen,\s*setAssignModalOpen\]\s*=\s*useState\(false\);/,
    'Expected assign modal visibility state'
  );
  assert.match(
    content,
    /const\s+handleOpenAssignModal\s*=\s*\(\)\s*=>\s*setAssignModalOpen\(true\);/,
    'Expected handler to open assign modal'
  );
  assert.match(
    content,
    /const\s+handleCloseAssignModal\s*=\s*\(\)\s*=>\s*setAssignModalOpen\(false\);/,
    'Expected handler to close assign modal'
  );
  assert.match(
    content,
    /const\s+handleAssignSuccess\s*=\s*\(\)\s*=>\s*\{\s*handleCloseAssignModal\(\);\s*fetchWorker\(\);\s*\};/,
    'Expected assign success handler to refresh worker data'
  );
  assert.match(
    content,
    /TabsContent value="projects"[\s\S]*?Project Assignments/,
    'Expected Project Assignments section title'
  );
  assert.match(
    content,
    /data-testid="worker-projects-assign"/,
    'Expected Assign to Project button test id'
  );
  assert.match(
    content,
    /onClick=\{\s*handleOpenAssignModal\s*\}/,
    'Expected assign button to trigger modal open handler'
  );
  assert.match(content, /TableHead[^>]*>\s*Project Code\s*</, 'Expected Project Code column header');
  assert.match(content, /TableHead[^>]*>\s*Project Name\s*</, 'Expected Project Name column header');
  assert.match(content, /TableHead[^>]*>\s*Department\s*</, 'Expected Department column header');
  assert.match(content, /TableHead[^>]*>\s*Status\s*</, 'Expected Project Status column header');
  assert.match(content, /TableHead[^>]*>\s*Assigned Date\s*</, 'Expected Assigned Date column header');
  assert.match(content, /TableHead[^>]*>\s*Assigned By\s*</, 'Expected Assigned By column header');
  assert.match(content, /TableHead[^>]*>\s*Actions\s*</, 'Expected Project actions column header');
  assert.match(
    content,
    /worker\.worker_assignments\.filter\(\(assignment\) => !assignment\.removed_at\)/,
    'Expected filtering to show only current assignments'
  );
  assert.match(
    content,
    /data-testid="worker-projects-empty"/,
    'Expected empty state sentinel for projects table'
  );
  assert.match(
    content,
    /data-testid="worker-projects-remove"/,
    'Expected remove project action test id'
  );
  assert.match(
    content,
    /TabsContent value="activity"[\s\S]*?Activity timeline coming soon/,
    'Expected Activity tab placeholder'
  );
  assert.match(
    content,
    /<Badge[^>]+variant="outline"[^>]*>\s*\{\s*formatEnumLabel\(account\.status\)\s*\?\?\s*'Unknown'\s*\}\s*<\/Badge>/,
    'Expected status badge to use outline variant and formatted label'
  );
  assert.match(
    content,
    /<Badge[^>]+variant="default"[^>]*>\s*Current\s*<\/Badge>/,
    'Expected Current badge for active account'
  );
  assert.match(
    content,
    /<Badge[^>]+variant="outline"[^>]*>\s*Historic\s*<\/Badge>/,
    'Expected Historic badge for inactive accounts'
  );
  assert.match(
    content,
    /worker\.worker_accounts\.length\s+>\s+0\s+\?\s*\(/,
    'Expected conditional to iterate all accounts when present'
  );
  assert.match(
    content,
    /data-testid="worker-accounts-empty"/,
    'Expected explicit empty state row sentinel'
  );
});

test('WorkerDetail exposes training tab with materials and gate status', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /<TabsTrigger value="training"[^>]*>\s*Training\s*<\/TabsTrigger>/,
    'Expected Training tab trigger'
  );
  assert.match(content, /workerTrainingMaterials/i, 'Expected training materials data load');
  assert.match(content, /workerTrainingGates/i, 'Expected training gates data load');
  assert.match(content, /data-testid="worker-training-materials"/i, 'Expected training materials section');
  assert.match(content, /data-testid="worker-training-gates"/i, 'Expected training gates section');
});

test('WorkerDetail exposes earnings tab with balance summary and breakdown', () => {
  const content = readFileSync(detailPagePath, 'utf8');

  assert.match(
    content,
    /import\s+\{\s*calculateWorkerBalance,\s*getBalanceBreakdown\s*\}\s+from\s+'@\/services\/balanceService';/,
    'Expected balance service imports'
  );
  assert.match(
    content,
    /<TabsTrigger\s+value="earnings"/,
    'Expected earnings tab trigger'
  );
  assert.match(
    content,
    /const\s+earningsCards\s*=\s*useMemo\(/,
    'Expected earnings summary cards memoization'
  );
  assert.match(content, /data-testid="worker-earnings-summary"/, 'Expected earnings summary container');
  assert.match(content, /Total balance/, 'Expected total balance summary label');
  assert.match(content, /This month/, 'Expected this month summary label');
  assert.match(content, /This quarter/, 'Expected this quarter summary label');
  assert.match(content, /data-testid="worker-earnings-breakdown"/, 'Expected earnings breakdown table');
  assert.match(
    content,
    /No earnings recorded for the selected period\./,
    'Expected empty state copy for breakdown table'
  );
  assert.match(
    content,
    /formatCurrencyDisplay\(row\.earnings,\s*row\.currency\s*\?\?\s*earningsSummary\.currency\)/,
    'Expected currency formatting helper for breakdown rows'
  );
  assert.match(content, /data-testid="worker-earnings-chart"/, 'Expected earnings chart placeholder');
  assert.match(
    content,
    /Visualization coming soon\.\s+This space will highlight how earnings trend across months and quarters\./,
    'Expected chart placeholder messaging'
  );
});

test('WorkerDetail includes qualifications tab with completed and available sections', () => {
  const content = readFileSync(detailPagePath, 'utf8');
  assert.match(
    content,
    /<TabsTrigger value="qualifications"[^>]*>\s*Qualifications\s*<\/TabsTrigger>/,
    'Expected qualifications tab trigger'
  );
  assert.match(content, /data-testid="worker-detail-qualifications"/, 'Expected qualifications tab container');
  assert.match(
    content,
    /data-testid="worker-detail-qualifications-completed"/,
    'Expected completed qualifications section test id'
  );
  assert.match(
    content,
    /data-testid="worker-detail-qualifications-available"/,
    'Expected available qualifications section test id'
  );
  assert.match(content, /Qualifications Overview/, 'Expected descriptive copy for qualifications tab');
});

test('WorkerDetail displays re-qualification reminders for expiring credentials', () => {
  const content = readFileSync(detailPagePath, 'utf8');
  assert.match(content, /data-testid="worker-detail-qualifications-renewal"/, 'Expected renewal reminder block');
  assert.match(content, /Renewal Required/, 'Expected renewal headline copy');
  assert.match(content, /Expiring soon/, 'Expected expiring soon messaging');
});
