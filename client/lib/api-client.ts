import { getApiUrl, getStoredAuthToken } from "@/lib/query-client";
import { logger } from "@/lib/logger";

export class ApiClientError extends Error {
  status: number;
  errorCode?: string;
  responseBody?: unknown;

  constructor(status: number, message: string, errorCode?: string, responseBody?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errorCode = errorCode;
    this.responseBody = responseBody;
  }
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuth?: boolean;
  timeout?: number;
  credentials?: RequestCredentials;
}

async function buildHeaders(
  options?: ApiRequestOptions,
  isJson?: boolean,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (isJson) {
    headers["Content-Type"] = "application/json";
  }

  if (!options?.skipAuth) {
    const token = await getStoredAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  return headers;
}

function buildUrl(path: string): string {
  const baseUrl = getApiUrl();
  return new URL(path, baseUrl).toString();
}

async function parseErrorResponse(response: Response): Promise<ApiClientError> {
  let message = `Request failed with status ${response.status}`;
  let errorCode: string | undefined;
  let responseBody: unknown;

  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await response.json();
      responseBody = body;
      if (body && typeof body === "object") {
        if ("error" in body) message = body.error;
        if ("errorCode" in body) errorCode = body.errorCode;
        if ("data" in body && body.data?.error) message = body.data.error;
      }
    } else {
      const text = await response.text();
      if (text) message = text;
    }
  } catch {
    logger.warn("[ApiClient] Could not parse error response body");
  }

  return new ApiClientError(response.status, message, errorCode, responseBody);
}

function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === "object" && "success" in body) {
    const typed = body as { success: boolean; data?: unknown; error?: string; errorCode?: string };
    if (!typed.success) {
      throw new ApiClientError(
        400,
        typed.error || "Request failed",
        typed.errorCode,
        body,
      );
    }
    return typed.data as T;
  }
  return body as T;
}

function createTimeoutSignal(
  timeoutMs: number,
  existingSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort();
      clearTimeout(timeoutId);
    } else {
      existingSignal.addEventListener("abort", () => {
        controller.abort();
        clearTimeout(timeoutId);
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

async function request<T>(
  method: string,
  path: string,
  data?: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const url = buildUrl(path);
  const hasBody = data !== undefined && data !== null;
  const headers = await buildHeaders(options, hasBody);
  const credentials = options?.credentials ?? "include";

  let signal = options?.signal;
  let timeoutCleanup: (() => void) | undefined;

  if (options?.timeout) {
    const timeout = createTimeoutSignal(options.timeout, signal);
    signal = timeout.signal;
    timeoutCleanup = timeout.cleanup;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(data) : undefined,
      credentials,
      signal,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return undefined as T;
    }

    const body = await response.json();
    return unwrapEnvelope<T>(body);
  } finally {
    timeoutCleanup?.();
  }
}

async function raw(
  method: string,
  path: string,
  init?: {
    body?: BodyInit;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    skipAuth?: boolean;
    credentials?: RequestCredentials;
  },
): Promise<Response> {
  const url = buildUrl(path);
  const headers: Record<string, string> = {};

  if (!init?.skipAuth) {
    const token = await getStoredAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  if (init?.headers) {
    Object.assign(headers, init.headers);
  }

  return fetch(url, {
    method,
    headers,
    body: init?.body,
    credentials: init?.credentials ?? "include",
    signal: init?.signal,
  });
}

export const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },

  post<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>("POST", path, data, options);
  },

  put<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>("PUT", path, data, options);
  },

  patch<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>("PATCH", path, data, options);
  },

  delete<T>(path: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>("DELETE", path, data, options);
  },

  async postFormData<T>(
    path: string,
    formData: FormData,
    options?: ApiRequestOptions,
  ): Promise<T> {
    const url = buildUrl(path);
    const headers: Record<string, string> = {};

    if (!options?.skipAuth) {
      const token = await getStoredAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      credentials: options?.credentials ?? "include",
      signal: options?.signal,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const body = await response.json();
    return unwrapEnvelope<T>(body);
  },

  raw,
};
