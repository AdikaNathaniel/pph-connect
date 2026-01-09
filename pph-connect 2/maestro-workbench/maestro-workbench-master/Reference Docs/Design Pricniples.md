# Design Principles

## Agent Application Guide

**Before implementing any feature:**
1. Identify if it needs a data-table (use flowchart)
2. Find closest example at ui.shadcn.com/examples
3. Install required Shadcn components
4. Copy structure from example
5. Customize data only (not structure/styling)
6. Run through Quality Checklist
7. Test all interactive states

**When stuck:**
- Check https://ui.shadcn.com/examples/dashboard and https://ui.shadcn.com/blocks#dashboard-01
- Reference this doc's "Anti-Patterns" section
- Verify component is installed: `npx shadcn-ui@latest add [name]`

**Token-efficient sections for quick reference:**
- Quick Start (always read first)
- Anti-Patterns (when unsure)
- Quality Checklist (before committing)
- Quick Reference (for commands)

---

**This is the design contract. All UI must comply.**

## Component Architecture

### Reusable Primitives
All UI should be built from these shadcn components (installed once, reused everywhere):

**Layout Components:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` - for stat cards, sections
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - for all data tables
- `Badge` - for status indicators (blue primary, gray secondary)

**Typography Scale:**
- Page titles: `text-3xl font-bold`
- Section titles: `text-2xl font-semibold`  
- Card titles: `text-sm font-medium text-muted-foreground`
- Card values: `text-2xl font-bold`
- Table headers: `text-xs font-medium text-muted-foreground uppercase`
- Body text: `text-sm`

**Color Tokens (never use raw colors):**
- Backgrounds: `bg-background`, `bg-card`
- Borders: `border-border`
- Text: `text-foreground`, `text-muted-foreground`
- Primary: `bg-primary`, `text-primary`

### Installation Process
When building new features:
1. Install needed shadcn components: `npx shadcn@latest add [component]`
2. Use the installed components - never rebuild from scratch
3. Customize only via Tailwind utility classes, never inline styles

### Example: Stat Card Pattern
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">
      Total Revenue
    </CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>


## Project Context

**Type:** Admin/Management Portal  
**Primary Use:** Managing high-volume work items, projects, and users  
**Key Feature:** Data tables (extensive list management)  
**Users:** Internal team + external workers (workbenches)  

**This context informs:** Why tables are critical and why we need robust, functional UI over flashy aesthetics.

---

## Quick Start for Agents

Before implementing ANY UI:
1. Read "Core Mandate" + "Zero Custom Code Policy"
2. Check if feature needs a data-table (probably yes - see flowchart)
3. Find matching example at https://ui.shadcn.com/examples
4. Copy structure, customize data only
5. Run through Quality Checklist before committing

**When uncertain:** Check https://ui.shadcn.com/examples/dashboard and https://ui.shadcn.com/blocks#dashboard-01

---

## Core Mandate

Build a **Shadcn-pure system**: cohesive, intentional, robust. Every element follows the design system—nothing feels "willy-nilly" or breakable.

**Visual References:**
- Dashboard: https://ui.shadcn.com/examples/dashboard and https://ui.shadcn.com/blocks#dashboard-01
- All Examples: https://ui.shadcn.com/examples
- Playground: https://ui.shadcn.com/examples/playground

---

## Theme Configuration

### Colors

**Primary: Blue theme** (all shades 50-950)  
**Source:** https://ui.shadcn.com/colors

**Setup in CSS:**
```css
:root {
  /* Blue shades 50-950 */
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  /* ... continue through all shades ... */
  --blue-900: #1e3a8a;  /* Default dark blue */
  --blue-950: #172554;
  
  /* Supporting colors */
  /* Slate - neutrals */
  /* Lime - success states */
  /* Orange - warnings */
}
```

**Usage:**
- Blue → Primary actions, links, focus states, brand elements
- Slate → Text, borders, backgrounds, neutral UI
- Lime → Success messages, completed states
- Orange → Warnings, alerts, important notices

### Typography

**Font: Geist**

**Install:**
```bash
npm install geist
```

**Configure (Next.js example):**
```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans'

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  )
}
```

**Exception:** Workbenches (worker-facing) may need multi-locale font supporting 32+ languages. Research Noto Sans or similar as fallback.

**Text Size Decision Tree:**

Use `text-sm` for:
- Table cells (always)
- Form labels
- Helper text, descriptions
- Timestamps/metadata
- Badge content

Use `text-base` for:
- Primary paragraph content
- Card descriptions
- Main body copy

Use `text-xl+` for:
- Page titles
- Section headers

**Weights:**
```
font-medium    → UI text, labels, buttons (default)
font-semibold  → Subheadings, emphasis
font-bold      → Section headers
```

**Colors:**
```
text-foreground           → Primary text
text-muted-foreground    → Secondary text (pair with text-sm)
```

---

## Zero Custom Code Policy

**CRITICAL RULES:**
1. Use ONLY Shadcn components
2. No custom CSS—Tailwind utilities only
3. No style overrides that break the system
4. Build with Shadcn blocks from examples
5. If Shadcn has it, use theirs (never rebuild)

### Anti-Patterns (Avoid These)

❌ **BAD - Custom Button:**
```tsx
<button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">
  Custom Button
</button>
```

✅ **GOOD - Shadcn Button:**
```tsx
import { Button } from "@/components/ui/button"
<Button>Shadcn Button</Button>
```

❌ **BAD - Custom Table:**
```tsx
<table className="w-full border">
  <thead>...</thead>
</table>
```

✅ **GOOD - Shadcn Data Table:**
```tsx
import { DataTable } from "@/components/ui/data-table"
<DataTable columns={columns} data={data} />
```

❌ **BAD - Custom Card:**
```tsx
<div className="border rounded-lg p-6 shadow-sm bg-white">
  <h3 className="font-bold">Title</h3>
  <p>Content</p>
</div>
```

✅ **GOOD - Shadcn Card:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

---

## Data Tables (HIGHEST PRIORITY)

**Why Critical:** This app manages high volumes of items. Tables are the PRIMARY interface pattern.

### Installation

```bash
npx shadcn-ui@latest add data-table
```

**Also install dependencies:**
```bash
npm install @tanstack/react-table
```

### File Structure

```
components/
  ui/
    data-table.tsx        // Base Shadcn component (don't modify)
  tables/
    project-table.tsx     // Custom table implementations
    user-table.tsx
    workbench-table.tsx
```

### Requirements

**Every data table must have:**
- ✅ Sortable columns (always)
- ✅ Row selection (checkboxes)
- ✅ Column visibility toggle ("Customize columns")
- ✅ Pagination
- ✅ Actions menu (dropdown)
- ✅ `text-sm` styling
- ✅ Proper alignment (numbers right, text left)

**Sometimes needed:**
- Manual row reordering (drag handles)
- Filtering
- Search

### When to Use Tables (Decision Flowchart)

```
Is this data structured (rows/columns)?
  → YES: Use data-table
  → NO: Continue...

Does it have 3+ attributes per item?
  → YES: Use data-table
  → NO: Continue...

Will users need to sort/filter/manage items?
  → YES: Use data-table
  → NO: Consider Card or List

DEFAULT ANSWER: Use data-table
```

### Reference Implementation

**Always check:** https://ui.shadcn.com/docs/components/data-table  
**Example:** Dashboard table at https://ui.shadcn.com/examples/dashboard and https://ui.shadcn.com/blocks#dashboard-01 

**Basic structure:**
```tsx
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"

export function ProjectTable({ data }) {
  return <DataTable columns={columns} data={data} />
}
```

---

## File Organization

```
components/
  ui/              // Shadcn components (NEVER modify these)
  tables/          // Custom data-table implementations
  forms/           // Form compositions
  layouts/         // Page layouts
  blocks/          // Composed Shadcn blocks

app/
  dashboard/       // Dashboard pages
  workbenches/     // Worker-facing pages
```

**Golden Rule:** Never modify `components/ui/` - compose new components in other folders.

---

## Layout & Spacing

### Responsive Breakpoints

```
Desktop: 1568px  (wider than standard 1200px)
Mobile:  Tailwind defaults (sm: 640px, md: 768px)
```

### Spacing System

**Always use system values:**
```
gap-2, gap-4, gap-6, gap-8     // Between elements
p-4, p-6, p-8                  // Padding  
m-4, m-6, m-8                  // Margin
```

❌ **NEVER:** `gap-[13px]` or arbitrary values  
✅ **ALWAYS:** System multiples (2, 4, 6, 8, 12, 16)

---

## Animations

**Default: None**

When needed:
- Very quick fades only (150-200ms)
- No movement (slides, bounces, etc.)
- Goal: Seamless blends

```tsx
transition-opacity duration-150  // Quick fade
```

---

## Icons

**Library: Lucide React**

```bash
npm install lucide-react
```

**Usage:**
```tsx
import { Icon } from "lucide-react"

<Icon className="h-4 w-4" />  // Small (buttons, inline)
<Icon className="h-5 w-5" />  // Default
<Icon className="h-6 w-6" />  // Large (headings)

// With color
<Icon className="h-4 w-4 text-muted-foreground" />
```

**Placement:**
```tsx
<Button>
  <Icon className="mr-2 h-4 w-4" />  // Left of text, gap-2
  Button Text
</Button>
```

---

## Component Patterns

### Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Form Field
```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Button with Loading State
```tsx
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

---

## Accessibility (Non-Negotiable)

- ✅ Proper contrast (Shadcn defaults ensure this)
- ✅ Keyboard navigation
- ✅ Visible focus indicators
- ✅ ARIA labels on interactive elements
- ✅ Semantic HTML

**Shadcn components are accessible by default—preserve this.**

---

## Implementation Priority Order

1. **First:** Theme setup (colors, Geist font)
2. **Second:** Data tables (most critical component)
3. **Third:** Forms and inputs
4. **Fourth:** Cards and layout components
5. **Last:** Animations and polish

---

## Quality Checklist

Before marking component "done":

- [ ] Uses Shadcn component (no custom alternatives)
- [ ] Tailwind utilities only (no custom CSS)
- [ ] System spacing (gap-4, p-6, etc.)
- [ ] All interactive states work (hover, focus, disabled)
- [ ] Keyboard accessible
- [ ] Matches visual reference examples
- [ ] `text-sm` applied where appropriate
- [ ] Blue theme colors applied
- [ ] Geist font applied
- [ ] Feels robust and intentional

**For Data Tables specifically:**
- [ ] Sortable columns implemented
- [ ] Column visibility toggle works
- [ ] Pagination functional
- [ ] Actions menu present
- [ ] Proper text alignment
- [ ] Legible and functional

---

## Common Mistakes

❌ Creating custom components instead of using Shadcn  
❌ Using arbitrary spacing values  
❌ Adding style overrides that break the system  
❌ Missing interactive states (hover, focus)  
❌ Skipping accessibility features  
❌ Using simple lists when data-table is appropriate  
❌ Modifying files in `components/ui/`  

---

## Quick Reference

**Install Shadcn component:**
```bash
npx shadcn-ui@latest add [component-name]
```

**Common components:**
- button, input, label, textarea
- card, table, data-table
- form, select, checkbox, radio-group
- dialog, dropdown-menu, popover
- badge, avatar, separator

**Default sizes:**
```
Buttons:  Shadcn default (don't customize)
Text:     text-sm for UI elements
Icons:    h-4 w-4 (small), h-5 w-5 (default)
Spacing:  Multiples of 4 (gap-4, p-6, etc.)
```

---

## Special Considerations

### Multi-locale Support (Workbenches)

Worker-facing interfaces need fonts supporting 32+ languages.

**Solution:**
```tsx
// Fallback font for workbenches
import { Noto_Sans } from 'next/font/google'

const notoSans = Noto_Sans({ 
  subsets: ['latin', 'cyrillic', 'arabic', 'devanagari'],
  weight: ['400', '500', '600', '700']
})

// Apply to workbench routes only
```

### Data Table Mastery

Tables are first-class citizens in this app.

**Investment areas:**
1. Proper column configuration
2. Sorting/filtering functionality  
3. Row selection logic
4. Action menus
5. Responsive behavior
6. Performance with large datasets

**Reference heavily:** https://ui.shadcn.com/examples/dashboard and https://ui.shadcn.com/blocks#dashboard-01#dashboard-01 table implementation

**Toast Notifications**
All notifications must be served as ShadCn Sonner (https://ui.shadcn.com/docs/components/sonner) as top center. Depending on the type of toast, apply the correct type as per https://sonner.emilkowal.ski Please utilize the "Rich Colors" where approriate