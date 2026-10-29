import type { ApiError } from '../types/project';

export class ApiRequestError extends Error {
    readonly status: number;
    readonly code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
    }
}

export async function apiRequest<T>(
    path: string,
    init: RequestInit = {},
): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');

    if (init.body !== undefined) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`/api/v1${path}`, {
        ...init,
        credentials: 'include',
        headers,
    });

    if (!response.ok) {
        let body: ApiError | undefined;

        try {
            body = (await response.json()) as ApiError;
        } catch {
            // Use the status-based message if the server response is not JSON.
        }

        throw new ApiRequestError(
            body?.error?.message ?? `Request failed (${response.status})`,
            response.status,
            body?.error?.code,
        );
    }

    return (await response.json()) as T;
}

export async function getData<T>(path: string): Promise<T> {
    const body = await apiRequest<{ data: T }>(path);
    return body.data;
}
