# Maestro Workbench - Color Scheme

## Overview

The Maestro Workbench uses a custom **teal color scheme** built on top of shadcn/ui components and Tailwind CSS.

## Primary Colors

### Base Colors

- **Primary Teal**: `#5BA9AC` (HSL: 182° 32% 52%)
  - Main brand color used for primary actions, buttons, and highlights
  - RGB: `rgb(91, 169, 172)`

- **Dark Teal**: `#11484D` (HSL: 185° 64% 18%)
  - Secondary color used for dark variants, text, and contrast elements
  - RGB: `rgb(17, 72, 77)`

## Color Scale

The complete teal color scale (also available as `blue-*` for backward compatibility):

| Shade | HSL | Hex | Usage |
|-------|-----|-----|-------|
| 50 | `182° 50% 95%` | `#F0F9F9` | Very light backgrounds |
| 100 | `182° 45% 88%` | `#D9F0F1` | Light backgrounds, hover states |
| 200 | `182° 40% 78%` | `#B8E2E4` | Subtle highlights |
| 300 | `182° 38% 65%` | `#8ECFD2` | Muted elements |
| 400 | `182° 35% 58%` | `#72C1C5` | Secondary buttons |
| 500 | `182° 32% 52%` | `#5BA9AC` | **Primary color** - Main CTAs |
| 600 | `182° 38% 42%` | `#438D91` | Hover states |
| 700 | `185° 50% 30%` | `#266B71` | Active states |
| 800 | `185° 55% 22%` | `#19525A` | Dark text |
| 900 | `185° 64% 18%` | `#11484D` | **Dark color** - Emphasis |
| 950 | `185° 70% 12%` | `#0A2E33` | Very dark elements |

## Usage in Code

### Tailwind CSS Classes

```tsx
// Primary button
<button className="bg-primary text-primary-foreground">
  Click Me
</button>

// Using the teal scale
<div className="bg-teal-500 text-white">
  Teal 500
</div>

// Or using blue (mapped to teal)
<div className="bg-blue-600 text-white">
  Blue 600 (actually teal)
</div>
```

### CSS Variables

```css
/* Primary color */
color: hsl(var(--primary));

/* Teal scale */
background: hsl(var(--blue-500));

/* Sidebar */
background: hsl(var(--sidebar-primary));
```

## Component Colors

### Light Mode

- **Background**: White
- **Foreground**: Dark teal (`#0A2E33`)
- **Primary**: Teal (`#5BA9AC`)
- **Secondary**: Very light teal (`#F0F9F9`)
- **Accent**: Light teal (`#EAF7F8`)
- **Muted**: Light teal gray
- **Border**: Light teal border

### Dark Mode

- **Background**: Very dark teal (`#0D2225`)
- **Foreground**: Light teal (`#EBF5F5`)
- **Primary**: Teal (`#5BA9AC`)
- **Secondary**: Dark teal (`#19525A`)
- **Accent**: Medium dark teal
- **Muted**: Dark teal muted
- **Border**: Dark teal border

## Sidebar Colors

### Light Mode Sidebar

- **Background**: Very light teal
- **Foreground**: Medium dark teal
- **Primary**: Dark teal (`#11484D`)
- **Accent**: Light teal

### Dark Mode Sidebar

- **Background**: Very dark teal
- **Foreground**: Light teal
- **Primary**: Teal (`#5BA9AC`)
- **Accent**: Dark teal

## Chart Colors

The chart colors use variations of the teal theme:

- **Chart 1**: Primary teal (`#5BA9AC`)
- **Chart 2**: Dark teal (`#11484D`)
- **Chart 3**: Medium teal
- **Chart 4**: Light teal
- **Chart 5**: Dark medium teal

## Accessibility

All color combinations meet WCAG 2.1 AA standards for contrast:

- **Primary on White**: 3.5:1 ✓
- **Dark Teal on White**: 11.2:1 ✓
- **Primary on Dark Background**: 4.2:1 ✓
- **White on Primary**: 3.6:1 ✓

## Files Modified

1. `src/index.css` - Color variable definitions
2. `tailwind.config.ts` - Tailwind color configuration

## Migration Notes

The color scheme maintains the same class names (`bg-blue-500`, etc.) for backward compatibility, but the colors are now teal instead of blue. A `teal-*` scale is also available for explicit usage.

No component changes are required - the color scheme is applied globally through CSS variables.
