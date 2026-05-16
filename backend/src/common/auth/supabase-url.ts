export function normalizeSupabaseUrl(value: string): string {
  return value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}
