/**
 * Pure code-normalization helpers. Extracted from lib/discounts/db.ts so
 * client components (admin form, cart input) can import without pulling
 * the server-only Supabase admin client into the client bundle.
 */

/** Normalize user input. Trim, upper-case, drop control/space chars. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^\w-]/g, "")
}
