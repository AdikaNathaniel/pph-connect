import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const iconPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'status', 'BGCStatusIcon.tsx'),
    path.join(process.cwd(), 'src', 'components', 'status', 'BGCStatusIcon.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate BGCStatusIcon.tsx');
  }
  return match;
})();

const content = readFileSync(iconPath, 'utf8');

test('BGCStatusIcon exports expected API', () => {
  assert.match(content, /export\s+interface\s+BGCStatusIconProps/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+BGCStatusIcon/, 'Expected component export');
  assert.match(content, /import\s+\{\s*Tooltip,\s*TooltipContent,\s*TooltipProvider,\s*TooltipTrigger\s*\}\s+from '@\/components\/ui\/tooltip'/, 'Expected tooltip imports');
  assert.match(content, /import\s+\{\s*CheckCircle2,\s*AlertTriangle,\s*AlertOctagon\s*\}\s+from 'lucide-react'/, 'Expected icon imports');
});

test('BGCStatusIcon provides statuses and color coding', () => {
  assert.match(content, /No background check on file/, 'Expected missing BGC label');
  assert.match(content, /Invalid expiration date/, 'Expected invalid date label');
  assert.match(content, /Expires in \${diffDays} day/, 'Expected expiring soon copy');
  assert.match(content, /Expired \$\{Math\.abs\(diffDays\)\} day/, 'Expected expired copy');
  assert.match(content, /Valid until \${expiry\.toLocaleDateString\(\)}/, 'Expected valid copy');
  assert.match(content, /text-muted-foreground/, 'Expected muted foreground color for missing/invalid');
  assert.match(content, /text-amber-500/, 'Expected amber color for expiring soon');
  assert.match(content, /text-destructive/, 'Expected destructive color for expired');
  assert.match(content, /text-emerald-500/, 'Expected emerald color for valid');
});

test('BGCStatusIcon exposes tooltip and testing hooks', () => {
  assert.match(content, /<TooltipProvider>/, 'Expected TooltipProvider usage');
  assert.match(content, /<TooltipTrigger\s+asChild/, 'Expected TooltipTrigger rendered as child');
  assert.match(content, /aria-label=\{status\.label\}/, 'Expected aria-label on icon wrapper');
  assert.match(content, /data-testid="bgc-status-icon"/, 'Expected data-testid on icon wrapper');
  assert.match(content, /TooltipContent>/, 'Expected tooltip content markup');
  assert.match(content, /<span className="text-xs">\{status\.label\}<\/span>/, 'Expected tooltip value to show status label');
});
