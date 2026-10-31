import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, setUnauthorizedHandler, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => (tokenStorage.get() ? tokenStorage.getUser() : null));

    const login = useCallback((token, userData) => {
        tokenStorage.set(token, userData);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        tokenStorage.clear();
        setUser(null);
    }, []);

    const signOut = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch {
            // The token is discarded locally either way.
        }
        logout();
    }, [logout]);

    useEffect(() => {
        setUnauthorizedHandler(logout);
        return () => setUnauthorizedHandler(() => {});
    }, [logout]);

    const value = useMemo(
        () => ({ user, isAuthenticated: Boolean(user), login, logout: signOut }),
        [user, login, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
