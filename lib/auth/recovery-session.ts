/**
 * Detects a password-recovery session from the Supabase access token JWT.
 * Used after server-side `exchangeCodeForSession` so dashboard-sent recovery
 * emails still route to update-password without requiring `?next=recovery`.
 *
 * @see https://supabase.com/docs/guides/auth/jwt-fields
 */
export function accessTokenIndicatesPasswordRecovery(accessToken: string): boolean {
  try {
    const parts = accessToken.split('.')
    if (parts.length !== 3) return false
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8')
    const payload = JSON.parse(payloadJson) as { amr?: unknown }
    const amr = payload.amr
    if (!Array.isArray(amr)) return false
    return amr.some((entry) => {
      if (entry === 'recovery') return true
      if (typeof entry === 'object' && entry !== null && 'method' in entry) {
        return (entry as { method: string }).method === 'recovery'
      }
      return false
    })
  } catch {
    return false
  }
}
