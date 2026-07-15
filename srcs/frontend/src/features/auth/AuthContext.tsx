import { type ReactNode, createContext, useEffect, useState } from "react";
import type { User, Credentials, RegisterData } from "./types";
import { loginRequest, registerRequest, logoutRequest, fetchMe } from "./api";

interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	login: (credentials: Credentials) => Promise<User>;
	register: (data: RegisterData) => Promise<void>;
	logout: () => Promise<void>;
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
			console.log("Logged in as:", user);
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
		} finally {
			setIsLoading(false);
		}
	}

	async function logout() {
		setIsLoading(true);
		try {
			await logoutRequest();
			setUser(null);
			console.log("Logged out successfully");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	);
}
