import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';
import { userApi, UserProfile } from '../api/user';

interface AuthContextType {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await storage.getItemAsync('access_token');
            if (token) {
                setIsAuthenticated(true);
                await fetchProfile();
            }
        } catch (error) {
            console.error('Check auth error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const profile = await userApi.getProfile();
            setUser(profile);
        } catch (error) {
            console.error('Fetch profile error:', error);
        }
    };

    const login = async (email: string, password: string) => {
        await authApi.login(email, password);
        setIsAuthenticated(true);
        await fetchProfile();
    };

    const register = async (name: string, email: string, password: string) => {
        await authApi.register(name, email, password);
        // After register, auto-login
        await authApi.login(email, password);
        setIsAuthenticated(true);
        await fetchProfile();
    };

    const logout = async () => {
        await authApi.logout();
        setIsAuthenticated(false);
        setUser(null);
    };

    const refreshProfile = async () => {
        await fetchProfile();
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
