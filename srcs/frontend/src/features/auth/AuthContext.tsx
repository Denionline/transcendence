import { type ReactNode, createContext, useEffect, useState } from "react";
import type { User, Credentials, RegisterData } from "./types";
import {
	loginRequest,
	registerRequest,
	logoutRequest,
	fetchMe,
	updateProfileRequest,
	updatePasswordRequest,
} from "./api";

interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	login: (credentials: Credentials) => Promise<User>;
	register: (data: RegisterData) => Promise<User>;
	logout: () => Promise<void>;
	updateProfile: (updates: {
		username?: string;
		email?: string;
		avatarUrl?: string | null;
	}) => Promise<User>;
	updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	useEffect(() => {
		let cancelled = false;

		async function checkSession() {
			try {
				const me = await fetchMe();
				if (!cancelled) setUser(me);
			} catch {
				if (!cancelled) setUser(null); // no session, that's fine
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}

		checkSession();

		return () => {
			cancelled = true;
		};
	}, []);

	async function login(credentials: Credentials) {
		setIsLoading(true);
		try {
			const user = await loginRequest(credentials);
			setUser(user);
			return user;
		} finally {
			setIsLoading(false);
		}
	}

	async function register(data: RegisterData) {
		setIsLoading(true);
		try {
			const user = await registerRequest(data);
			setUser(user);
			console.log("Registered as:", user);
			return user;
		} finally {
			setIsLoading(false);
		}
	}

	async function logout() {
		setIsLoading(true);
		try {
			await logoutRequest();
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	}

	async function updateProfile(updates: {
		username?: string;
		email?: string;
		avatarUrl?: string | null;
	}) {
		if (!user) throw new Error("Not authenticated");
		const updated = await updateProfileRequest(user.id, updates);
		setUser(updated);
		return updated;
	}

	async function updatePassword(currentPassword: string, newPassword: string) {
		if (!user) throw new Error("Not authenticated");
		await updatePasswordRequest(user.id, currentPassword, newPassword);
	}

	return (
		<AuthContext.Provider
			value={{ user, isLoading, login, register, logout, updateProfile, updatePassword }}
		>
			{children}
		</AuthContext.Provider>
	);
}
