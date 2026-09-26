import type { AuthResponse } from './auth-types';

export async function getCurrentUser(): Promise<AuthResponse['data']['user'] | null> {
    const response = await fetch('/api/v1/auth/me', {
        credentials: 'include',
    });

    if (response.status === 401) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Failed to fetch authenticated user.');
    }

    const data = (await response.json()) as AuthResponse;

    return data.data.user;
}

export async function logout(): Promise<void> {
    const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Logout failed.');
    }
}