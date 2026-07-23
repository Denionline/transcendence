export type UserRole = "artist" | "hirer" | "admin";

export interface User {
	id: string;
	email: string;
	username: string;
	role: UserRole;
	avatarUrl: string | null;
	createdAt: string;
}

export interface Credentials {
	email: string;
	password: string;
}

export interface RegisterData {
	name: string;
	email: string;
	password: string;
}
