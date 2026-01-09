# Architecture Principles

## Platform Context

**Type:** AI Data Annotation & Training Platform  
**Similar to:** Surge AI, DataAnnotation.tech, Scale AI (Remotasks)  
**Core Function:** High-quality data labeling with expert workers, ML-powered quality control, automated workflows, and embedded QA at scale  

**Key Differentiators from Basic Microtasking:**
- Expert workforce matching (skills-based, not just availability)
- ML algorithms for quality detection and worker scoring
- Automated quality control embedded throughout workflows
- RLHF (Reinforcement Learning from Human Feedback) capabilities
- Complex task types beyond simple classification

**Critical Requirement:** Must handle **massive volume** efficiently with **uncompromising quality**. Every architectural decision must answer: *"Will this work when processing 100x the current volume while maintaining expert-level quality?"*

---

## Core Architecture Mandate

### Everything is Systemized

**No ad-hoc solutions.** Every calculation, metric, validation, or process must have a defined place in the system architecture.

**Before creating any calculation or metric, STOP and ask:**
1. Does this calculation already exist elsewhere in the system?
2. Should this be a centralized service that other features can use?
3. If we scale to 100x volume, will this approach still work?
4. Is this being calculated in the right place (backend vs frontend)?

**Golden Rule:** If multiple places might need this data/calculation, it belongs in a shared service, not duplicated in components.

---

## Performance & Scalability First

### Design for Volume

Every feature must be built assuming:
- 10,000+ concurrent workers
- 1,000,000+ tasks in the system
- 100,000+ task completions per day
- Real-time quality validation
- Multi-tenant workload distribution

**Ask yourself:** *"If we push tons of volume through the platform, will this process reference/rely on this efficiently?"*

### Efficiency Principles

1. **Lightweight over feature-rich** - Simple, fast operations beat complex, slow ones
2. **Batch processing** - Never process items one-at-a-time when batch operations are possible
3. **Async where possible** - Don't block users waiting for background processes
4. **Cache aggressively** - Computed metrics should be cached, not recalculated
5. **Database indexes** - Every query pattern needs proper indexing

---

## Clean Architecture (No Debt Mountains)

### Everything Has a Place

```
backend/
  services/          // Business logic (task distribution, quality control)
  models/            // Data models and schemas
  api/               // API routes and controllers
  workers/           // Background jobs and queue processors
  utils/             // Shared utilities and helpers
  validators/        // Input validation and quality checks
  
frontend/
  components/        // Reusable UI components
    ui/              // Shadcn components (never modify)
    tables/          // Data table implementations
    forms/           // Form compositions
  services/          // API clients and data fetching
  lib/               // Client-side utilities
  types/             // TypeScript type definitions
```

**Rule:** If you can't quickly identify where code belongs, the structure needs refinement.

---

## Centralized Metrics & Calculations

### Metric Philosophy

**All metrics must be:**
1. **Defined once** - Single source of truth
2. **Cached** - Pre-computed where possible
3. **ML-enhanced** - Leverage algorithms for predictive metrics
4. **Versioned** - Track changes to calculation logic
5. **Documented** - Clear explanation of what/why/how

### Metric Categories

**Worker Metrics:**
- Quality score (ML-weighted, not simple accuracy)
- Domain expertise scores (per specialty area)
- Throughput (tasks per hour, by complexity tier)
- Earnings (cumulative, by project, by task type)
- Reliability score (consistency over time)
- Specialization ratings (STEM, legal, creative, etc.)

**Task Metrics:**
- Completion rate and time-to-complete
- Quality score (consensus + expert validation)
- Inter-annotator agreement
- Cost per task (actual vs estimated)
- Difficulty rating (ML-predicted complexity)

**Project Metrics:**
- Total questions / questions completed / active questions
- Progress percentage (weighted by task complexity)
- Quality distribution (histogram of task quality scores)
- Worker expertise distribution
- Cost efficiency (actual cost vs budget)
- Predicted completion date (ML forecast)

**Quality Metrics (Critical):**
- Gold standard pass rate
- Consensus agreement scores
- Expert review outcomes
- Error patterns (by worker, task type, project)
- Quality trend over time

**DO NOT calculate these ad-hoc in UI components. Surface them from backend services with ML model integration.**

---

## Quality Control Architecture

### Modern Data Annotation Quality Philosophy

Quality control in modern data annotation is often an adversarial problem, similar to email spam, requiring sophisticated ML infrastructure to flag human errors and fix them.

**Core Principles:**
1. **Human-in-the-loop** - ML automation paired with expert human oversight
2. **Embedded QA** - Quality checks integrated throughout the workflow, not just at the end
3. **ML-powered detection** - Algorithms identify patterns, anomalies, and potential errors
4. **Expert matching** - Route tasks to workers with proven domain expertise
5. **Real-time feedback** - Immediate quality signals back to workers

### Quality Mechanisms (Layered Approach)

**Layer 1: Pre-Task (Worker Selection)**
- Skills assessment and qualification tests
- Domain expertise matching (STEM, legal, medical, etc.)
- Historical performance scores
- Specialized training requirements

**Layer 2: During-Task (Embedded Controls)**
- Gold standard questions (pre-validated answers)
- Cross-validation (multiple workers on same task)
- Real-time anomaly detection (ML algorithms)
- Time-based patterns (too fast = suspicious)
- Consistency checks across related tasks

**Layer 3: Post-Task (Validation & Aggregation)**
- Consensus algorithms (not just majority vote)
- Expert review for complex/disputed cases
- Statistical quality metrics
- Worker performance updates
- Automated error correction where possible

**Layer 4: Continuous Improvement**
- ML models learn from validated data
- Worker feedback loops
- Quality trend analysis
- Automated retraining triggers

### Quality Infrastructure

```typescript
// Quality service with ML integration
class QualityService {
  // Real-time quality detection
  async detectAnomalies(completionId: string)
  
  // ML-powered worker scoring
  async updateWorkerQualityScore(workerId: string, taskData: any)
  
  // Consensus calculation (weighted by worker expertise)
  async calculateWeightedConsensus(taskId: string)
  
  // Flag suspicious patterns
  async flagSuspiciousActivity(workerId: string, patterns: any)
  
  // Route to expert review queue
  async routeToExpertReview(taskId: string, reason: string)
}
```

### Gold Standard vs Expert Validation

**Gold Standard Tasks:**
- Pre-validated "control" questions with known correct answers
- Embedded invisibly within regular tasks
- Used for real-time worker scoring
- Automated pass/fail thresholds

**Expert Validation:**
- Domain experts review ambiguous/complex cases
- Final arbiter for high-value tasks
- Training data for ML quality models
- Handles edge cases gold standards can't cover

**All quality logic must be backend services with ML model integration.**

---

## Task Distribution & Assignment

### Expert Matching Architecture

Unlike basic microtasking platforms, assignment is **intelligence-driven**, not just availability-based.

**Matching Factors:**
1. **Domain expertise** - STEM, legal, medical, creative writing, etc.
2. **Language proficiency** - Native speakers for translation/annotation
3. **Historical performance** - Quality scores on similar tasks
4. **Specialization** - Code review, image annotation, conversational AI, etc.
5. **Availability & capacity** - Current workload and schedule
6. **Task complexity tier** - Match difficulty to skill level

### Assignment Algorithm (Simplified)

```typescript
class TaskAssignmentService {
  async findOptimalWorker(taskId: string): Promise<Worker> {
    // Get task requirements
    const task = await this.getTask(taskId)
    const requirements = task.requirements // domain, language, difficulty
    
    // Filter qualified workers
    const qualified = await this.getQualifiedWorkers(requirements)
    
    // Score each worker (ML-powered)
    const scored = await this.scoreWorkers(qualified, task)
    
    // Apply business logic (fairness, load balancing)
    const selected = this.applyFairnessRules(scored)
    
    return selected
  }
  
  // ML model predicts worker success on this task type
  async scoreWorkers(workers: Worker[], task: Task) {
    return workers.map(worker => ({
      worker,
      score: this.mlModel.predictQuality(worker, task)
    }))
  }
}
```

### Distribution Principles

1. **Skills-first matching** - Never assign outside expertise area
2. **Load balancing** - Distribute work fairly across qualified workers
3. **Quality-weighted** - High-performing workers get priority on complex tasks
4. **Fairness constraints** - Prevent monopolization, ensure equitable access
5. **Availability tracking** - Only assign to active, available workers

### Assignment Logic Location

**Backend services ONLY.** Never let frontend decide task assignment. Assignment requires ML models, business logic, and real-time worker state.

---

## Data Flow Patterns

### Request → Response Flow

```
User Action (Frontend)
  ↓
API Request
  ↓
Route Handler (API Layer)
  ↓
Service Layer (Business Logic)
  ↓
Data Layer (Database/Cache)
  ↓
Response (JSON)
  ↓
Frontend State Update
  ↓
UI Re-render
```

**Never skip layers.** Components don't talk directly to database.

### Background Job Pattern

```
Trigger Event
  ↓
Queue Job (Redis/Bull)
  ↓
Worker Process
  ↓
Service Layer
  ↓
Data Layer
  ↓
Update Status/Notify
```

**For heavy operations:** Quality validation, batch processing, report generation, metric aggregation.

---

## API Design Principles

### RESTful Structure

```
GET    /api/projects              // List projects
GET    /api/projects/:id          // Get single project
POST   /api/projects              // Create project
PATCH  /api/projects/:id          // Update project
DELETE /api/projects/:id          // Delete project

GET    /api/projects/:id/tasks    // Get project tasks
POST   /api/tasks/:id/assign      // Assign task
POST   /api/tasks/:id/complete    // Complete task
GET    /api/tasks/:id/metrics     // Get task metrics
```

### Response Format

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Descriptive error message",
    details: { ... }
  }
}
```

### Pagination (Essential for Scale)

```typescript
GET /api/tasks?page=1&limit=50&sort=createdAt&order=desc

Response:
{
  data: [...],
  pagination: {
    page: 1,
    limit: 50,
    total: 10000,
    totalPages: 200
  }
}
```

**Always paginate lists.** Never return unbounded arrays.

---

## State Management

### Frontend State

**Use React state for:**
- UI state (modals, dropdowns, loading)
- Form inputs
- Temporary selections

**Use API cache (React Query/SWR) for:**
- Server data
- Metrics
- Lists

**DO NOT store computed metrics in frontend state.** Fetch from API.

### Backend State

**Database for:**
- Persistent data
- Source of truth

**Cache (Redis) for:**
- Frequently accessed data
- Computed metrics
- Session data
- Rate limiting

**Queue (Bull/Redis) for:**
- Background jobs
- Task processing
- Email notifications

---

## Database Design

### Core Tables

```
projects
  - id, name, description, status, created_at

tasks
  - id, project_id, content, type, status, created_at

workers
  - id, name, email, status, quality_score, created_at

task_assignments
  - id, task_id, worker_id, status, assigned_at, completed_at

task_completions
  - id, task_id, worker_id, answer, quality_score, submitted_at

gold_standard_tasks
  - id, task_id, correct_answer, used_for_validation
```

### Indexing Strategy

**Index these heavily queried fields:**
```sql
-- Tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Assignments
CREATE INDEX idx_assignments_worker_id ON task_assignments(worker_id);
CREATE INDEX idx_assignments_status ON task_assignments(status);

-- Completions
CREATE INDEX idx_completions_worker_id ON task_completions(worker_id);
CREATE INDEX idx_completions_submitted_at ON task_completions(submitted_at);
```

**Without proper indexes, the platform will collapse under volume.**

---

## TypeScript & Type Safety

### Strict Typing

```typescript
// ✅ GOOD - Explicit types
interface Project {
  id: string
  name: string
  status: 'draft' | 'active' | 'completed'
  totalQuestions: number
  completedQuestions: number
}

// ❌ BAD - Loose types
const project: any = { ... }
```

### Shared Types

```typescript
// types/project.ts
export interface Project { ... }
export interface Task { ... }
export interface Worker { ... }

// Use everywhere (frontend + backend)
import { Project } from '@/types/project'
```

**Types are documentation and safety nets.**

---

## Error Handling

### Backend

```typescript
try {
  // Operation
  const result = await service.processTask(taskId)
  return res.json({ success: true, data: result })
} catch (error) {
  logger.error('Task processing failed', { taskId, error })
  return res.status(500).json({
    success: false,
    error: {
      code: 'TASK_PROCESSING_ERROR',
      message: 'Failed to process task'
    }
  })
}
```

### Frontend

```typescript
try {
  const response = await api.tasks.complete(taskId, data)
  toast.success('Task completed successfully')
} catch (error) {
  console.error('Task completion failed', error)
  toast.error('Failed to complete task. Please try again.')
}
```

**Never fail silently. Always log errors.**

---

## Testing Strategy (Pragmatic)

### What to Test

**High Priority:**
- Quality validation logic
- Task assignment algorithms
- Metric calculations
- API endpoints (integration tests)

**Medium Priority:**
- Critical UI flows (E2E tests)
- Data transformations
- Utility functions

**Low Priority:**
- Simple CRUD operations
- UI components (if using Shadcn)

**Focus testing on business-critical, high-complexity areas.**

---

## Code Review Checklist

Before merging code:

**Architecture:**
- [ ] Code is in the correct location (follows structure)
- [ ] No duplicated logic (DRY principle)
- [ ] Calculations are centralized (not ad-hoc)
- [ ] Will scale to 100x volume

**Performance:**
- [ ] Database queries are indexed
- [ ] Lists are paginated
- [ ] Heavy operations are async/background jobs
- [ ] No N+1 query problems

**Quality:**
- [ ] TypeScript types are explicit
- [ ] Error handling is present
- [ ] Logging for debugging
- [ ] Comments explain "why", not "what"

**Testing:**
- [ ] Critical business logic is tested
- [ ] Edge cases are considered

---

## Anti-Patterns (Avoid These)

❌ Calculating metrics in UI components  
❌ Duplicating logic across files  
❌ Fetching unbounded lists (no pagination)  
❌ Using `any` types in TypeScript  
❌ Blocking operations in API routes  
❌ Missing database indexes on queried fields  
❌ Ad-hoc solutions instead of systematic architecture  
❌ Frontend making business logic decisions  

---

## Decision Framework

**When adding any feature, ask:**

1. **Does this already exist?** Check before building
2. **Where does this belong?** Follow the structure
3. **Will it scale?** Test with volume assumptions
4. **Is it centralized?** Avoid duplication
5. **Is it typed?** Use TypeScript properly
6. **Is it tested?** Cover critical paths

**If uncertain, stop and ask for architectural guidance.**

---

## Platform-Specific Patterns

### Worker Management

```typescript
// Service layer handles worker logic with ML integration
class WorkerService {
  async assignTask(workerId: string, taskId: string)
  async getWorkerMetrics(workerId: string)
  async updateQualityScore(workerId: string, taskData: any)
  async getAvailableWorkers(projectId: string, requirements: TaskRequirements)
  
  // ML-powered expertise tracking
  async updateExpertiseScores(workerId: string, taskType: string, performance: number)
  async predictWorkerSuccess(workerId: string, taskId: string): Promise<number>
}
```

### Quality Validation

```typescript
// Centralized quality service with ML models
class QualityService {
  async validateTaskCompletion(completionId: string)
  async calculateWeightedConsensus(taskId: string)
  async updateWorkerScore(workerId: string, taskData: any)
  async flagSuspiciousActivity(workerId: string, patterns: any)
  
  // ML-powered quality detection
  async detectAnomalies(completionId: string): Promise<AnomalyReport>
  async predictTaskQuality(taskId: string): Promise<QualityPrediction>
  async routeToExpertReview(taskId: string, confidence: number)
}
```

### Metrics Computation

```typescript
// Metrics service with caching and ML forecasting
class MetricsService {
  async getProjectMetrics(projectId: string)    // Cached 5 min
  async getWorkerMetrics(workerId: string)      // Cached 5 min
  async getSystemMetrics()                      // Cached 1 min
  async invalidateCache(key: string)
  
  // ML-powered predictions
  async forecastProjectCompletion(projectId: string): Promise<Date>
  async predictQualityTrend(projectId: string): Promise<QualityTrend>
  async optimizeWorkerAllocation(projectId: string): Promise<AllocationPlan>
}
```

---

## Final Principles

1. **Systematic over ad-hoc** - Everything has a defined place
2. **Centralized over duplicated** - Single source of truth
3. **Scalable over quick** - Think volume from day one
4. **Clean over clever** - Simple, maintainable code wins
5. **Typed over loose** - TypeScript strictness prevents bugs
6. **Tested over assumed** - Verify critical business logic

**Remember: This platform must handle massive scale. Every decision should optimize for volume, efficiency, and maintainability.**