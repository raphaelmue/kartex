// API fetch wrapper with silent token refresh and concurrent request queueing

const SKIP_REFRESH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']

let refreshPromise: Promise<Response> | null = null
let onAuthFailure: (() => void) | null = null

export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler
}

async function baseFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })

  if (response.status === 401 && !SKIP_REFRESH_PATHS.some((p) => url.includes(p))) {
    // Only one refresh at a time — queue all concurrent callers behind the same promise
    if (refreshPromise === null) {
      refreshPromise = fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
    }

    let refreshResponse: Response
    try {
      refreshResponse = await refreshPromise
    } finally {
      refreshPromise = null
    }

    if (refreshResponse.ok) {
      // Retry the original request once after successful refresh
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.body && !(options.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...options.headers,
        },
      })
    } else {
      // Refresh failed — clear auth state
      if (onAuthFailure) {
        onAuthFailure()
      }
      throw new Error('Session expired')
    }
  }

  return response
}

export const api = {
  get(url: string, options?: RequestInit): Promise<Response> {
    return baseFetch(url, { ...options, method: 'GET' })
  },

  post(url: string, body?: unknown, options?: RequestInit): Promise<Response> {
    return baseFetch(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  patch(url: string, body?: unknown, options?: RequestInit): Promise<Response> {
    return baseFetch(url, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  delete(url: string, options?: RequestInit): Promise<Response> {
    return baseFetch(url, { ...options, method: 'DELETE' })
  },
}
