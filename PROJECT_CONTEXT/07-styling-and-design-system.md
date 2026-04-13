# Styling and Design System

## CSS Framework

**Tailwind CSS 3.4.16** with the following configuration:

### Tailwind Config (`tailwind.config.ts`)

```typescript
{
  darkMode: ['class'],  // Class-based dark mode (not actively used)
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        // CSS variable-based colors (see globals.css)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        // ... etc
      }
    }
  },
  plugins: [tailwindcssAnimate]
}
```

---

## Design Tokens (CSS Variables)

Located in `app/globals.css`:

### Color Palette (HSL)

| Token | Default Value | Usage |
|-------|---------------|-------|
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `20 14.3% 4.1%` | Primary text |
| `--primary` | `21 95% 55%` | Amber-700 - Brand primary |
| `--primary-foreground` | `60 9.1% 97.8%` | Text on primary |
| `--secondary` | `60 4.8% 95.9%` | Secondary backgrounds |
| `--muted` | `60 4.8% 95.9%` | Muted backgrounds |
| `--muted-foreground` | `25 5.3% 44.7%` | Secondary text |
| `--accent` | `60 4.8% 95.9%` | Accent backgrounds |
| `--destructive` | `0 84.2% 60.2%` | Error/danger |
| `--border` | `20 5.9% 90%` | Borders |
| `--input` | `20 5.9% 90%` | Input borders |
| `--ring` | `21 95% 55%` | Focus rings |
| `--radius` | `0.5rem` | Base border radius |

### Chart Colors (Data Visualization)
- `--chart-1` through `--chart-5` - Data visualization palette

---

## Brand Colors

### Primary Brand: Amber

```css
/* Primary brand gradient */
from-amber-700 to-amber-900

/* Lighter variants */
from-amber-50 to-amber-100  /* Hover states, highlights */
bg-amber-50, border-amber-200  /* Cards, alerts */
```

### Secondary: Stone/Warm Gray

```css
/* Backgrounds */
bg-stone-50, bg-stone-100
from-stone-50 to-white
from-stone-50 via-white to-stone-50/20

/* Text */
text-stone-900  /* Headings */
text-stone-600, text-stone-500  /* Body text */
text-stone-700  /* Labels */

/* Borders */
border-stone-200, border-stone-300
```

### Semantic Colors

| Purpose | Color Classes |
|---------|---------------|
| Success | `text-emerald-500`, `bg-emerald-50`, `border-emerald-200` |
| Warning | `text-amber-700`, `bg-amber-50`, `border-amber-200` |
| Error | `text-red-700`, `bg-red-50`, `border-red-200`, `text-red-500` |
| Info | `text-blue-600` (rarely used) |

---

## Custom Utilities

### FDS Gradient Utilities (`app/globals.css`)

```css
/* Brand gradients */
.fds-gradient-warm {
  @apply bg-gradient-to-r from-stone-600 to-amber-900;
}

.fds-gradient-amber {
  @apply bg-gradient-to-r from-amber-700 to-amber-900;
}

.fds-gradient-subtle {
  @apply bg-gradient-to-b from-stone-50/30 to-white;
}

/* Touch targets (mobile accessibility) */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## Typography

### Font Family

**Primary**: Inter (via @fontsource/inter)
```typescript
// app/layout.tsx
import "@fontsource/inter/latin.css";
```

Applied via: `font-sans` (Tailwind default with Inter override)

### Type Scale (Observed Patterns)

| Usage | Class | Size |
|-------|-------|------|
| Page Title | `text-xl font-semibold` | 20px |
| Section Title | `text-lg font-bold` | 18px |
| Card Title | `text-base font-semibold` | 16px |
| Body | `text-sm` | 14px |
| Small/Caption | `text-xs` | 12px |

### Font Weights
- `font-bold` - Headlines, CTAs
- `font-semibold` - Subheadings, labels
- `font-medium` - Emphasis
- `font-normal` - Body text

---

## Spacing and Layout

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-full` | 9999px | Pills, avatars |
| `rounded-2xl` | 1rem (16px) | Cards, major containers |
| `rounded-xl` | 0.75rem (12px) | Buttons, inputs, cards |
| `rounded-lg` | 0.5rem (8px) | Small elements |

### Spacing Patterns

**Container Padding:**
- Mobile: `px-4` (16px)
- Desktop: `lg:px-6` (24px)

**Section Spacing:**
- Small: `gap-2`, `space-y-2` (8px)
- Medium: `gap-4`, `space-y-4` (16px)
- Large: `gap-6`, `space-y-6` (24px)

**Card Padding:**
- Compact: `p-4` (16px)
- Default: `p-6` (24px)

---

## Component Styling Patterns

### Button Patterns

**Primary CTA:**
```tsx
className="bg-gradient-to-r from-amber-700 to-amber-900 text-white 
           rounded-xl px-4 py-2 font-semibold shadow-md 
           hover:from-amber-800 hover:to-amber-950 
           active:scale-95 transition"
```

**Secondary/Outline:**
```tsx
className="border border-stone-200 bg-white text-stone-700 
           rounded-xl px-3 py-2 hover:bg-stone-50"
```

### Card Patterns

**Standard Card:**
```tsx
className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
```

**Highlighted Card (Stats):**
```tsx
className="rounded-2xl border border-amber-200 bg-gradient-to-br 
           from-amber-50 to-white p-4 shadow-sm"
```

### Input Patterns

**Text Input:**
```tsx
className="w-full rounded-xl border border-stone-200 bg-white 
           px-4 py-2 text-stone-900 
           focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
```

### Status Badge Patterns

| Status | Classes |
|--------|---------|
| In Stock | `bg-emerald-100 text-emerald-800 border-emerald-200` |
| Low Stock | `bg-amber-100 text-amber-800 border-amber-200` |
| Out of Stock | `bg-red-100 text-red-800 border-red-200` |

---

## Responsive Breakpoints

Standard Tailwind breakpoints used:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | < 640px | Mobile-first base styles |
| `sm:` | ≥ 640px | Small tablets |
| `md:` | ≥ 768px | Tablets |
| `lg:` | ≥ 1024px | Desktop |
| `xl:` | ≥ 1280px | Large desktop |

### Common Responsive Patterns

**Grid Columns:**
```tsx
className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
```

**Show/Hide:**
```tsx
className="hidden lg:block"     // Desktop only
className="lg:hidden"           // Mobile only
```

**Responsive Padding:**
```tsx
className="px-4 sm:px-6 lg:px-8"
```

---

## Mobile-First Design

### Touch Targets
- Minimum: 44x44px (`touch-target` utility)
- Buttons: `h-12`, `h-14` for primary CTAs

### Mobile Optimizations
1. **Bottom Sheet Cart**: Mobile uses modal instead of sidebar
2. **Sticky Headers**: `sticky top-0` for navigation
3. **Pull to Refresh**: Custom implementation in Storefront
4. **Full-Width Sections**: No side padding on mobile headers

---

## Icon System

**Library**: Lucide React (`lucide-react`)

**Common Icons and Usage:**

| Icon | Import | Usage |
|------|--------|-------|
| Shopping Cart | `ShoppingCart` | Cart, checkout |
| Package | `Package` | Products, inventory |
| Check Circle | `CheckCircle`, `CheckCircle2` | Success states |
| Alert | `AlertCircle` | Errors |
| Menu | `Menu` | Mobile navigation |
| X | `X` | Close buttons |
| Chevron | `ChevronRight` | Navigation |
| Settings | `Settings` | Admin |
| Printer | `Printer` | Printing service |
| Map Pin | `MapPin` | Location |
| User | `User` | Customer info |
| Credit Card | `CreditCard` | Payment |

**Icon Sizing:**
- Default: `h-5 w-5` (20px)
- Small: `h-4 w-4` (16px)
- Large: `h-6 w-6` (24px)

---

## Animation

### Tailwind Animate Plugin
Provides utilities like:
- `animate-pulse` - Loading states
- `animate-spin` - Loading spinners
- `animate-bounce` - Attention

### Custom Animations

**Shimmer Loading Effect** (in Storefront):
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite linear;
}
```

**Slide Animations** (via Tailwind):
- `animate-in slide-in-from-bottom` - Mobile cart modal
- `animate-in slide-in-from-right` - Mobile menu
- `animate-in slide-in-from-top-5` - Toast notifications

---

## Design Consistency Notes

### Strengths
1. Consistent color palette (amber + stone)
2. Uniform border radius (xl/2xl for cards)
3. Consistent shadow usage (`shadow-sm`, `shadow-lg`)
4. Mobile-first approach throughout

### Potential Issues
1. **Inline Styles**: Some components use inline styles for dynamic values
2. **CSS-in-JSX**: `<style jsx global>` used in Storefront for animations
3. **Gradient Repetition**: Same gradients repeated across files

### UI Consistency Checklist for New Components

- [ ] Use `rounded-xl` or `rounded-2xl` for containers
- [ ] Use `border-stone-200` for borders
- [ ] Primary actions: `from-amber-700 to-amber-900` gradient
- [ ] Text hierarchy: `text-stone-900` > `text-stone-600` > `text-stone-500`
- [ ] Spacing: `p-4` or `p-6` for cards
- [ ] Mobile: Test at 320px width minimum
