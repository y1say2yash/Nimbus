import { useEffect, useState, type ReactNode } from 'react';

import { getCurrentUser, logout as logoutApi } from './auth-api';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-types';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load authenticated user:', error);
            setUser(null);
        }
    };

    useEffect(() => {
        let cancelled = false;

        async function initializeAuth() {
            try {
                const currentUser = await getCurrentUser();

                if (!cancelled) {
                    setUser(currentUser);
                }
            } catch (error) {
                console.error('Failed to load authenticated user:', error);

                if (!cancelled) {
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void initializeAuth();

        return () => {
            cancelled = true;
        };
    }, []);

    const logout = async () => {
        await logoutApi();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: user !== null,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}