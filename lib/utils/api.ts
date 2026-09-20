export interface ApiErrorShape {
  status: number;
  message: string;
  details?: unknown;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;

  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<TResponse, TBody = unknown>(
  url: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const { method = 'GET', body, headers, signal } = options;

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  let parsed: unknown;

  if (response.status !== 204) {
    try {
      parsed = isJson ? await response.json() : await response.text();
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : response.statusText || 'Request failed';

    throw new ApiError(message, response.status, parsed);
  }

  if (response.status === 204) {
    return undefined as unknown as TResponse;
  }

  return parsed as TResponse;
}

export const api = {
  get<TResponse>(url: string, signal?: AbortSignal) {
    return request<TResponse>(url, { method: 'GET', signal });
  },

  post<TResponse, TBody = unknown>(url: string, body: TBody) {
    return request<TResponse, TBody>(url, { method: 'POST', body });
  },

  patch<TResponse, TBody = unknown>(url: string, body: TBody) {
    return request<TResponse, TBody>(url, { method: 'PATCH', body });
  },

  put<TResponse, TBody = unknown>(url: string, body: TBody) {
    return request<TResponse, TBody>(url, { method: 'PUT', body });
  },

  delete<TResponse>(url: string) {
    return request<TResponse>(url, { method: 'DELETE' });
  },
};


