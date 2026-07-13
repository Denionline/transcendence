import { type ReactNode, createContext, useState } from "react";
import type { User, Credentials } from "./types";
import { loginRequest } from "./api";

interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	login: (credentials: Credentials) => Promise<void>;
	// logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	async function login(credentials: Credentials) {
		const user = await loginRequest(credentials);
		console.log(user);
		// setUser(cre)
	}

	return <AuthContext.Provider value={{ user, isLoading, login }}>{children}</AuthContext.Provider>;
}
