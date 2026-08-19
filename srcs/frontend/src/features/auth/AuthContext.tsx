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
import { connectSocket, disconnectSocket } from "../../lib/socket";
import { onSessionExpired } from "./sessionEvents";

interface AuthContextValue {
	user: User | null;
	isLoading: boolean;
	// Set once the access token expired *and* the silent refresh behind it
	// also failed (see apiClient.ts / notifySessionExpired) — the login page
	// reads this to explain why the user landed back there unprompted,
	// instead of that just looking like a random logout.
	sessionExpired: boolean;
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
	const [sessionExpired, setSessionExpired] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function checkSession() {
			try {
				const me = await fetchMe();
				if (!cancelled) {
					setUser(me);
					if (me) connectSocket();
				}
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

	// The one and only place a session ends without the user asking for it —
	// every apiRequest call across the app shares this, so it fires no matter
	// which page (or background poll) happened to be the one that noticed.
	useEffect(
		() =>
			onSessionExpired(() => {
				setUser(null);
				disconnectSocket();
				setSessionExpired(true);
			}),
		[],
	);

	async function login(credentials: Credentials) {
		setIsLoading(true);
		try {
			const user = await loginRequest(credentials);
			setUser(user);
			setSessionExpired(false);
			connectSocket();
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
			setSessionExpired(false);
			connectSocket();
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
			disconnectSocket();
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
			value={{
				user,
				isLoading,
				sessionExpired,
				login,
				register,
				logout,
				updateProfile,
				updatePassword,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
