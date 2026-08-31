import {
	BriefcaseIcon,
	HeartHandshakeIcon,
	MessageCircleIcon,
	ThumbsUpIcon,
	UserPlusIcon,
	UserCheckIcon,
} from "lucide-react";
import type { TFunction } from "i18next";
import type { NotificationDto, NotificationType } from "./types";

interface NotificationMeta {
	icon: typeof BriefcaseIcon;
	iconClass: string;

	message: (t: TFunction, notification: NotificationDto, isHirer: boolean) => string;
	href: (notification: NotificationDto) => string;
	respondsInline?: boolean;
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
	new_match: {
		icon: HeartHandshakeIcon,
		iconClass: "text-primary",
		message: (t, n) =>
			t("notifications.matchedWith", {
				name: n.actor?.displayName ?? t("notifications.someone"),
			}),
		href: (n) => (n.matchId ? `/messages?matchId=${n.matchId}` : "/messages"),
	},
	new_message: {
		icon: MessageCircleIcon,
		iconClass: "text-secondary",
		message: (t, n) => {
			const name = n.actor?.displayName ?? t("notifications.someone");
			return n.preview
				? t("notifications.messagePreview", { name, preview: n.preview })
				: t("notifications.sentMessage", { name });
		},
		href: () => "/messages",
	},
	gig_closed: {
		icon: BriefcaseIcon,
		iconClass: "text-neutral",
		message: (t, n) =>
			t("notifications.gigClosed", { title: n.gigTitle ?? t("notifications.aGig") }),
		href: (n) => (n.gigId ? `/opportunities/mine/${n.gigId}` : "/opportunities/mine"),
	},
	swipe_liked: {
		icon: ThumbsUpIcon,
		iconClass: "text-accent",
		message: (t, n, isHirer) => {
			const name = n.actor?.displayName ?? t("notifications.someone");
			return isHirer
				? t("notifications.interestedInGig", {
						name,
						title: n.gigTitle || t("notifications.yourGig"),
					})
				: t("notifications.interestedInYou", { name });
		},
		href: () => "/matches",
	},
	new_invite: {
		icon: UserPlusIcon,
		iconClass: "text-primary",
		message: (t, n) =>
			t("notifications.sentFriendRequest", {
				name: n.actor?.displayName ?? t("notifications.someone"),
			}),
		href: () => "/friends",
		respondsInline: true,
	},
	invite_accepted: {
		icon: UserCheckIcon,
		iconClass: "text-success",
		message: (t, n) =>
			t("notifications.acceptedFriendRequest", {
				name: n.actor?.displayName ?? t("notifications.someone"),
			}),
		href: () => "/friends",
	},
};
