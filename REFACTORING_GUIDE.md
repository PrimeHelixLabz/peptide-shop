# Codebase Refactoring Guide

This guide documents the refactoring progress and provides patterns for completing the migration to a design system.

## ✅ Completed

### 1. Design System Foundation
- ✅ Added brand colors to CSS variables (`--brand-primary`, `--brand-secondary`)
- ✅ Added status colors (`--warning`, `--info`)
- ✅ Updated Tailwind config to support design tokens
- ✅ Created `lib/design-tokens.ts` with centralized design values

### 2. Reusable Components Created
- ✅ **Button** (`components/ui/button.tsx`) - Updated to use brand colors
- ✅ **AdminCard** (`components/common/admin-card.tsx`) - Reusable card component
- ✅ **StatusBadge** (`components/common/status-badge.tsx`) - Status indicators
- ✅ **FormInput** (`components/common/form-input.tsx`) - Form inputs with labels
- ✅ **FormTextarea** (`components/common/form-textarea.tsx`) - Form textareas
- ✅ **FormSelect** (`components/common/form-select.tsx`) - Form selects

### 3. Components Refactored
- ✅ `components/admin/admin-products-table.tsx` - Uses Button, StatusBadge
- ✅ `components/admin/admin-orders-table.tsx` - Uses StatusBadge
- ✅ `components/admin/date-range-picker.tsx` - Uses brand colors
- ✅ `components/admin/admin-product-form.tsx` - Uses AdminCard, FormInput, FormTextarea, FormSelect, Button

## 🔄 Remaining Work

### Color Replacements Needed

**Pattern to replace:**
```tsx
// ❌ Hard-coded colors
className="bg-white dark:bg-gray-900"
className="bg-gray-100 dark:bg-gray-800"
className="hover:bg-gray-50 dark:hover:bg-gray-800"
className="border-gray-300 dark:border-gray-700"
className="text-gray-700 dark:text-gray-300"
className="focus:ring-blue-500/20"

// ✅ Use design tokens
className="bg-background"
className="bg-muted"
className="hover:bg-accent"
className="border-border"
className="text-muted-foreground"
className="focus:ring-brand-primary/20"
```

### Files Still Needing Refactoring

1. **`components/admin/admin-orders-table.tsx`**
   - Replace `bg-white dark:bg-gray-900` → `bg-background`
   - Replace `hover:bg-gray-50 dark:hover:bg-gray-800/50` → `hover:bg-accent`
   - Replace `focus:ring-blue-500/20` → `focus:ring-brand-primary/20`

2. **`components/admin/admin-products-table.tsx`**
   - Replace `bg-white dark:bg-gray-900` → `bg-background`
   - Replace `focus:ring-blue-500/20` → `focus:ring-brand-primary/20`

3. **`components/admin/date-range-picker.tsx`**
   - Replace `bg-white dark:bg-gray-900` → `bg-background`

4. **Other admin components** - Apply same patterns

### Component Extraction Opportunities

Look for repeated patterns that could become reusable components:

1. **Search Input** - Many places have search inputs with icons
2. **Filter Dropdown** - Repeated filter select patterns
3. **Table Row** - Standardized table row styling
4. **Action Buttons** - Icon buttons with consistent styling

## Migration Checklist

For each component/file:

- [ ] Replace hard-coded colors with design tokens
- [ ] Replace custom card structures with `AdminCard`
- [ ] Replace custom buttons with `Button` component
- [ ] Replace status badges with `StatusBadge`
- [ ] Replace form inputs with `FormInput`, `FormTextarea`, `FormSelect`
- [ ] Remove duplicate styling code
- [ ] Test component still works correctly
- [ ] Check for accessibility (ARIA labels, keyboard navigation)

## Quick Reference

### Color Mapping

| Old | New |
|-----|-----|
| `blue-500` / `blue-600` | `brand-primary` / `brand-secondary` |
| `bg-white dark:bg-gray-900` | `bg-background` |
| `bg-gray-100 dark:bg-gray-800` | `bg-muted` |
| `bg-gray-50 dark:bg-gray-800` | `bg-accent` |
| `text-gray-700 dark:text-gray-300` | `text-muted-foreground` |
| `border-gray-300 dark:border-gray-700` | `border-border` |
| `hover:bg-gray-100 dark:hover:bg-gray-800` | `hover:bg-accent` |

### Component Usage

```tsx
// Button
<Button variant="default" size="lg">Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>

// Card
<AdminCard title="Section Title">
  Content here
</AdminCard>

// Status Badge
<StatusBadge variant="success">Active</StatusBadge>
<StatusBadge variant="warning">Pending</StatusBadge>

// Form Inputs
<FormInput label="Name" value={name} onChange={...} />
<FormTextarea label="Description" value={desc} onChange={...} />
<FormSelect label="Category" options={...} value={cat} onChange={...} />
```

## Benefits

✅ **Consistency** - All components use the same design tokens
✅ **Maintainability** - Change colors in one place (CSS variables)
✅ **Scalability** - Easy to add new components following patterns
✅ **Type Safety** - All components are fully typed
✅ **Accessibility** - Built-in ARIA support
✅ **Theme Support** - Easy to switch themes by changing CSS variables
