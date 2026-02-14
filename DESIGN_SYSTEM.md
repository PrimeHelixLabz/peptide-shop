# Design System Documentation

This document outlines the design system and reusable components for the Elysian Peptides e-commerce platform.

## Design Tokens

All colors, spacing, shadows, and other design values are centralized in design tokens to ensure consistency and easy theming.

### Colors

Colors are defined as CSS variables in `app/globals.css` and can be accessed via Tailwind classes:

- **Brand Colors**: `brand-primary`, `brand-secondary` (replaces hard-coded emerald-500/green-600)
- **Status Colors**: `success`, `warning`, `error`, `info`
- **Semantic Colors**: `primary`, `secondary`, `muted`, `accent`, `destructive`

**Usage:**
```tsx
// ❌ Don't use hard-coded colors
className="bg-emerald-500 text-green-600"

// ✅ Use design tokens
className="bg-brand-primary text-brand-primary-foreground"
```

### Shadows

Standardized shadow values:
- `shadow-sm`: Small shadow
- `shadow-default`: Default card shadow
- `shadow-md`: Medium shadow
- `shadow-lg`: Large shadow
- `shadow-dark`: Dark mode shadow

## Reusable Components

### Button

Located in `components/ui/button.tsx`

**Variants:**
- `default`: Primary brand gradient button
- `destructive`: Red/destructive actions
- `outline`: Secondary button with border
- `secondary`: Muted background
- `ghost`: Transparent hover state
- `link`: Text link style

**Sizes:**
- `default`: Standard size
- `sm`: Small
- `lg`: Large
- `icon`: Square icon button

**Example:**
```tsx
import { Button } from "@/components/ui/button"

<Button variant="default" size="lg">
  Save Product
</Button>
```

### AdminCard

Located in `components/common/admin-card.tsx`

Reusable card component for admin pages with consistent styling.

**Props:**
- `title?: string` - Card header title
- `headerActions?: ReactNode` - Actions in header
- `footer?: ReactNode` - Footer content

**Example:**
```tsx
import { AdminCard } from "@/components/common/admin-card"

<AdminCard title="Product Details">
  {/* Content */}
</AdminCard>
```

### StatusBadge

Located in `components/common/status-badge.tsx`

Reusable badge for status indicators.

**Variants:**
- `success`: Green/brand gradient
- `warning`: Amber/yellow
- `error`: Red/destructive
- `neutral`: Gray/muted
- `info`: Blue

**Example:**
```tsx
import { StatusBadge } from "@/components/common/status-badge"

<StatusBadge variant="success">Active</StatusBadge>
```

### Form Components

Located in `components/common/`

- **FormInput**: Text, number, email inputs with label and error handling
- **FormTextarea**: Textarea with label and error handling
- **FormSelect**: Select dropdown with label and error handling

**Example:**
```tsx
import { FormInput, FormTextarea, FormSelect } from "@/components/common"

<FormInput
  label="Product Name"
  placeholder="Enter product name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
/>

<FormSelect
  label="Category"
  value={categoryId}
  onChange={(e) => setCategoryId(e.target.value)}
  options={[
    { value: "", label: "Select..." },
    { value: "1", label: "Category 1" }
  ]}
/>
```

## Migration Guide

### Replacing Hard-coded Colors

**Before:**
```tsx
className="bg-gradient-to-r from-emerald-500 to-green-600 text-white"
```

**After:**
```tsx
className="bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-primary-foreground"
// Or use Button component
<Button variant="default">Click me</Button>
```

### Replacing Card Structures

**Before:**
```tsx
<div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
  <div className="border-b border-border/50 px-6 py-5">
    <h2>Title</h2>
  </div>
  <div className="p-6">Content</div>
</div>
```

**After:**
```tsx
<AdminCard title="Title">
  Content
</AdminCard>
```

### Replacing Status Badges

**Before:**
```tsx
<span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl px-3 py-1">
  Active
</span>
```

**After:**
```tsx
<StatusBadge variant="success">Active</StatusBadge>
```

## Best Practices

1. **Always use design tokens** - Never hard-code colors, shadows, or spacing
2. **Use reusable components** - Prefer `Button`, `AdminCard`, `StatusBadge`, etc. over custom implementations
3. **Consistent styling** - Use the same components for similar UI patterns
4. **Accessibility** - All components include proper ARIA labels and keyboard navigation
5. **Type safety** - All components are fully typed with TypeScript

## File Structure

```
components/
  ├── ui/              # Base UI components (shadcn/ui)
  ├── common/          # Reusable application components
  │   ├── admin-card.tsx
  │   ├── status-badge.tsx
  │   ├── form-input.tsx
  │   ├── form-textarea.tsx
  │   ├── form-select.tsx
  │   └── index.ts
  └── admin/           # Admin-specific components

lib/
  └── design-tokens.ts  # Design token definitions
```
