export type AppRole = 'admin' | 'user';

export function normalizeRole(role: unknown): AppRole {
  return typeof role === 'string' && role.trim().toLowerCase() === 'admin'
    ? 'admin'
    : 'user';
}
