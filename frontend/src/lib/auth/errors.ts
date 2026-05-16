type SupabaseAuthLikeError = {
  message?: string
  status?: number
  code?: string
}

export function normalizeSupabaseAuthError(error: SupabaseAuthLikeError) {
  const message = error.message?.toLowerCase() ?? ''
  const code = error.code?.toLowerCase() ?? ''

  if (
    error.status === 429 ||
    code.includes('rate') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return new Error('Too many sign-in attempts. Try signing in again after 5 minutes.')
  }

  return new Error(error.message || 'Unable to sign in. Please try again.')
}
