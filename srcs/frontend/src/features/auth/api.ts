import { http, HttpResponse } from "msw";
import type { Credentials } from "./types";

const users = [
	{ id: "1", email: "artist@email.com", username: "artist", role: "artist" },
	{ id: "2", email: "hirer@email.com", username: "hirer", role: "hirer" },
	{ id: "3", email: "admin@email.com", username: "admin", role: "admin" },
];

export function registerRequest() {}

export function loginRequest(credentials: Credentials) {
	http.get("/api/login", () => {
		return HttpResponse.json(users.find((user) => user.email == credentials.email));
	});
}

export function fetchMe() {
	http.get("/api/me", () => {
		// return HttpResponse.json(users.artist);
	});
}

export function logout() {}
