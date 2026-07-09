import { createContext, ReactNode, useState } from "react";
import { Credentials, User } from "./types";

interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	// login: (credentials: Credentials) => Promise<void>;
	// logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	

	return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}
