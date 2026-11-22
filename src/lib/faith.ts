/**
 * Whether a member is a Bahá'í or a non-Bahá'í visitor. Every member can see
 * it on profiles, and Browse can filter by it.
 *
 * Stored in profiles.faith as 'bahai' | 'non_bahai'. Members who joined before
 * this existed have null until they edit their profile: they show no badge and
 * only appear when the faith filter is "Everyone".
 */
export type Faith = 'bahai' | 'non_bahai';
export type FaithFilter = 'all' | Faith;

export const FAITH_LABELS: Record<Faith, string> = {
  bahai: "Bahá'í",
  non_bahai: "Non-Bahá'í visitor",
};

export function isFaith(value: unknown): value is Faith {
  return value === 'bahai' || value === 'non_bahai';
}

export function faithLabel(value: unknown): string | null {
  return isFaith(value) ? FAITH_LABELS[value] : null;
}

export function matchesFaithFilter(faith: unknown, filter: FaithFilter): boolean {
  return filter === 'all' || faith === filter;
}

/**
 * True when a PostgREST error says profiles has no `faith` column, i.e. the
 * website deployed before the database migration ran. Callers retry the save
 * without `faith` so profile saves (and sign-ups) keep working meanwhile.
 */
export function isMissingFaithColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    (code === 'PGRST204' || code === '42703') &&
    typeof message === 'string' &&
    message.includes('faith')
  );
}
