// Shared helper for building storage paths for the `works-files` bucket.
// The RLS policy on this bucket REQUIRES the first path segment to be the
// authenticated user's UUID (auth.uid()::text). Any upload constructed
// outside this helper is a bug waiting to happen — always route uploads
// through here.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sanitize a filename: strip diacritics and replace any character that isn't
 * `[a-zA-Z0-9._-]` with `_`. Also collapses leading dots/underscores so the
 * final name never starts with `.` (hidden files) or leaves a trailing `_`.
 */
export function sanitizeWorksFilename(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^[._]+/, '')
    .replace(/_+/g, '_');
  return cleaned || 'file';
}

/**
 * Build a storage path for the works-files bucket. Guarantees the first
 * segment is exactly the given userId (RLS invariant). Throws a clear error
 * if `userId` is missing or malformed, instead of letting the upload fail
 * later with an opaque "row-level security policy" message.
 */
export function buildWorksFilePath(userId: string | undefined | null, filename: string): string {
  if (!userId || !UUID_RE.test(userId)) {
    throw new Error(
      `[works-files] refusing to build storage path without a valid user UUID (received: ${JSON.stringify(userId)}). ` +
      `This would violate the works-files RLS policy.`
    );
  }
  const safe = sanitizeWorksFilename(filename);
  return `${userId}/${Date.now()}_${safe}`;
}

/**
 * Guard: assert a path is scoped to the given user. Use right before any
 * .upload() call to fail fast rather than let RLS reject the upload with
 * a generic error.
 */
export function assertWorksPathBelongsToUser(path: string, userId: string): void {
  if (!path.startsWith(`${userId}/`)) {
    throw new Error(
      `[works-files] path "${path}" is not scoped to user ${userId}. RLS would reject this upload.`
    );
  }
}
