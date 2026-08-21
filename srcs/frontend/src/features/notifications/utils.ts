import {
	BriefcaseIcon,
	HeartHandshakeIcon,
	MessageCircleIcon,
	ThumbsUpIcon,
	UserPlusIcon,
	UserCheckIcon,
} from "lucide-react";
import type { NotificationDto, NotificationType } from "./types";

interface NotificationMeta {
	icon: typeof BriefcaseIcon;
	iconClass: string;
	message: (notification: NotificationDto, isHirer: boolean) => string;
	href: (notification: NotificationDto) => string;
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
	new_match: {
		icon: HeartHandshakeIcon,
		iconClass: "text-primary",
		message: (n) => `You matched with ${n.actor?.displayName ?? "someone"}!`,
		href: (n) => (n.matchId ? `/messages?matchId=${n.matchId}` : "/messages"),
	},
	new_message: {
		icon: MessageCircleIcon,
		iconClass: "text-secondary",
		message: (n) =>
			n.preview
				? `${n.actor?.displayName ?? "Someone"}: ${n.preview}`
				: `${n.actor?.displayName ?? "Someone"} sent you a message`,
		href: () => "/messages",
	},
	gig_closed: {
		icon: BriefcaseIcon,
		iconClass: "text-neutral",
		message: (n) => `"${n.gigTitle ?? "A gig"}" was closed`,
		href: (n) => (n.gigId ? `/opportunities/mine/${n.gigId}` : "/opportunities/mine"),
	},
	swipe_liked: {
		icon: ThumbsUpIcon,
		iconClass: "text-accent",
		message: (n, isHirer) =>
			isHirer
				? `${n.actor?.displayName ?? "Someone"} is interested in ${n.gigTitle || "your gig"}`
				: `${n.actor?.displayName ?? "Someone"} is interested in you`,
		href: () => "/matches",
	},
	// TODO: href just stays on /notifications for now — there's no friends
	// page yet. Point these at it once it exists.
	new_invite: {
		icon: UserPlusIcon,
		iconClass: "text-primary",
		message: (n) => `${n.actor?.displayName ?? "Someone"} sent you a friend request`,
		href: () => "/notifications",
	},
	invite_accepted: {
		icon: UserCheckIcon,
		iconClass: "text-success",
		message: (n) => `${n.actor?.displayName ?? "Someone"} accepted your friend request`,
		href: () => "/notifications",
	},
};
