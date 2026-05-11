import { AxiosError } from 'axios'

export type ApiError = {
  status?: number
  message: string
}

type ErrorResponse = {
  message?: string | string[]
  error?: string
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined
    const message = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message ?? data?.error ?? error.message

    return {
      status: error.response?.status,
      message: message || 'Something went wrong. Please try again.',
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: 'Something went wrong. Please try again.' }
}
