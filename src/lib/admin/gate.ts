export const ADMIN_COOKIE = 'dp_admin';

export function isValidAdminKey(
  provided: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !provided) return false;
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}
