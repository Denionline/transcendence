import { delay } from "../../lib/delay";
import type { NotificationDto } from "./types";

function minutesAgo(minutes: number): string {
	return new Date(Date.now() - minutes * 60_000).toISOString();
}

// Mock, in-memory notification store. The backend model + endpoints (issue #30)
// aren't merged yet — this mirrors the shape a real GET /api/notifications should
// return, so swapping these three functions for apiRequest() calls later is the
// only change needed; no component depends on this being mocked.
let store: NotificationDto[] = [
	{
		id: "n1",
		type: "new_message",
		isRead: false,
		createdAt: minutesAgo(6),
		actor: {
			id: "u1",
			displayName: "Aria Souza",
			avatarUrl: "https://i.pravatar.cc/300?u=aria.souza%40artmate.dev",
		},
		matchId: "m1",
		preview: "Hey! Are you still free for the Friday set?",
	},
	{
		id: "n2",
		type: "new_match",
		isRead: false,
		createdAt: minutesAgo(50),
		actor: {
			id: "u2",
			displayName: "Tomás Ferreira",
			avatarUrl: "https://i.pravatar.cc/300?u=leo.ferreira%40artmate.dev",
		},
		matchId: "m2",
	},
	{
		id: "n3",
		type: "swipe_liked",
		isRead: false,
		createdAt: minutesAgo(190),
		actor: {
			id: "u3",
			displayName: "Maya Tanaka",
			avatarUrl: "https://i.pravatar.cc/300?u=maya.tanaka%40artmate.dev",
		},
	},
	{
		id: "n4",
		type: "new_message",
		isRead: true,
		createdAt: minutesAgo(600),
		actor: {
			id: "u4",
			displayName: "Noah Costa",
			avatarUrl: "https://i.pravatar.cc/300?u=noah.costa%40artmate.dev",
		},
		matchId: "m3",
		preview: "Sounds great, see you there!",
	},
	{
		id: "n5",
		type: "gig_closed",
		isRead: true,
		createdAt: minutesAgo(1500),
		gigId: "g1",
		gigTitle: "Weekend acoustic set — Porto rooftop bar",
	},
	{
		id: "n6",
		type: "new_match",
		isRead: true,
		createdAt: minutesAgo(4000),
		actor: {
			id: "u5",
			displayName: "Sofia Almeida",
			avatarUrl: "https://i.pravatar.cc/300?u=sofia.almeida%40artmate.dev",
		},
		matchId: "m4",
	},
];

function byCreatedAtDesc(a: NotificationDto, b: NotificationDto): number {
	return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export async function listNotifications(): Promise<NotificationDto[]> {
	return delay([...store].sort(byCreatedAtDesc), 400);
}

export async function markNotificationRead(id: string): Promise<void> {
	store = store.map((n) => (n.id === id ? { ...n, isRead: true } : n));
	await delay(undefined, 150);
}

export async function markAllNotificationsRead(): Promise<void> {
	store = store.map((n) => (n.isRead ? n : { ...n, isRead: true }));
	await delay(undefined, 150);
}
