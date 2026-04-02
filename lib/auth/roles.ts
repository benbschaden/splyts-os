export type OrgRole = 'owner' | 'admin' | 'member'

export function isAtLeastAdmin(role: string): boolean {
  return role === 'admin' || role === 'owner'
}

export function isOwner(role: string): boolean {
  return role === 'owner'
}
