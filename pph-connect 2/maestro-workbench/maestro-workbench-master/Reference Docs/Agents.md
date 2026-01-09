# Agent Instructions

Important: Our .env file uses these exact variable names:
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_PROJECT_ID

Do not rename or remove these variables.
Before making changes that use environment variables, 
check @.env to see what variables currently exist.

Do NOT modify .env file unless explicitly asked. 
Only update code to use existing .env variables.

Context: 
- Backend: Supabase
- Env vars are in @.env - do not modify without permission
- Use existing variable names, don't create new ones


## Core Principles

1. **Small steps, frequent commits** - Break complex tasks into small chunks. Git commit after EACH working step. Never run wild with massive changes.

2. **Stop and ask when uncertain** - Don't assume. If unclear about requirements, approach, or impact, stop and ask for clarification.

3. **Reference the docs first** - Before ANY work, check:
   - `@Design Principles.md` - for UI/styling decisions
   - `@Architecture Principles.md` - for code structure decisions
   - When in doubt, reference these docs instead of making assumptions

4. **No auto-iteration** - Never loop or iterate automatically. Max 3 attempts on any task, then stop and report. Always wait for human feedback before trying again.

5. **Preserve working state** - Never delete or refactor working code without a git commit first. Suggest creating a feature branch for risky changes.

---

## Workflow for Every Task

1. **Understand** - Read the request fully. Ask clarifying questions if needed.
2. **Check docs** - Review relevant `.md` files in the project.
3. **Plan** - Briefly state your approach (1-2 sentences).
4. **Implement** - Make changes in small, testable increments.
5. **Verify** - Test that it works (check localhost if UI change).
6. **Commit** - Git commit with clear message.
7. **Report** - Explain what you did and why.

---

## When to Stop and Ask

**Always pause and ask for confirmation before:**
- Deleting or heavily refactoring existing working code
- Making changes that affect multiple files (5+)
- Installing new major dependencies
- Changing core architecture or data models
- Making breaking changes to APIs or interfaces
- You've attempted the same thing 3 times without success

**Ask clarifying questions when:**
- Requirements are ambiguous
- Multiple valid approaches exist
- You don't see relevant examples in the codebase
- The request conflicts with existing patterns

---

## Communication Style

**Do:**
- Be concise but clear
- Explain your changes briefly (1-2 sentences)
- Point out potential issues or tradeoffs
- Suggest alternatives when appropriate
- Use the actual file names and line numbers

**Don't:**
- Apologize excessively
- Write long explanations unless asked
- Make excuses for limitations
- Repeat the same information
- Use phrases like "I'm just an AI" or "I can't know for sure"

---

## Quality Standards

Before marking any task complete:

**For ALL code:**
- [ ] Follows existing patterns in the codebase
- [ ] Git committed with clear message
- [ ] Tested and verified working
- [ ] No console errors or warnings

**For UI work:**
- [ ] Checked `@Design Principles.md` compliance
- [ ] Uses Shadcn components (no custom alternatives)
- [ ] Matches visual reference examples
- [ ] All interactive states work (hover, focus, disabled)

**For architecture/logic:**
- [ ] Checked `@Architecture Principles.md` compliance
- [ ] Follows established patterns
- [ ] Properly typed (TypeScript)
- [ ] Error handling included

---

## Common Mistakes to Avoid

❌ Making massive changes without incremental commits  
❌ Auto-iterating in loops without human feedback  
❌ Assuming requirements instead of asking  
❌ Ignoring the reference docs  
❌ Deleting working code without committing first  
❌ Creating custom components when Shadcn has them  
❌ Overcomplicating simple requests  

---

## Project-Specific Notes

**This is a Shadcn-based admin portal:**
- Data tables are CRITICAL - invest time in doing them right
- Reference https://ui.shadcn.com/examples/dashboard heavily
- Blue theme (blue-900 default)
- Geist font
- Desktop-first (1568px), then mobile

**File structure:**
- `components/ui/` - Shadcn components (never modify)
- `components/tables/` - Custom data-table implementations
- Always check existing files before creating new ones

---

## Success Criteria

**You're doing well when:**
✅ Changes are small and incremental  
✅ Each step is committed to git  
✅ You ask questions when uncertain  
✅ Code follows the reference docs  
✅ User can verify each change works  

**You need to adjust when:**
⚠️ Making changes across many files at once  
⚠️ Trying the same approach repeatedly without success  
⚠️ Making assumptions instead of asking  
⚠️ Proposing to delete/rewrite large portions of code  

---

**Remember: Small steps, frequent commits, reference the docs, stop and ask when uncertain.**

## Debugging Supabase Functions

Lessons learned from debugging the `claim_next_available_question` function.

### Principle: 500 Errors Hide the Real Problem

When a Supabase Edge Function returns a generic `500` error, it almost always means the underlying PostgreSQL function (RPC) it's calling has crashed. The generic 500 error from the Edge Function is a symptom, not the cause. Don't waste time debugging the Edge Function's JavaScript/TypeScript code.

### Strategy: Go Directly to the Database

The fastest way to find the root cause is to get the specific error message from within the PostgreSQL function itself.

1.  **Isolate the SQL Function**: Identify the `.sql` migration file that defines the failing RPC.
2.  **Add Exception Logging**: Modify the function to include a comprehensive `EXCEPTION WHEN OTHERS` block at the end.
3.  **Use `RAISE WARNING`**: Inside the exception block, use `RAISE WARNING` to log the internal PostgreSQL error variables `SQLSTATE` (the error code) and `SQLERRM` (the error message). This is critical because `RAISE EXCEPTION` would halt execution and still result in a 500. `RAISE WARNING` allows the function to fail gracefully while still reporting the error.

    ```sql
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[function_name] Failed. SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RETURN; -- Return empty or a default value
    ```
4.  **Apply and Test**: Apply the modified SQL and re-run the failing operation in the application.
5.  **Check Database Logs**: The detailed warning message will now appear in the main **Database Logs** in the Supabase Dashboard, revealing the true cause of the failure (e.g., "column reference is ambiguous").

### Common Cause: Ambiguous Column References

In complex plpgsql functions that involve multiple tables, joins, or `INSERT ... RETURNING` clauses, a common error is **ambiguous column reference**.

- **Symptom**: The function crashes with an error like `column reference "id" is ambiguous`.
- **Cause**: The database engine doesn't know which table a column belongs to. This is especially common with columns named `id`, `project_id`, etc., that appear in multiple tables or even in the function's `RETURNS TABLE` signature.
- **Solution**: Always explicitly qualify column names with their table name (e.g., `public.tasks.id` or `q.project_id`) in all `SELECT`, `WHERE`, and `RETURNING` clauses to remove all ambiguity.

---

## Security & Dependencies

**Before adding or updating dependencies:**
- [ ] Run `snyk test` to check for vulnerabilities
- [ ] Review Snyk report for critical/high severity issues
- [ ] Document any security exceptions if unavoidable
- [ ] Git commit dependency changes separately from code changes

**After dependency changes:**
- [ ] Verify no new vulnerabilities introduced
- [ ] Update package-lock.json/yarn.lock
- [ ] Test that application still runs correctly

---

## Development Environment

**This project runs on a company laptop with SSL inspection:**
- Use **yarn** instead of npm for package management
- If SSL errors occur: `yarn config set strict-ssl false`
- Network requests may fail due to corporate proxy
- Node.js fetch may fail in scripts, but app works fine in browser