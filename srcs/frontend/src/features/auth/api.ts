import { http, HttpResponse } from "msw";

const users = {
	artist: { id: "1", email: "artist@email.com", username: "artist", role: "artist" },
	hirer: { id: "2", email: "hirer@email.com", username: "hirer", role: "hirer" },
	admin: { id: "3", email: "admin@email.com", username: "admin", role: "admin" },
};

export function register() {

}

export function login() {
	http.get("/api/login", () => {
		return HttpResponse.json(users.artist);
	});
}

export function fetchMe() {
	http.get("/api/me", () => {
		return HttpResponse.json(users.artist);
	})
}

export function logout() {

f}