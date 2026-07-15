import { type ReactNode, createContext, useContext, useState } from "react";
import type { User, Credentials, RegisterData } from "./types";
import { loginRequest, registerRequest, logoutRequest } from "./api";

interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	login: (credentials: Credentials) => Promise<void>;
	register: (data: RegisterData) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	async function login(credentials: Credentials) {
		setIsLoading(true);
		try {
			const user = await loginRequest(credentials);
			setUser(user);
			console.log("Logged in as:", user);
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

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
